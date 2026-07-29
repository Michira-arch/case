create table nanny_client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references nanny_clients(id) on delete cascade,
  org_id uuid not null references nanny_orgs(id) on delete cascade,
  sender_type text not null check (sender_type in ('agency', 'client')),
  sender_id uuid references profiles(id) on delete set null, -- Optional, for the specific agent who sent it
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index nanny_client_messages_client_idx on nanny_client_messages(client_id);
create index nanny_client_messages_org_idx on nanny_client_messages(org_id);
create index nanny_client_messages_created_idx on nanny_client_messages(created_at);

-- RLS
alter table nanny_client_messages enable row level security;

-- Agency members can view messages for their orgs
create policy "Agency members can view their org messages"
on nanny_client_messages for select
using (
  org_id in (
    select org_id from nanny_org_members where profile_id = auth.uid()
  )
);

-- Agency members can insert messages for their org
create policy "Agency members can insert messages for their org"
on nanny_client_messages for insert
with check (
  org_id in (
    select org_id from nanny_org_members where profile_id = auth.uid()
  )
);

-- Note: Clients will likely access via an anonymous link (e.g. magic token or invoice ID).
-- We'll handle client-side operations via Server Actions bypassing RLS, or we can add RLS if clients log in.
-- If clients log in, they have a profile_id in nanny_clients.
create policy "Clients can view their own messages"
on nanny_client_messages for select
using (
  client_id in (
    select id from nanny_clients where profile_id = auth.uid()
  )
);

create policy "Clients can insert their own messages"
on nanny_client_messages for insert
with check (
  client_id in (
    select id from nanny_clients where profile_id = auth.uid()
  )
);
