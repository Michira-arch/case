-- Migration: Search Rank Estimator RPC
-- Adds an RPC function to query the real-time search rank of a profile, comparing current status with a potential Case+ subscription status.

create or replace function public.get_profile_rank(p_profile_id uuid)
returns jsonb
language plpgsql security definer
stable
as $$
declare
  v_score float;
  v_plus_score float;
  v_rank int;
  v_plus_rank int;
  v_total_discoverable int;
  v_completeness int;
  v_views int;
  v_plan text;
begin
  -- 1. Get the current profile info
  select
    coalesce(s.plan, 'free') as plan,
    -- Calculate completeness score matching schema.sql / completeness.ts
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
    ) as completeness,
    coalesce(
      (
        select count(*)
        from public.analytics_events ae
        where ae.profile_id = p.id
          and ae.event_type = 'profile_view'
      ), 0
    ) as views
  into v_plan, v_completeness, v_views
  from public.profiles p
  left join public.subscriptions s on s.profile_id = p.id
  where p.id = p_profile_id;

  -- 2. Count total discoverable profiles
  select count(*)
  into v_total_discoverable
  from public.profiles
  where is_public = true and discoverable = true;

  -- 3. Calculate scores
  v_score := (case when v_plan = 'plus' then 1.5 else 0.0 end) +
             (v_completeness::float / 100.0 * 1.5) +
             (log(1.0 + v_views::float) * 0.5);

  -- Score if they were on plus
  v_plus_score := 1.5 +
                  (v_completeness::float / 100.0 * 1.5) +
                  (log(1.0 + v_views::float) * 0.5);

  -- 4. Calculate actual rank
  select count(*) + 1
  into v_rank
  from (
    select
      p.id,
      (
        (case when coalesce(s.plan, 'free') = 'plus' then 1.5 else 0.0 end) +
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
        )::float) * 0.5)
      ) as score
    from public.profiles p
    left join public.subscriptions s on s.profile_id = p.id
    where p.is_public = true and p.discoverable = true
  ) all_scores
  where score > v_score;

  -- 5. Calculate rank if they were on plus
  select count(*) + 1
  into v_plus_rank
  from (
    select
      p.id,
      (
        (case when coalesce(s.plan, 'free') = 'plus' then 1.5 else 0.0 end) +
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
        )::float) * 0.5)
      ) as score
    from public.profiles p
    left join public.subscriptions s on s.profile_id = p.id
    where p.is_public = true and p.discoverable = true
  ) all_scores
  where score > v_plus_score;

  return jsonb_build_object(
    'actual_rank', v_rank,
    'plus_rank', v_plus_rank,
    'total_discoverable', v_total_discoverable,
    'completeness', v_completeness,
    'views', v_views
  );
end;
$$;

-- Grant permissions for authenticated and anon users to call this estimation RPC
grant execute on function public.get_profile_rank(uuid) to anon, authenticated;
