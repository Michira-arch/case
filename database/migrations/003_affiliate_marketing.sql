-- ============================================================
-- MIGRATION 003: Affiliate Marketing Schema
-- ============================================================

-- 1. Table: affiliates
-- Maps a profile to their unique affiliate code
create table if not exists public.affiliates (
  profile_id          uuid primary key references public.profiles(id) on delete cascade,
  code                text unique not null constraint code_format check (code ~ '^[a-z0-9._-]{3,30}$'),
  created_at          timestamptz not null default now()
);

-- 2. Table: affiliate_payouts
-- Logs payout requests and status (minimum 1000 KES)
create table if not exists public.affiliate_payouts (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  amount_kes          numeric(10,2) not null constraint min_payout check (amount_kes >= 1000.00),
  payment_details     text not null, -- M-Pesa phone number or bank details
  status              text not null default 'pending' constraint payout_status_values check (status in ('pending','completed','failed')),
  created_at          timestamptz not null default now(),
  processed_at        timestamptz
);

-- 3. Table: referrals
-- Tracks who referred whom, their payout status, and links to payouts
create table if not exists public.referrals (
  id                  uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid not null references public.profiles(id) on delete cascade,
  referred_profile_id uuid unique not null references public.profiles(id) on delete cascade,
  created_at          timestamptz not null default now(),
  payout_status       text not null default 'unpaid' constraint referral_payout_status_values check (payout_status in ('unpaid','paid')),
  payout_id           uuid references public.affiliate_payouts(id) on delete set null
);

-- Indexes for performance
create index if not exists affiliates_code_idx on public.affiliates (code);
create index if not exists referrals_referrer_idx on public.referrals (referrer_profile_id);
create index if not exists referrals_referred_idx on public.referrals (referred_profile_id);
create index if not exists affiliate_payouts_profile_idx on public.affiliate_payouts (profile_id);

-- Enable Row Level Security (RLS)
alter table public.affiliates enable row level security;
alter table public.referrals enable row level security;
alter table public.affiliate_payouts enable row level security;

-- 4. RLS Policies

-- Affiliates
create policy "Anyone can read affiliates"
  on public.affiliates for select
  using (true);

create policy "Owner can insert own affiliate record"
  on public.affiliates for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = affiliates.profile_id
        and p.owner_id = auth.uid()
    )
  );

-- Referrals
create policy "Referrer can read own referrals"
  on public.referrals for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = referrals.referrer_profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Referred user can insert own referral"
  on public.referrals for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = referrals.referred_profile_id
        and p.owner_id = auth.uid()
    )
  );

-- Affiliate Payouts
create policy "Owner can read own payouts"
  on public.affiliate_payouts for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = affiliate_payouts.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owner can insert own payouts"
  on public.affiliate_payouts for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = affiliate_payouts.profile_id
        and p.owner_id = auth.uid()
    )
  );

-- 5. View for Affiliate Referrals Summary & Commission Calculation
create or replace view public.affiliate_referrals_summary as
select
  r.id,
  r.referrer_profile_id,
  r.referred_profile_id,
  r.created_at,
  p_ref.display_name as referred_name,
  p_ref.handle as referred_handle,
  r.payout_status,
  r.payout_id,
  -- Check if they upgraded (had success payment) within 30 days
  exists(
    select 1 from public.payments pay
    where pay.profile_id = r.referred_profile_id
      and pay.status = 'success'
      and pay.created_at <= r.created_at + interval '30 days'
  ) as upgraded_within_30_days,
  -- Get their first successful payment date if any
  (
    select min(pay.created_at) from public.payments pay
    where pay.profile_id = r.referred_profile_id
      and pay.status = 'success'
  ) as payment_date,
  -- Calculate commission
  case
    -- If they upgraded within 30 days, pay 20 KES
    when exists(
      select 1 from public.payments pay
      where pay.profile_id = r.referred_profile_id
        and pay.status = 'success'
        and pay.created_at <= r.created_at + interval '30 days'
    ) then 20.00
    -- If they have not upgraded, but 30 days have passed, pay 1 KES
    when now() > r.created_at + interval '30 days' then 1.00
    -- Otherwise, it is still pending (0 KES payable now)
    else 0.00
  end as commission_kes,
  -- Status: 'earned' (either upgraded, or 30 days passed), 'pending' (still under 30 days and not upgraded)
  case
    when exists(
      select 1 from public.payments pay
      where pay.profile_id = r.referred_profile_id
        and pay.status = 'success'
        and pay.created_at <= r.created_at + interval '30 days'
    ) then 'earned'
    when now() > r.created_at + interval '30 days' then 'earned'
    else 'pending'
  end as status
from public.referrals r
join public.profiles p_ref on p_ref.id = r.referred_profile_id;

-- Grant select to authenticated users for the view
grant select on public.affiliate_referrals_summary to authenticated;

-- ============================================================
-- END OF MIGRATION 003
-- ============================================================
