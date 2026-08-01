-- Enable RLS on the two subscription tables that store Paystack card
-- authorization codes. They previously had RLS disabled, which gave
-- anon/authenticated full table access (a direct leak of reusable card tokens).

-- ── nanny_subscriptions (agency / client billing rows) ───────────────────────
alter table public.nanny_subscriptions enable row level security;

-- Org owner can manage their org's subscription rows
create policy "nanny_subscriptions_org_owner_all"
on public.nanny_subscriptions
for all using (
  org_id in (
    select o.id from public.nanny_orgs o
    join public.profiles p on p.id = o.owner_profile_id
    where p.owner_id = auth.uid()
  )
) with check (
  org_id in (
    select o.id from public.nanny_orgs o
    join public.profiles p on p.id = o.owner_profile_id
    where p.owner_id = auth.uid()
  )
);

-- A client's profile owner may read their own subscription rows (portal / future login)
create policy "nanny_subscriptions_client_owner_read"
on public.nanny_subscriptions
for select using (
  client_id in (
    select c.id from public.nanny_clients c
    join public.profiles p on p.id = c.profile_id
    where p.owner_id = auth.uid()
  )
);

-- ── profile_subscriptions (provider → client recurring billing rows) ────────
alter table public.profile_subscriptions enable row level security;

-- Provider can read/update subscriptions tied to their profile
create policy "profile_subscriptions_provider_all"
on public.profile_subscriptions
for all using (
  profile_id in (
    select id from public.profiles where owner_id = auth.uid()
  )
) with check (
  profile_id in (
    select id from public.profiles where owner_id = auth.uid()
  )
);
