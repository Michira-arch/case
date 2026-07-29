-- Add agency logo to orgs
alter table nanny_orgs add column if not exists logo_url text;

-- Fix complete assignment RPC to accept manual hours
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
  v_hours       numeric;
  v_base        numeric;
  v_surcharge   numeric;
  v_holiday_pay numeric;
  v_total       numeric;
  v_emergency_pct numeric;
  v_holiday_rate  numeric;
begin
  -- Relaxed the condition to allow manual completion of already completed/confirmed assignments
  select a.*, b.scheduled_start, b.scheduled_end, b.is_emergency
  into v_assignment
  from nanny_assignments a
  join nanny_bookings b on b.id = a.booking_id
  where a.id = p_assignment_id;

  if not found then
    raise exception 'Assignment not found';
  end if;

  select * into v_org from nanny_orgs where id = v_assignment.org_id;
  select * into v_booking from nanny_bookings where id = v_assignment.booking_id;

  -- Update time log only if it exists
  update nanny_time_logs
  set clocked_out_at = coalesce(p_clocked_out_at, now())
  where assignment_id = p_assignment_id
    and clocked_out_at is null;

  if p_hours_worked is not null then
    v_hours := p_hours_worked;
  else
    select coalesce(sum(duration_minutes), 0) / 60.0
    into v_hours
    from nanny_time_logs
    where assignment_id = p_assignment_id
      and duration_minutes is not null;
  end if;

  -- Get policy values
  v_emergency_pct := coalesce((v_org.policy->>'emergency_surcharge_pct')::numeric, 20);
  v_holiday_rate := coalesce((v_org.policy->>'holiday_pay_rate')::numeric, 0.1207);

  -- Compute financials
  v_base := v_hours * coalesce(v_assignment.hourly_rate, 0);
  v_surcharge := case when v_assignment.is_emergency then v_base * (v_emergency_pct / 100) else 0 end;
  v_holiday_pay := (v_base + v_surcharge) * v_holiday_rate;
  v_total := v_base + v_surcharge + v_holiday_pay;

  -- Update assignment
  update nanny_assignments
  set assignment_state  = 'completed',
      completed_at      = now(),
      hours_worked      = v_hours,
      base_amount       = v_base,
      surcharge_amount  = v_surcharge,
      holiday_pay       = v_holiday_pay,
      total_amount      = v_total,
      updated_at        = now()
  where id = p_assignment_id;

  -- Update booking state
  update nanny_bookings
  set booking_state = 'completed',
      actual_end    = coalesce(p_clocked_out_at, now()),
      updated_at    = now()
  where id = v_assignment.booking_id;

  -- Auto-create invoice if it doesn't already exist for this assignment
  -- We don't check auto_invoice policy for manual completions with hours overide
  if not exists (select 1 from nanny_invoices where assignment_id = p_assignment_id) then
    perform nanny_create_post_assignment_invoice(p_assignment_id);
  end if;

  return jsonb_build_object(
    'hours_worked', v_hours,
    'base_amount', v_base,
    'surcharge_amount', v_surcharge,
    'holiday_pay', v_holiday_pay,
    'total_amount', v_total
  );
end;
$$;
