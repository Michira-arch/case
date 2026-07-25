-- ============================================================
-- CASE APP — Migration 005: Agency B2B System Infrastructure
-- Highly optimized for low bandwidth, zero data duplication,
-- strict Max 4 agency limits, and full user data sovereignty.
-- ============================================================

-- EXTENSIONS
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 1. AGENCIES TABLE
create table if not exists public.agencies (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  handle              text unique not null constraint agency_handle_format check (handle ~ '^[a-z0-9._-]{3,30}$'),
  name                text not null,
  tagline             text,
  description         text,
  logo_url            text,
  banner_url          text,
  country_code        text not null default 'KE',
  currency            text not null default 'KES',
  
  -- Compact JSONB for operational rules (split %, auto-approve, min completeness score)
  rules               jsonb not null default '{
    "auto_approve_members": false,
    "min_completeness_score": 70,
    "default_agency_split_pct": 20.0,
    "require_vouched_proofs": true
  }'::jsonb,
  
  is_verified         boolean not null default false,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists agencies_owner_idx on public.agencies (owner_id);
create index if not exists agencies_handle_idx on public.agencies (handle);

-- 2. AGENCY SUBSCRIPTIONS (B2B SaaS Revenue)
create table if not exists public.agency_subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references public.agencies(id) on delete cascade unique,
  plan_period         text not null check (plan_period in ('1m', '12m')),
  status              text not null check (status in ('active', 'past_due', 'canceled', 'trialing')),
  currency            text not null default 'KES',
  amount_paid         numeric(10,2) not null,
  current_period_end  timestamptz not null,
  paystack_sub_code   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 3. AGENCY MEMBERS & PAYOUT METADATA
create table if not exists public.agency_members (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references public.agencies(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  profile_id          uuid references public.profiles(id) on delete set null,
  role                text not null default 'talent' check (role in ('admin', 'manager', 'talent')),
  custom_split_pct    numeric(5,2), -- Overrides agency default split if set
  
  -- Payment routing info
  payout_provider     text not null default 'paystack' check (payout_provider in ('paystack', 'manual_ledger', 'stripe')),
  paystack_subaccount text, -- Paystack subaccount code e.g. ACCT_xxxxxx
  payout_bank_details jsonb default '{}'::jsonb,
  
  -- Overlay metadata for agency branding without mutating personal profile
  overlay_data        jsonb default '{}'::jsonb,
  
  status              text not null default 'active' check (status in ('active', 'suspended', 'left')),
  joined_at           timestamptz not null default now(),
  constraint agency_member_unique unique (agency_id, user_id)
);

create index if not exists agency_members_user_idx on public.agency_members (user_id);
create index if not exists agency_members_agency_idx on public.agency_members (agency_id, status);

-- Enforce Max 4 Agencies Rule via Trigger Function
create or replace function public.check_agency_membership_limit()
returns trigger language plpgsql as $$
declare
  active_count int;
begin
  if NEW.status = 'active' then
    select count(*) into active_count
    from public.agency_members
    where user_id = NEW.user_id and status = 'active';

    if active_count >= 4 then
      raise exception 'A user can be an active member of up to 4 agencies only.';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists enforce_agency_limit on public.agency_members;
create trigger enforce_agency_limit
  before insert on public.agency_members
  for each row execute function public.check_agency_membership_limit();

-- 4. AGENCY JOIN REQUESTS & INVITATIONS
create table if not exists public.agency_join_requests (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references public.agencies(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  direction           text not null check (direction in ('talent_apply', 'agency_invite')),
  message             text,
  token               text unique default encode(extensions.gen_random_bytes(18), 'hex'),
  status              text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'canceled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists agency_join_requests_agency_idx on public.agency_join_requests (agency_id, status);
create index if not exists agency_join_requests_user_idx on public.agency_join_requests (user_id, status);

-- 5. AGENCY TRANSACTIONS & SPLIT PAYMENTS LEDGER
create table if not exists public.agency_transactions (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references public.agencies(id) on delete cascade,
  client_email        text not null,
  title               text not null,
  total_amount        numeric(10,2) not null,
  currency            text not null default 'KES',
  
  agency_cut_amount   numeric(10,2) not null,
  talent_cut_amount   numeric(10,2) not null,
  talent_user_id      uuid not null references auth.users(id),
  
  gateway             text not null default 'paystack' check (gateway in ('paystack', 'manual_ledger', 'stripe')),
  paystack_reference  text unique,
  status              text not null default 'pending' check (status in ('pending', 'successful', 'failed', 'payout_queued', 'payout_settled')),
  created_at          timestamptz not null default now()
);

create index if not exists agency_transactions_agency_idx on public.agency_transactions (agency_id, created_at desc);
create index if not exists agency_transactions_talent_idx on public.agency_transactions (talent_user_id, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
alter table public.agencies enable row level security;
alter table public.agency_subscriptions enable row level security;
alter table public.agency_members enable row level security;
alter table public.agency_join_requests enable row level security;
alter table public.agency_transactions enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Public agencies read" on public.agencies;
drop policy if exists "Owner agencies manage" on public.agencies;
drop policy if exists "Agency members read" on public.agency_members;
drop policy if exists "Admin manage members" on public.agency_members;
drop policy if exists "Join requests user/admin read" on public.agency_join_requests;
drop policy if exists "Join requests user/admin write" on public.agency_join_requests;
drop policy if exists "Subscriptions owner read" on public.agency_subscriptions;
drop policy if exists "Transactions owner/talent read" on public.agency_transactions;

-- Public read for active agencies
create policy "Public agencies read" on public.agencies
  for select using (is_active = true);

-- Owner full access to agencies
create policy "Owner agencies manage" on public.agencies
  for all using (auth.uid() = owner_id);

-- Agency Members read policy
create policy "Agency members read" on public.agency_members
  for select using (
    exists (
      select 1 from public.agencies a
      where a.id = agency_id and (a.is_active = true or a.owner_id = auth.uid())
    ) or user_id = auth.uid()
  );

-- Owner/Manager write policy for agency members
create policy "Admin manage members" on public.agency_members
  for all using (
    exists (
      select 1 from public.agencies a
      where a.id = agency_id and a.owner_id = auth.uid()
    ) or user_id = auth.uid()
  );

-- Join requests policies
create policy "Join requests user/admin read" on public.agency_join_requests
  for select using (
    user_id = auth.uid() or
    exists (select 1 from public.agencies a where a.id = agency_id and a.owner_id = auth.uid())
  );

create policy "Join requests user/admin write" on public.agency_join_requests
  for all using (
    user_id = auth.uid() or
    exists (select 1 from public.agencies a where a.id = agency_id and a.owner_id = auth.uid())
  );

-- Subscriptions policies
create policy "Subscriptions owner read" on public.agency_subscriptions
  for select using (
    exists (select 1 from public.agencies a where a.id = agency_id and a.owner_id = auth.uid())
  );

-- Transactions policies
create policy "Transactions owner/talent read" on public.agency_transactions
  for select using (
    talent_user_id = auth.uid() or
    exists (select 1 from public.agencies a where a.id = agency_id and a.owner_id = auth.uid())
  );

-- ============================================================
-- HIGH-PERFORMANCE RPC STORED PROCEDURES
-- Assembles complex responses in 1 DB roundtrip to save bandwidth
-- ============================================================

-- RPC 1: get_agency_public_profile
create or replace function public.get_agency_public_profile(p_handle text)
returns jsonb
language plpgsql security definer stable as $$
declare
  v_agency public.agencies%rowtype;
  result jsonb;
begin
  select * into v_agency
  from public.agencies
  where handle = p_handle and is_active = true;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'id',           v_agency.id,
    'handle',       v_agency.handle,
    'name',         v_agency.name,
    'tagline',      v_agency.tagline,
    'description',  v_agency.description,
    'logo_url',     v_agency.logo_url,
    'banner_url',   v_agency.banner_url,
    'country_code', v_agency.country_code,
    'currency',     v_agency.currency,
    'is_verified',  v_agency.is_verified,
    'created_at',   v_agency.created_at,
    'roster', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'member_id',   m.id,
          'user_id',     m.user_id,
          'role',        m.role,
          'joined_at',   m.joined_at,
          'profile',     jsonb_build_object(
            'id',           p.id,
            'handle',       p.handle,
            'display_name', p.display_name,
            'role_line',    coalesce(m.overlay_data->>'role_line', p.role_line),
            'avatar_url',   p.avatar_url,
            'category',     p.category,
            'location_area',p.location_area
          ),
          'proof_count', (select count(*) from public.proof_items pi where pi.profile_id = p.id and pi.visible = true)
        )
      ), '[]'::jsonb)
      from public.agency_members m
      join public.profiles p on p.id = m.profile_id
      where m.agency_id = v_agency.id and m.status = 'active'
    )
  ) into result;

  return result;
end;
$$;

-- RPC 2: approve_agency_member
create or replace function public.approve_agency_member(
  p_request_id uuid,
  p_role text default 'talent'
)
returns jsonb
language plpgsql security definer as $$
declare
  v_req public.agency_join_requests%rowtype;
  v_agency public.agencies%rowtype;
  v_member public.agency_members%rowtype;
begin
  select * into v_req
  from public.agency_join_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Join request not found or already processed.';
  end if;

  select * into v_agency
  from public.agencies
  where id = v_req.agency_id and owner_id = auth.uid();

  if not found then
    raise exception 'Unauthorized to approve member for this agency.';
  end if;

  -- Create agency member (enforces Max 4 limit trigger)
  insert into public.agency_members (agency_id, user_id, profile_id, role, status)
  values (v_req.agency_id, v_req.user_id, v_req.profile_id, p_role, 'active')
  returning * into v_member;

  -- Update join request status
  update public.agency_join_requests
  set status = 'approved', updated_at = now()
  where id = v_req.id;

  return jsonb_build_object(
    'success', true,
    'member_id', v_member.id
  );
end;
$$;

-- RPC 3: leave_agency_safe (Data Sovereignty Guarantee)
create or replace function public.leave_agency_safe(p_agency_id uuid)
returns jsonb
language plpgsql security definer as $$
begin
  update public.agency_members
  set status = 'left'
  where agency_id = p_agency_id and user_id = auth.uid();

  return jsonb_build_object('success', true);
end;
$$;
