-- ============================================================
-- STORED PROCEDURES / RPCs
-- ============================================================

-- RPC: get_public_profile
-- Assembles a complete profile for the public page in one call
create or replace function public.get_public_profile(p_handle text)
returns jsonb
language plpgsql security definer
stable
as $$
declare
  v_profile  public.profiles%rowtype;
  v_sub      public.subscriptions%rowtype;
  v_email    text;
  result     jsonb;
begin
  select * into v_profile
  from public.profiles
  where handle = p_handle
    and is_public = true;

  if not found then
    return null;
  end if;

  select * into v_sub
  from public.subscriptions
  where profile_id = v_profile.id;

  select email into v_email
  from auth.users
  where id = v_profile.owner_id;

  select jsonb_build_object(
    'id',           v_profile.id,
    'handle',       v_profile.handle,
    'persona',      v_profile.persona,
    'display_name', v_profile.display_name,
    'role_line',    v_profile.role_line,
    'tagline',      v_profile.tagline,
    'avatar_url',   v_profile.avatar_url,
    'email',        v_email,
    'showcase_images', v_profile.showcase_images,
    'physical_attributes', v_profile.physical_attributes,
    'socials',      v_profile.socials,
    'category',     v_profile.category,
    'tags',         v_profile.tags,
    'location_area',v_profile.location_area,
    'locale',       v_profile.locale,
    'plan',         coalesce(v_sub.plan, 'free'),
    'plan_expires', v_sub.current_period_end,
    'proof_items',  (
      select jsonb_agg(
        jsonb_build_object(
          'id',         pi.id,
          'pillar',     pi.pillar,
          'title',      pi.title,
          'detail',     pi.detail,
          'when_label', pi.when_label,
          'sort_order', pi.sort_order,
          'source',     pi.source,
          'created_at', pi.created_at,
          'evidence',   (
            select jsonb_agg(
              jsonb_build_object(
                'id',               e.id,
                'type',             e.type,
                'storage_key',      e.storage_key,
                'caption',          e.caption,
                'width',            e.width,
                'height',           e.height,
                'duration_seconds', e.duration_seconds
              ) order by e.created_at
            )
            from public.evidence e
            where e.proof_item_id = pi.id
          )
        ) order by pi.sort_order, pi.created_at
      )
      from public.proof_items pi
      where pi.profile_id = v_profile.id
        and pi.visible = true
    )
  ) into result;

  return result;
end;
$$;

-- RPC: log_event
-- Rate-limited analytics event write
create or replace function public.log_event(
  p_profile_id    uuid,
  p_event_type    text,
  p_proof_item_id uuid default null,
  p_referrer_host text default null,
  p_device_type   text default null,
  p_country       text default null
)
returns void
language plpgsql security definer
as $$
begin
  -- Basic rate limit: max 3 profile_view events per IP per hour
  -- (handled at the API layer — here we just insert)
  insert into public.analytics_events
    (profile_id, event_type, proof_item_id, referrer_host, device_type, country)
  values
    (p_profile_id, p_event_type, p_proof_item_id, p_referrer_host, p_device_type, p_country);
end;
$$;

-- RPC: create_vouch_request
-- Owner creates a vouch link
create or replace function public.create_vouch_request(
  p_profile_id      uuid,
  p_recipient_label text,
  p_message         text default null
)
returns public.vouch_requests
language plpgsql security definer
as $$
declare
  v_profile  public.profiles%rowtype;
  v_sub      public.subscriptions%rowtype;
  v_count    int;
  v_result   public.vouch_requests%rowtype;
begin
  -- Verify caller owns this profile
  select * into v_profile
  from public.profiles
  where id = p_profile_id
    and owner_id = auth.uid();

  if not found then
    raise exception 'Profile not found or unauthorized';
  end if;

  -- Check free-tier vouch request limit (3 open at a time)
  select * into v_sub from public.subscriptions where profile_id = p_profile_id;

  if coalesce(v_sub.plan, 'free') = 'free' then
    select count(*) into v_count
    from public.vouch_requests
    where profile_id = p_profile_id and status = 'pending';

    if v_count >= 3 then
      raise exception 'Free tier allows 3 open vouch requests. Upgrade to Case+ for unlimited.';
    end if;
  end if;

  insert into public.vouch_requests (profile_id, recipient_label, message)
  values (p_profile_id, p_recipient_label, p_message)
  returning * into v_result;

  return v_result;
end;
$$;

-- RPC: submit_vouch
-- Public submission via token (no auth required)
create or replace function public.submit_vouch(
  p_token       text,
  p_quote       text,
  p_voucher_name text,
  p_relationship text,
  p_evidence_keys text[] default '{}'
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_req    public.vouch_requests%rowtype;
  v_item   public.proof_items%rowtype;
  v_key    text;
begin
  -- Find and lock the vouch request
  select * into v_req
  from public.vouch_requests
  where token = p_token
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Vouch link is invalid, already used, or expired.';
  end if;

  -- Create the vouched proof item (hidden by default — owner approves)
  insert into public.proof_items
    (profile_id, pillar, title, detail, source, visible)
  values (
    v_req.profile_id,
    'vouched',
    '"' || left(p_quote, 120) || '"',
    'From ' || p_voucher_name || ' (' || p_relationship || ')',
    'vouch_request',
    false   -- owner must approve before it goes public
  )
  returning * into v_item;

  -- Attach any uploaded evidence keys
  foreach v_key in array p_evidence_keys loop
    insert into public.evidence (proof_item_id, type, storage_key)
    values (v_item.id, 'img', v_key);
  end loop;

  -- Mark request completed
  update public.vouch_requests
  set status = 'completed',
      completed_at = now(),
      resulting_proof_item_id = v_item.id
  where id = v_req.id;

  return jsonb_build_object(
    'success', true,
    'proof_item_id', v_item.id
  );
end;
$$;

-- RPC: get_analytics_summary
-- Owner-facing analytics (§6.6)
create or replace function public.get_analytics_summary(
  p_profile_id uuid,
  p_days       int default 7
)
returns jsonb
language plpgsql security definer
stable
as $$
declare
  v_profile public.profiles%rowtype;
  v_sub     public.subscriptions%rowtype;
begin
  -- Verify ownership
  select * into v_profile
  from public.profiles
  where id = p_profile_id and owner_id = auth.uid();

  if not found then
    raise exception 'Unauthorized';
  end if;

  select * into v_sub from public.subscriptions where profile_id = p_profile_id;

  return jsonb_build_object(
    'total_views',    (select count(*) from public.analytics_events where profile_id = p_profile_id and event_type = 'profile_view'),
    'views_7d',       (select count(*) from public.analytics_events where profile_id = p_profile_id and event_type = 'profile_view' and created_at > now() - interval '7 days'),
    'evidence_taps',  (select count(*) from public.analytics_events where profile_id = p_profile_id and event_type = 'evidence_tap'),
    'social_clicks',  (select count(*) from public.analytics_events where profile_id = p_profile_id and event_type = 'social_click'),
    'sparkline',      (
      select jsonb_agg(jsonb_build_object('date', d::date, 'views', coalesce(c, 0)) order by d)
      from generate_series(
        now() - (p_days - 1) * interval '1 day',
        now(),
        interval '1 day'
      ) d
      left join (
        select date_trunc('day', created_at) as day, count(*) as c
        from public.analytics_events
        where profile_id = p_profile_id
          and event_type = 'profile_view'
          and created_at > now() - p_days * interval '1 day'
        group by 1
      ) ev on ev.day = d::date
    ),
    -- Plus-only data
    'referrers',      case when coalesce(v_sub.plan,'free') = 'plus' then (
      select jsonb_agg(jsonb_build_object('host', referrer_host, 'count', c) order by c desc)
      from (
        select referrer_host, count(*) as c
        from public.analytics_events
        where profile_id = p_profile_id and event_type = 'profile_view'
        group by referrer_host
        limit 10
      ) r
    ) else null end,
    'device_split',   case when coalesce(v_sub.plan,'free') = 'plus' then (
      select jsonb_agg(jsonb_build_object('device', device_type, 'count', c))
      from (
        select device_type, count(*) as c
        from public.analytics_events
        where profile_id = p_profile_id and event_type = 'profile_view'
        group by device_type
      ) d
    ) else null end
  );
end;
$$;

-- RPC: apply_payment (called by webhook handler via service role)
-- Upserts subscription after verified Paystack payment
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

-- RPC: downgrade_expired_subscriptions
-- Should be called daily (via pg_cron or a scheduled Worker)
create or replace function public.downgrade_expired_subscriptions()
returns int
language plpgsql security definer
as $$
declare
  v_count int;
begin
  with downgraded as (
    update public.subscriptions
    set plan = 'free',
        current_period_end = null,
        updated_at = now()
    where plan = 'plus'
      and current_period_end < now()
    returning profile_id
  )
  select count(*) into v_count from downgraded;

  -- Soft-hide excess proof items for newly downgraded profiles
  -- Free limit: 4 items per pillar
  update public.proof_items pi
  set visible = false
  where pi.id in (
    select pi2.id
    from public.proof_items pi2
    join public.subscriptions s on s.profile_id = pi2.profile_id
    where s.plan = 'free'
      and pi2.visible = true
      and pi2.id not in (
        select id from public.proof_items pi3
        where pi3.profile_id = pi2.profile_id
          and pi3.pillar = pi2.pillar
        order by sort_order, created_at
        limit 4
      )
  );

  return v_count;
end;
$$;

-- RPC: search_profiles (§6.14 — Case Search)
create or replace function public.search_profiles(
  p_query       text default '',
  p_category    text default null,
  p_location    text default null,
  p_limit       int  default 20,
  p_offset      int  default 0
)
returns jsonb
language plpgsql security definer
stable
as $$
begin
  return (
    select jsonb_agg(row_to_json(r))
    from (
      select
        p.id,
        p.handle,
        p.display_name,
        p.role_line,
        p.avatar_url,
        p.category,
        p.tags,
        p.location_area,
        coalesce(s.plan, 'free') as plan,
        -- Calculate completeness score matching app logic
        (
          (case when p.display_name is not null and p.display_name != '' and p.role_line is not null and p.role_line != '' and p.tagline is not null and p.tagline != '' then 20 else 0 end) +
          (case when p.avatar_url is not null and p.avatar_url != '' then 5 else 0 end) +
          coalesce(
            (
              select least(75, count(*) * 10)
              from public.proof_items pi
              where pi.profile_id = p.id
                and pi.visible = true
                and exists (
                  select 1 from public.evidence e where e.proof_item_id = pi.id
                )
            ), 0
          )
        ) as completeness_score,
        -- Total views count (engagement)
        coalesce(
          (
            select count(*)
            from public.analytics_events ae
            where ae.profile_id = p.id
              and ae.event_type = 'profile_view'
          ), 0
        ) as view_count,
        -- Keyword relevance
        ts_rank(
          to_tsvector('english',
            coalesce(p.display_name,'') || ' ' ||
            coalesce(p.category,'') || ' ' ||
            coalesce(p.role_line,'') || ' ' ||
            coalesce(p.location_area,'')
          ),
          plainto_tsquery('english', coalesce(nullif(p_query,''), 'the'))
        ) as relevance
      from public.profiles p
      left join public.subscriptions s on s.profile_id = p.id
      where p.is_public = true
        and p.discoverable = true
        and (p_category is null or p.category ilike '%' || p_category || '%')
        and (p_location  is null or p.location_area ilike '%' || p_location || '%')
        and (
          p_query = '' or
          p.handle ilike '%' || p_query || '%' or
          p.display_name ilike '%' || p_query || '%' or
          p.role_line ilike '%' || p_query || '%' or
          to_tsvector('english',
            coalesce(p.display_name,'') || ' ' ||
            coalesce(p.category,'') || ' ' ||
            coalesce(p.role_line,'')
          ) @@ plainto_tsquery('english', p_query)
        )
      order by
        -- Sorting Rank
        (case when p.handle ilike p_query then 10.0 when p.handle ilike '%' || p_query || '%' then 3.0 else 0.0 end) +
        (case when coalesce(s.plan,'free') = 'plus' then 1.5 else 0.0 end) +
        ts_rank(
          to_tsvector('english',
            coalesce(p.display_name,'') || ' ' ||
            coalesce(p.category,'') || ' ' ||
            coalesce(p.role_line,'') || ' ' ||
            coalesce(p.location_area,'')
          ),
          plainto_tsquery('english', coalesce(nullif(p_query,''), 'the'))
        ) * 2.0 +
        (((
          (case when p.display_name is not null and p.display_name != '' and p.role_line is not null and p.role_line != '' and p.tagline is not null and p.tagline != '' then 20 else 0 end) +
          (case when p.avatar_url is not null and p.avatar_url != '' then 5 else 0 end) +
          coalesce(
            (
              select least(75, count(*) * 10)
              from public.proof_items pi
              where pi.profile_id = p.id
                and pi.visible = true
                and exists (
                  select 1 from public.evidence e where e.proof_item_id = pi.id
                )
            ), 0
          )
        )::float / 100.0) * 1.5) +
        (log(1.0 + coalesce(
          (
            select count(*)
            from public.analytics_events ae
            where ae.profile_id = p.id
              and ae.event_type = 'profile_view'
          ), 0
        )::float) * 0.5) desc
      limit p_limit
      offset p_offset
    ) r
  );
end;
$$;
