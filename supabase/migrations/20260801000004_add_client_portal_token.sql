-- Client portal access token.
-- The portal (/portal/clients/[id]) is opened by clients via emailed links. It
-- was previously unauthenticated, exposing chat + billing to anyone who guessed
-- a client UUID. Add a per-client secret token that the portal URL carries.

alter table public.nanny_clients
  add column if not exists portal_token text;

-- Backfill existing clients so their portal links keep working
-- (gen_random_uuid is available on Supabase PG15; gen_random_bytes needs pgcrypto)
update public.nanny_clients
set portal_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where portal_token is null or portal_token = '';

create unique index nanny_clients_portal_token_idx
  on public.nanny_clients (portal_token)
  where portal_token is not null;
