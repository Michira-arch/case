-- Ensure every client row gets a portal_token on insert/update, regardless of
-- which code path created it (anon-booking RPC, server actions, manual inserts).
-- The client portal requires this token for access.

create or replace function public.nanny_clients_set_portal_token()
returns trigger
language plpgsql
as $$
begin
  if new.portal_token is null or new.portal_token = '' then
    new.portal_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  end if;
  return new;
end;
$$;

drop trigger if exists nanny_clients_set_portal_token on public.nanny_clients;
create trigger nanny_clients_set_portal_token
before insert or update on public.nanny_clients
for each row execute function public.nanny_clients_set_portal_token();
