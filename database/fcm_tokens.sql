-- Migration: Create fcm_tokens table for push notifications
create table if not exists public.fcm_tokens (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  token         text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.fcm_tokens enable row level security;

-- Policies: users can manage their own device tokens
create policy "Users can insert their own FCM tokens"
  on public.fcm_tokens for insert
  with check (exists (
    select 1 from public.profiles
    where id = fcm_tokens.profile_id and owner_id = auth.uid()
  ));

create policy "Users can select their own FCM tokens"
  on public.fcm_tokens for select
  using (exists (
    select 1 from public.profiles
    where id = fcm_tokens.profile_id and owner_id = auth.uid()
  ));

create policy "Users can update their own FCM tokens"
  on public.fcm_tokens for update
  using (exists (
    select 1 from public.profiles
    where id = fcm_tokens.profile_id and owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles
    where id = fcm_tokens.profile_id and owner_id = auth.uid()
  ));

create policy "Users can delete their own FCM tokens"
  on public.fcm_tokens for delete
  using (exists (
    select 1 from public.profiles
    where id = fcm_tokens.profile_id and owner_id = auth.uid()
  ));

-- Index for quick lookups when sending notifications
create index if not exists fcm_tokens_profile_id_idx
  on public.fcm_tokens (profile_id);
