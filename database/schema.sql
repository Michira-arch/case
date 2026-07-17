-- ============================================================
-- CASE APP — Complete Supabase SQL Schema
-- Run this entire file in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- for full-text search later

-- ============================================================
-- ENUMS / DOMAINS
-- ============================================================

-- ============================================================
-- TABLE: profiles ("Cases")
-- One auth.user can own MANY profiles (multi-account §6.13)
-- ============================================================
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  handle          text unique not null
                    constraint handle_format
                    check (handle ~ '^[a-z0-9._-]{3,30}$'),
  persona         text not null
                    constraint persona_values
                    check (persona in ('service','professional','jobseeker')),
  display_name    text not null,
  role_line       text,                       -- "Freelance hairstylist & braider · Nairobi"
  tagline         text,
  avatar_url      text,
  showcase_images text[] not null default '{}',
  physical_attributes jsonb not null default '{}'::jsonb,
  socials         jsonb not null default '[]', -- [{platform, url}]
  is_public       boolean not null default true,
  locale          text not null default 'en'
                    constraint locale_values
                    check (locale in ('en','sw')),
  category        text,                       -- search facet e.g. "hairstylist"
  tags            text[] not null default '{}',
  location_area   text,                       -- "Westlands, Nairobi"
  discoverable    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists profiles_owner_id_idx
  on public.profiles (owner_id);

-- Partial index for Case Search (§6.14)
create index if not exists profiles_search_idx
  on public.profiles (category, location_area)
  where discoverable = true and is_public = true;

-- Full-text search index (§6.14)
create index if not exists profiles_fts_idx
  on public.profiles
  using gin (
    to_tsvector('english',
      coalesce(display_name,'') || ' ' ||
      coalesce(category,'') || ' ' ||
      coalesce(role_line,'') || ' ' ||
      coalesce(location_area,'')
    )
  );

-- ============================================================
-- TABLE: proof_items
-- The did/trained/vouched/aiming claims
-- ============================================================
create table if not exists public.proof_items (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  pillar          text not null
                    constraint pillar_values
                    check (pillar in ('did','trained','vouched','aiming')),
  title           text not null,
  detail          text,
  when_label      text,                       -- free-text e.g. "2020–2022"
  visible         boolean not null default true,
  sort_order      int not null default 0,
  source          text not null default 'owner'
                    constraint source_values
                    check (source in ('owner','vouch_request')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists proof_items_profile_id_idx
  on public.proof_items (profile_id, pillar, sort_order);

-- ============================================================
-- TABLE: evidence
-- Files attached to a proof item (stored in Cloudflare R2)
-- ============================================================
create table if not exists public.evidence (
  id                 uuid primary key default gen_random_uuid(),
  proof_item_id      uuid not null references public.proof_items(id) on delete cascade,
  type               text not null
                       constraint evidence_type_values
                       check (type in ('img','pdf','vid')),
  storage_key        text not null,            -- R2 object key
  caption            text,
  width              int,
  height             int,
  duration_seconds   int,
  bytes_original     int,
  bytes_compressed   int,
  created_at         timestamptz not null default now()
);

create index if not exists evidence_proof_item_id_idx
  on public.evidence (proof_item_id);

-- ============================================================
-- TABLE: vouch_requests
-- Token-based public submission (§6.5)
-- ============================================================
create table if not exists public.vouch_requests (
  id                       uuid primary key default gen_random_uuid(),
  profile_id               uuid not null references public.profiles(id) on delete cascade,
  token                    text unique not null default encode(gen_random_bytes(24), 'hex'),
  recipient_label          text,               -- "Faith K." — for owner tracking
  message                  text,               -- prefilled ask
  status                   text not null default 'pending'
                             constraint vouch_status_values
                             check (status in ('pending','completed','expired')),
  created_at               timestamptz not null default now(),
  expires_at               timestamptz not null default now() + interval '30 days',
  completed_at             timestamptz,
  resulting_proof_item_id  uuid references public.proof_items(id)
);

create index if not exists vouch_requests_profile_id_idx
  on public.vouch_requests (profile_id);

create index if not exists vouch_requests_token_idx
  on public.vouch_requests (token);

-- ============================================================
-- TABLE: payments
-- One row per Paystack transaction (§6.8)
-- ============================================================
create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references public.profiles(id) on delete cascade,
  paystack_reference   text unique not null,
  amount_kes           numeric(10,2) not null,   -- 70 or 100
  plan_period          text not null
                         constraint plan_period_values
                         check (plan_period in ('6m','12m')),
  channel              text,                     -- 'mobile_money' | 'card'
  status               text not null
                         constraint payment_status_values
                         check (status in ('pending','success','failed')),
  paystack_data        jsonb,                    -- raw webhook payload
  created_at           timestamptz not null default now()
);

create index if not exists payments_profile_id_idx
  on public.payments (profile_id, created_at);

-- ============================================================
-- TABLE: subscriptions
-- Plan state per profile/Case (§6.8)
-- ============================================================
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references public.profiles(id) on delete cascade,
  plan                 text not null default 'free'
                         constraint plan_values
                         check (plan in ('free','plus')),
  current_period_end   timestamptz,              -- null for free
  last_payment_id      uuid references public.payments(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint subscriptions_profile_unique unique (profile_id)
);

-- ============================================================
-- TABLE: analytics_events
-- Lightweight append-only event log (§6.6)
-- ============================================================
create table if not exists public.analytics_events (
  id              bigint generated always as identity primary key,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  event_type      text not null,
  -- profile_view | evidence_tap | social_click | vouch_open | vouch_complete | install
  proof_item_id   uuid,                         -- nullable for evidence_tap etc.
  referrer_host   text,
  device_type     text,                         -- 'mobile'|'desktop'|'tablet'
  country         text,                         -- derived at write time, raw IP discarded
  created_at      timestamptz not null default now()
);

create index if not exists analytics_events_profile_idx
  on public.analytics_events (profile_id, created_at desc);

-- ============================================================
-- TABLE: push_subscriptions
-- Web Push VAPID subscriptions (§6.10)
-- ============================================================
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  constraint push_subscriptions_unique unique (profile_id, endpoint)
);

-- ============================================================
-- PRICING CONFIG TABLE
-- Keeps prices out of code (§6.8 — tunable without redeploy)
-- ============================================================
create table if not exists public.pricing_plans (
  id            text primary key,               -- '6m' | '12m'
  label         text not null,
  amount_kes    numeric(10,2) not null,
  months        int not null,
  description   text
);

insert into public.pricing_plans (id, label, amount_kes, months, description) values
  ('6m',  '6 months', 70.00,  6,  'Best for trying Case+'),
  ('12m', '1 year',  100.00, 12,  'Best value — save 30% vs two 6-month periods')
on conflict (id) do update
  set amount_kes = excluded.amount_kes,
      label = excluded.label,
      description = excluded.description;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at columns
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger proof_items_updated_at
  before update on public.proof_items
  for each row execute function public.set_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Auto-create free subscription when a profile is created
create or replace function public.create_default_subscription()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (profile_id, plan)
  values (new.id, 'free')
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_subscription
  after insert on public.profiles
  for each row execute function public.create_default_subscription();

-- Auto-expire vouch_requests
create or replace function public.expire_vouch_requests()
returns void language plpgsql security definer as $$
begin
  update public.vouch_requests
  set status = 'expired'
  where status = 'pending'
    and expires_at < now();
end;
$$;

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

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles         enable row level security;
alter table public.proof_items      enable row level security;
alter table public.evidence         enable row level security;
alter table public.vouch_requests   enable row level security;
alter table public.payments         enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.analytics_events enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.pricing_plans    enable row level security;

-- ---- profiles ----
create policy "Public profiles are readable by anyone"
  on public.profiles for select
  using (is_public = true);

create policy "Owner can read own profiles (including private)"
  on public.profiles for select
  using (owner_id = auth.uid());

create policy "Owner can insert own profiles"
  on public.profiles for insert
  with check (owner_id = auth.uid());

create policy "Owner can update own profiles"
  on public.profiles for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owner can delete own profiles"
  on public.profiles for delete
  using (owner_id = auth.uid());

-- ---- proof_items ----
-- Public: visible items on public profiles
create policy "Public can read visible proof items"
  on public.proof_items for select
  using (
    visible = true
    and exists (
      select 1 from public.profiles p
      where p.id = proof_items.profile_id
        and p.is_public = true
    )
  );

-- Owner: read all their items (including hidden drafts)
create policy "Owner can read all own proof items"
  on public.proof_items for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = proof_items.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owner can insert proof items"
  on public.proof_items for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = proof_items.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owner can update proof items"
  on public.proof_items for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = proof_items.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owner can delete proof items"
  on public.proof_items for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = proof_items.profile_id
        and p.owner_id = auth.uid()
    )
  );

-- ---- evidence ----
create policy "Public can read evidence on visible items"
  on public.evidence for select
  using (
    exists (
      select 1 from public.proof_items pi
      join public.profiles p on p.id = pi.profile_id
      where pi.id = evidence.proof_item_id
        and pi.visible = true
        and p.is_public = true
    )
  );

create policy "Owner can read all own evidence"
  on public.evidence for select
  using (
    exists (
      select 1 from public.proof_items pi
      join public.profiles p on p.id = pi.profile_id
      where pi.id = evidence.proof_item_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owner can insert evidence"
  on public.evidence for insert
  with check (
    exists (
      select 1 from public.proof_items pi
      join public.profiles p on p.id = pi.profile_id
      where pi.id = evidence.proof_item_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owner can delete evidence"
  on public.evidence for delete
  using (
    exists (
      select 1 from public.proof_items pi
      join public.profiles p on p.id = pi.profile_id
      where pi.id = evidence.proof_item_id
        and p.owner_id = auth.uid()
    )
  );

-- ---- vouch_requests ----
-- Public: readable only via token (not listable)
create policy "Anyone can read vouch request by token"
  on public.vouch_requests for select
  using (true);  -- filtered by token in RPC, not policy

-- Owner can see all their vouch requests
create policy "Owner can read own vouch requests"
  on public.vouch_requests for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = vouch_requests.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owner can insert vouch requests"
  on public.vouch_requests for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = vouch_requests.profile_id
        and p.owner_id = auth.uid()
    )
  );

-- ---- payments ----
-- Owner read-only; writes only via service role (webhook)
create policy "Owner can read own payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = payments.profile_id
        and p.owner_id = auth.uid()
    )
  );

-- ---- subscriptions ----
create policy "Owner can read own subscription"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = subscriptions.profile_id
        and p.owner_id = auth.uid()
    )
  );

-- Public profiles expose plan status (needed for public page features)
create policy "Public can read subscription plan for public profiles"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = subscriptions.profile_id
        and p.is_public = true
    )
  );

-- ---- analytics_events ----
-- No public read. Owner read only. Inserts via service role / RPC.
create policy "Owner can read own analytics"
  on public.analytics_events for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = analytics_events.profile_id
        and p.owner_id = auth.uid()
    )
  );

-- ---- push_subscriptions ----
create policy "Owner can manage own push subscriptions"
  on public.push_subscriptions for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = push_subscriptions.profile_id
        and p.owner_id = auth.uid()
    )
  );

-- ---- pricing_plans ----
create policy "Anyone can read pricing plans"
  on public.pricing_plans for select
  using (true);

-- ============================================================
-- GRANT EXECUTE on RPCs to authenticated & anon roles
-- ============================================================
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.log_event(uuid, text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.create_vouch_request(uuid, text, text) to authenticated;
grant execute on function public.submit_vouch(text, text, text, text, text[]) to anon, authenticated;
grant execute on function public.get_analytics_summary(uuid, int) to authenticated;
grant execute on function public.search_profiles(text, text, text, int, int) to anon, authenticated;
-- apply_payment and downgrade_expired_subscriptions are service-role only

-- ============================================================
-- STORAGE BUCKETS (run after creating storage in Supabase)
-- Note: the actual R2 bucket is used directly via signed URLs.
-- These policies are for Supabase Storage if used as fallback.
-- ============================================================

-- ============================================================
-- HELPFUL VIEWS (for debugging / admin)
-- ============================================================

create or replace view public.profile_completeness as
select
  p.id,
  p.handle,
  p.display_name,
  p.owner_id,
  count(distinct case when pi.pillar = 'did'        then pi.id end) as did_count,
  count(distinct case when pi.pillar = 'trained'    then pi.id end) as trained_count,
  count(distinct case when pi.pillar = 'vouched'    then pi.id end) as vouched_count,
  count(distinct case when pi.pillar = 'aiming'     then pi.id end) as aiming_count,
  count(distinct e.id) as evidence_count,
  -- Completeness score calculation (§6.2)
  least(100, (
    -- Base: profile info filled
    case when p.display_name is not null and p.role_line is not null then 20 else 0 end +
    -- 10% per proof item that has at least 1 evidence file, up to 80%
    least(80, count(distinct case when e.id is not null then pi.id end) * 10)
  )) as completeness_score,
  coalesce(s.plan, 'free') as plan
from public.profiles p
left join public.proof_items pi on pi.profile_id = p.id and pi.visible = true
left join public.evidence e on e.proof_item_id = pi.id
left join public.subscriptions s on s.profile_id = p.id
group by p.id, p.handle, p.display_name, p.owner_id, s.plan;

-- Grant access to the view
grant select on public.profile_completeness to authenticated;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- Next steps after running this SQL:
-- 1. Copy your Supabase project URL and anon key to .env.local
-- 2. Copy your service role key to .env.local (keep secret!)
-- 3. Enable phone auth in Supabase Auth settings
-- 4. Deploy the app and set PAYSTACK_WEBHOOK_URL
-- ============================================================
