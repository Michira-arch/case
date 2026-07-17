-- ============================================================
-- MIGRATION 001: claim_text + contact_visibility + hidden_reason
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Add claim_text to profiles
-- A short personal statement (max ~500 chars) — the "thesis"
-- that all the proof items below are evidence for.
-- ----------------------------------------------------------------
alter table public.profiles
  add column if not exists claim_text text
    constraint claim_text_length check (char_length(claim_text) <= 500);

-- ----------------------------------------------------------------
-- 2. Add contact_visibility to profiles
-- JSONB object controlling which contact fields appear publicly.
-- Structure: { "phone": bool, "email": bool, "whatsapp": bool, "location": bool }
-- Default: all visible (true) — maintaining existing behaviour.
-- ----------------------------------------------------------------
alter table public.profiles
  add column if not exists contact_visibility jsonb not null default '{
    "phone": true,
    "email": true,
    "whatsapp": true,
    "location": true
  }'::jsonb;

-- ----------------------------------------------------------------
-- 3. Add hidden_reason to proof_items
-- Records WHY an item is hidden — 'plan_downgrade', 'owner', etc.
-- Null = hidden by owner choice (default behaviour).
-- ----------------------------------------------------------------
alter table public.proof_items
  add column if not exists hidden_reason text
    constraint hidden_reason_values
    check (hidden_reason is null or hidden_reason in ('plan_downgrade', 'owner'));

-- ----------------------------------------------------------------
-- 4. Update downgrade_expired_subscriptions to set hidden_reason
-- When items are soft-hidden due to plan expiry, mark why.
-- ----------------------------------------------------------------
create or replace function public.downgrade_expired_subscriptions()
returns int
language plpgsql security definer
as $$
declare
  v_count int;
begin
  -- Step 1: downgrade plans that have lapsed
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

  -- Step 2: soft-hide excess proof items for newly-free profiles
  -- Free limit: 4 items per pillar (keep earliest by sort_order, then created_at)
  update public.proof_items pi
  set visible = false,
      hidden_reason = 'plan_downgrade'
  where pi.id in (
    select pi2.id
    from public.proof_items pi2
    join public.subscriptions s on s.profile_id = pi2.profile_id
    where s.plan = 'free'
      and pi2.visible = true
      and pi2.hidden_reason is distinct from 'plan_downgrade'
      and pi2.id not in (
        -- Keep the first 4 items per pillar (by sort_order, then created_at)
        select id
        from public.proof_items pi3
        where pi3.profile_id = pi2.profile_id
          and pi3.pillar = pi2.pillar
        order by sort_order asc, created_at asc
        limit 4
      )
  );

  return v_count;
end;
$$;

-- ----------------------------------------------------------------
-- 5. Update get_public_profile RPC to include new fields
-- Add claim_text and contact_visibility to the returned JSON
-- ----------------------------------------------------------------
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
    'id',                  v_profile.id,
    'handle',              v_profile.handle,
    'persona',             v_profile.persona,
    'display_name',        v_profile.display_name,
    'role_line',           v_profile.role_line,
    'tagline',             v_profile.tagline,
    'claim_text',          v_profile.claim_text,
    'contact_visibility',  v_profile.contact_visibility,
    'avatar_url',          v_profile.avatar_url,
    'email',               v_email,
    'showcase_images',     v_profile.showcase_images,
    'physical_attributes', v_profile.physical_attributes,
    'socials',             v_profile.socials,
    'category',            v_profile.category,
    'tags',                v_profile.tags,
    'location_area',       v_profile.location_area,
    'locale',              v_profile.locale,
    'plan',                coalesce(v_sub.plan, 'free'),
    'plan_expires',        v_sub.current_period_end,
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

-- ----------------------------------------------------------------
-- 6. Update the FTS index to include claim_text for search
-- ----------------------------------------------------------------
drop index if exists profiles_fts_idx;
create index profiles_fts_idx
  on public.profiles
  using gin (
    to_tsvector('english',
      coalesce(display_name,'') || ' ' ||
      coalesce(category,'') || ' ' ||
      coalesce(role_line,'') || ' ' ||
      coalesce(location_area,'') || ' ' ||
      coalesce(claim_text,'')
    )
  );

-- ----------------------------------------------------------------
-- 7. Grant execute on updated RPC (already granted, but be safe)
-- ----------------------------------------------------------------
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.downgrade_expired_subscriptions() to authenticated;

-- ============================================================
-- END OF MIGRATION 001
-- ============================================================
