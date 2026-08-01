-- Harden SECURITY DEFINER RPCs.
--
-- 1. Revoke EXECUTE from anon/PUBLIC on every function that mutates billing or
--    assignment state. Postgres grants EXECUTE to PUBLIC by default, so these
--    were callable by anyone with the public anon key.
-- 2. Add real authorization checks inside the functions that legitimately need
--    an authenticated caller.
-- 3. Restore total_amount / completed_at writes in nanny_complete_assignment
--    (dropped in the last rewrite, so dashboards read NULL for completed jobs).

-- ── 1. Permission lockdown ────────────────────────────────────────────────────
-- `authed_roles` = functions that must still be callable by a logged-in user.
-- `internal_roles` = functions that should only run server-side (cron / trigger).
do $$
declare
  r record;
begin
  -- Callable by authenticated users and the service role
  for r in (
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('apply_payment', 'nanny_complete_assignment', 'nanny_claim_shadow_worker')
  ) loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
  end loop;

  -- Internal-only: cron / seeding / invoice generation via the service role
  for r in (
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('nanny_seed_org_defaults', 'nanny_create_post_assignment_invoice', 'downgrade_expired_subscriptions')
  ) loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- ── 2. apply_payment: only the profile owner (or service role) may upgrade ──
create or replace function public.apply_payment(
  p_profile_id         uuid,
  p_paystack_reference text,
  p_amount_kes         numeric,
  p_plan_period        text,
  p_channel            text,
  p_paystack_data      jsonb default '{}'
)
returns void
language plpgsql security definer
as $$
declare
  v_payment  public.payments%rowtype;
  v_months   int;
begin
  -- Authorization: the webhook (service role) or the profile's own owner may call this
  if auth.role() <> 'service_role' then
    if auth.uid() is null or not exists (
      select 1 from public.profiles p
      where p.id = p_profile_id and p.owner_id = auth.uid()
    ) then
      raise exception 'Not authorized';
    end if;
  end if;

  -- Insert payment record
  insert into public.payments
    (profile_id, paystack_reference, amount_kes, plan_period, channel, status, paystack_data)
  values
    (p_profile_id, p_paystack_reference, p_amount_kes, p_plan_period, p_channel, 'success', p_paystack_data)
  on conflict (paystack_reference) do update
    set status = 'success', paystack_data = excluded.paystack_data
  returning * into v_payment;

  -- Determine months from plan_period
  v_months := case p_plan_period when '6m' then 6 when '12m' then 12 else 6 end;

  -- Upsert subscription: extend from current_period_end if not expired
  insert into public.subscriptions (profile_id, plan, current_period_end, last_payment_id)
  values (
    p_profile_id,
    'plus',
    now() + (v_months || ' months')::interval,
    v_payment.id
  )
  on conflict (profile_id) do update
    set plan = 'plus',
        current_period_end = greatest(now(), subscriptions.current_period_end)
                             + (v_months || ' months')::interval,
        last_payment_id = excluded.last_payment_id,
        updated_at = now();
end;
$$;

-- ── 3. nanny_claim_shadow_worker: only the claimed profile's owner may claim ──
create or replace function nanny_claim_shadow_worker(
  p_claim_token text,
  p_profile_id  uuid
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_worker nanny_workers;
begin
  -- Authorization: the caller must own the profile they're claiming into
  if auth.role() <> 'service_role' then
    if auth.uid() is null or not exists (
      select 1 from public.profiles p
      where p.id = p_profile_id and p.owner_id = auth.uid()
    ) then
      raise exception 'Not authorized';
    end if;
  end if;

  select * into v_worker from nanny_workers
  where claim_token = p_claim_token
    and claim_token_expires > now();

  if not found then
    raise exception 'Invalid or expired claim token';
  end if;

  update nanny_workers
  set profile_id = p_profile_id,
      claim_token = null,
      claim_token_expires = null,
      worker_state = 'applicant',
      updated_at = now()
  where id = v_worker.id;

  return jsonb_build_object('worker_id', v_worker.id, 'org_id', v_worker.org_id);
end;
$$;

-- ── 4. nanny_complete_assignment: require membership + restore financials ────
create or replace function nanny_complete_assignment(
  p_assignment_id   uuid,
  p_clocked_out_at  timestamptz default now(),
  p_hours_worked    numeric default null
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_assignment  nanny_assignments;
  v_booking     nanny_bookings;
  v_org         nanny_orgs;
  v_worker      nanny_workers;
  v_service     nanny_service_types;
  v_total_cost  numeric := 0;
  v_agency_rev  numeric := 0;
  v_worker_pay  numeric := 0;
  v_commission_pct numeric;
  v_unit_rate   numeric;
begin
  -- Authorization: only a member of the booking's org (or service role) may complete
  if auth.role() <> 'service_role' then
    if not exists (
      select 1
      from nanny_assignments a
      join nanny_bookings b on b.id = a.booking_id
      where a.id = p_assignment_id
        and nanny_is_org_member(b.org_id)
    ) then
      raise exception 'Not authorized';
    end if;
  end if;

  -- Get assignment and booking
  select * into v_assignment from nanny_assignments where id = p_assignment_id;
  if not found then raise exception 'Assignment not found'; end if;

  select * into v_booking from nanny_bookings where id = v_assignment.booking_id;
  if v_booking.booking_state != 'in_progress' and v_booking.booking_state != 'scheduled' then
    raise exception 'Booking is not in progress or scheduled. State: %', v_booking.booking_state;
  end if;

  select * into v_org from nanny_orgs where id = v_booking.org_id;
  select * into v_worker from nanny_workers where id = v_assignment.worker_id;
  select * into v_service from nanny_service_types where id = v_booking.service_type_id;

  -- Unit rate: custom booking > quoted rate > service base rate
  if v_booking.custom_pricing_enabled and v_booking.unit_rate is not null then
    v_unit_rate := v_booking.unit_rate;
  elsif v_booking.quoted_rate is not null then
    v_unit_rate := v_booking.quoted_rate;
  elsif v_service.base_rate is not null then
    v_unit_rate := v_service.base_rate;
  else
    v_unit_rate := 0;
  end if;

  -- Total cost by pricing model
  if v_booking.pricing_model = 'hourly' then
    if p_hours_worked is null then raise exception 'Hours worked required for hourly pricing'; end if;
    v_total_cost := v_unit_rate * p_hours_worked;
  else
    v_total_cost := v_unit_rate;
  end if;

  -- Add advanced-settings flat placement fee if present
  if v_booking.custom_pricing_enabled and v_booking.advanced_settings ? 'flat_placement_fee' then
    v_total_cost := v_total_cost + (v_booking.advanced_settings->>'flat_placement_fee')::numeric;
  end if;

  -- Commission percentage: custom booking > worker > org policy > 20% fallback
  if v_booking.custom_pricing_enabled and v_booking.agency_commission_pct is not null then
    v_commission_pct := v_booking.agency_commission_pct;
  elsif v_worker.agency_cut_pct is not null then
    v_commission_pct := v_worker.agency_cut_pct;
  elsif v_org.policy ? 'agency_cut_pct' then
    v_commission_pct := (v_org.policy->>'agency_cut_pct')::numeric;
  else
    v_commission_pct := 20;
  end if;

  v_agency_rev := v_total_cost * (v_commission_pct / 100.0);

  if v_booking.custom_pricing_enabled and v_booking.advanced_settings ? 'flat_placement_fee' then
    v_agency_rev := v_agency_rev + (v_booking.advanced_settings->>'flat_placement_fee')::numeric * (1 - (v_commission_pct/100.0));
  end if;

  v_worker_pay := v_total_cost - v_agency_rev;

  -- Update assignment (restoring the financial snapshot that dashboards read)
  update nanny_assignments
  set assignment_state  = 'completed',
      actual_start      = coalesce(actual_start, now()),
      actual_end        = coalesce(p_clocked_out_at, now()),
      completed_at      = now(),
      hours_worked      = p_hours_worked,
      base_amount       = v_unit_rate,
      total_amount      = v_total_cost,
      agency_revenue    = v_agency_rev,
      worker_payout     = v_worker_pay,
      updated_at        = now()
  where id = p_assignment_id;

  -- Update booking
  update nanny_bookings
  set booking_state = 'completed',
      actual_end    = now()
  where id = v_booking.id;

  -- Create invoice if none exists
  if not exists (select 1 from nanny_invoices where assignment_id = p_assignment_id) then
    insert into nanny_invoices (
      org_id, client_id, assignment_id, subtotal, total, invoice_state, due_at
    ) values (
      v_booking.org_id,
      v_booking.client_id,
      p_assignment_id,
      v_total_cost,
      v_total_cost,
      'draft',
      now() + interval '7 days'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'total_cost', v_total_cost,
    'agency_revenue', v_agency_rev,
    'worker_payout', v_worker_pay
  );
end;
$$;
