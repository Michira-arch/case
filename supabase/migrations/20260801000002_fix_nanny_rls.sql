-- 1. Fix nanny_client_messages RLS: the policies compared profile UUIDs directly
--    to auth.uid() (auth user UUID). That never matches, so messaging only worked
--    through the service-role server actions. Join through profiles.owner_id instead.

drop policy if exists "Agency members can view their org messages" on public.nanny_client_messages;
drop policy if exists "Agency members can insert messages for their org" on public.nanny_client_messages;
drop policy if exists "Clients can view their own messages" on public.nanny_client_messages;
drop policy if exists "Clients can insert their own messages" on public.nanny_client_messages;

create policy "Agency members can view their org messages"
on public.nanny_client_messages for select
using (
  org_id in (
    select m.org_id from public.nanny_org_members m
    join public.profiles p on p.id = m.profile_id
    where p.owner_id = auth.uid()
  )
);

create policy "Agency members can insert messages for their org"
on public.nanny_client_messages for insert
with check (
  org_id in (
    select m.org_id from public.nanny_org_members m
    join public.profiles p on p.id = m.profile_id
    where p.owner_id = auth.uid()
  )
);

create policy "Clients can view their own messages"
on public.nanny_client_messages for select
using (
  client_id in (
    select c.id from public.nanny_clients c
    join public.profiles p on p.id = c.profile_id
    where p.owner_id = auth.uid()
  )
);

create policy "Clients can insert their own messages"
on public.nanny_client_messages for insert
with check (
  client_id in (
    select c.id from public.nanny_clients c
    join public.profiles p on p.id = c.profile_id
    where p.owner_id = auth.uid()
  )
);

-- 2. Public worker directory was silently empty: nanny_workers had no public-read
--    policy, so show_on_public workers returned nothing to anonymous visitors.
--    Add SELECT-only policies scoped to rows explicitly marked public.

create policy "nanny_workers_public_read"
on public.nanny_workers for select
using (
  show_on_public = true
  and worker_state in ('vetted', 'active')
);

-- Public can only see *approved* credentials of public workers
create policy "nanny_worker_credentials_public_read"
on public.nanny_worker_credentials for select
using (
  status = 'approved'
  and worker_id in (
    select id from public.nanny_workers
    where show_on_public = true
      and worker_state in ('vetted', 'active')
  )
);

-- 3. nanny_push_subscriptions was owner-only; org members (admins/dispatchers)
--    couldn't register push subscriptions. Widen to any org member.
drop policy if exists "Users can manage push subscriptions for their orgs" on public.nanny_push_subscriptions;
create policy "Users can manage push subscriptions for their orgs"
on public.nanny_push_subscriptions for all
using (nanny_is_org_member(org_id))
with check (nanny_is_org_member(org_id));
