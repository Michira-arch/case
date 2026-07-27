-- ============================================================
-- NANNY / CAREGIVING AGENCY PLATFORM
-- Migration: 20260727000001_nanny_caregiving_schema.sql
--
-- Design principles:
--   1. Reuse existing `profiles` table for worker identity
--   2. JSONB for config/policy data to avoid schema churn
--   3. State machines enforced via check constraints
--   4. Anon client support via token-based identity
--   5. Minimal rows: config is data, not schema
-- ============================================================

-- Enable pgcrypto for secure token generation
create extension if not exists pgcrypto;

-- ────────────────────────────────────────────────────────────
-- ORGANIZATIONS (Agency Configuration)
-- One row per agency. Stores all policy config as JSONB.
-- ────────────────────────────────────────────────────────────
create table nanny_orgs (
  id               uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references profiles(id) on delete cascade,
  slug             text unique not null,                       -- URL-safe agency handle e.g. "sunny-smiles"
  name             text not null,
  tagline          text,
  description      text,
  logo_url         text,
  cover_url        text,
  vertical         text not null default 'nanny'
                     check (vertical in ('nanny','cleaning','both')),
  status           text not null default 'active'
                     check (status in ('active','suspended','closed')),
  contact_email    text,
  contact_phone    text,
  address          text,
  location_area    text,
  -- Policy config stored as JSONB to avoid schema changes per agency
  -- Includes: matching_mode, cancellation_policy_hours, emergency_surcharge_pct,
  --           holiday_pay_rate, overtime_multiplier, payout_cadence, etc.
  policy           jsonb not null default '{
    "matching_mode": "shortlist",
    "cancellation_grace_hours": 24,
    "emergency_surcharge_pct": 20,
    "holiday_pay_rate": 0.1207,
    "overtime_multiplier": 1.5,
    "overtime_threshold_hours": 8,
    "payout_cadence": "weekly",
    "platform_commission_pct": 15,
    "auto_invoice": true,
    "require_timelog": true,
    "continuity_preference": true
  }'::jsonb,
  -- SEO / public presence
  is_public        boolean not null default true,
  seo_title        text,
  seo_description  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index nanny_orgs_owner_profile_idx on nanny_orgs(owner_profile_id);
create index nanny_orgs_slug_idx on nanny_orgs(slug);

-- ────────────────────────────────────────────────────────────
-- CREDENTIAL TYPES (Policy-driven config data)
-- Each org defines its own credential taxonomy.
-- Pre-seeded with standard nanny/cleaning certs.
-- ────────────────────────────────────────────────────────────
create table nanny_credential_types (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references nanny_orgs(id) on delete cascade,
  code                  text not null,                         -- e.g. "enhanced_dbs", "paediatric_first_aid"
  name                  text not null,
  description           text,
  issuing_body          text,
  vertical              text not null default 'both'
                          check (vertical in ('nanny','cleaning','both')),
  requires_expiry       boolean not null default true,
  default_validity_days int,                                   -- e.g. 1095 = 3 years
  is_required           boolean not null default false,        -- mandatory vs recommended
  is_archived           boolean not null default false,
  sort_order            int not null default 0,
  created_at            timestamptz not null default now(),
  unique (org_id, code)
);

create index nanny_cred_types_org_idx on nanny_credential_types(org_id);

-- ────────────────────────────────────────────────────────────
-- SERVICE TYPES (Catalog of services offered)
-- Config data not schema — each org customizes their menu.
-- ────────────────────────────────────────────────────────────
create table nanny_service_types (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references nanny_orgs(id) on delete cascade,
  code                  text not null,
  name                  text not null,
  description           text,
  vertical              text not null default 'nanny'
                          check (vertical in ('nanny','cleaning')),
  pricing_model         text not null default 'hourly'
                          check (pricing_model in ('hourly','flat_rate','quoted')),
  base_rate             numeric(10,2),                         -- base hourly rate or flat rate
  min_hours             numeric(4,1),
  max_hours             numeric(4,1),
  -- Required credentials stored as array of credential_type codes
  required_credentials  text[] not null default '{}',
  is_active             boolean not null default true,
  sort_order            int not null default 0,
  created_at            timestamptz not null default now(),
  unique (org_id, code)
);

create index nanny_svc_types_org_idx on nanny_service_types(org_id);

-- ────────────────────────────────────────────────────────────
-- WORKERS (Agency workforce)
-- Links to existing profiles table for identity.
-- Shadow workers (no auth account yet) have profile_id = null.
-- ────────────────────────────────────────────────────────────
create table nanny_workers (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references nanny_orgs(id) on delete cascade,
  -- Link to Case profile (null if shadow/placeholder worker)
  profile_id        uuid references profiles(id) on delete set null,
  -- Shadow worker fields (used before they claim their profile)
  shadow_name       text,
  shadow_phone      text,
  shadow_email      text,
  -- Worker state machine
  worker_state      text not null default 'applicant'
                      check (worker_state in ('applicant','vetted','active','on_break','suspended','inactive')),
  suspension_reason text,
  -- Role in this org
  role_type         text not null default 'nanny'
                      check (role_type in ('nanny','cleaner','maternity_nurse','live_in','both')),
  -- Availability stored as JSONB: { days: [...], time_slots: [...], start_date, end_date }
  availability      jsonb not null default '{"days":["mon","tue","wed","thu","fri"],"start_time":"07:00","end_time":"19:00"}'::jsonb,
  -- Rate preferences
  hourly_rate       numeric(8,2),
  -- Preferences: age_groups, property_types, travel_radius_km, has_car, etc.
  preferences       jsonb not null default '{}'::jsonb,
  -- Quality metrics (computed/cached for performance)
  avg_rating        numeric(3,2),
  total_assignments int not null default 0,
  -- Claim token for shadow workers to claim their profile
  claim_token       text unique,
  claim_token_expires timestamptz,
  -- Continuity data: which client families they have a history with
  notes             text,                                      -- admin-only internal notes
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index nanny_workers_org_idx on nanny_workers(org_id);
create index nanny_workers_profile_idx on nanny_workers(profile_id);
create index nanny_workers_state_idx on nanny_workers(org_id, worker_state);
create index nanny_workers_claim_token_idx on nanny_workers(claim_token) where claim_token is not null;

-- ────────────────────────────────────────────────────────────
-- WORKER CREDENTIALS (Submitted compliance documents)
-- ────────────────────────────────────────────────────────────
create table nanny_worker_credentials (
  id                  uuid primary key default gen_random_uuid(),
  worker_id           uuid not null references nanny_workers(id) on delete cascade,
  credential_type_id  uuid not null references nanny_credential_types(id),
  -- Document storage
  file_url            text,                                    -- R2 storage key
  -- Status state machine
  status              text not null default 'pending'
                        check (status in ('pending','approved','rejected','expired','revoked')),
  -- Extracted/entered data
  issue_date          date,
  expiry_date         date,
  certificate_number  text,
  issuing_body        text,
  -- Review
  reviewed_by         uuid references profiles(id),
  reviewed_at         timestamptz,
  rejection_reason    text,
  revocation_reason   text,
  -- Automatic reminder tracking
  reminder_30d_sent   boolean not null default false,
  reminder_14d_sent   boolean not null default false,
  reminder_7d_sent    boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index nanny_worker_creds_worker_idx on nanny_worker_credentials(worker_id);
create index nanny_worker_creds_type_idx on nanny_worker_credentials(credential_type_id);
create index nanny_worker_creds_expiry_idx on nanny_worker_credentials(expiry_date) where status = 'approved';

-- ────────────────────────────────────────────────────────────
-- CLIENTS (Families and individual clients)
-- Both anonymous and registered clients.
-- ────────────────────────────────────────────────────────────
create table nanny_clients (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references nanny_orgs(id) on delete cascade,
  -- Optional link to Case profile (null for anon clients)
  profile_id        uuid references profiles(id) on delete set null,
  -- Core contact info (always required even for anon)
  client_name       text not null,
  client_email      text,
  client_phone      text,
  -- Anonymous booking token (for tracking without account)
  anon_token        text unique,
  -- Client type
  client_type       text not null default 'family'
                      check (client_type in ('family','individual','corporate','care_home')),
  -- Client status
  status            text not null default 'active'
                      check (status in ('active','suspended','inactive')),
  -- Preferences and details stored as JSONB
  -- For families: children ages, special needs, pets, address, etc.
  -- For cleaning: property type, size, access info
  details           jsonb not null default '{}'::jsonb,
  -- Preferred workers (array of worker IDs)
  preferred_worker_ids uuid[] not null default '{}',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index nanny_clients_org_idx on nanny_clients(org_id);
create index nanny_clients_profile_idx on nanny_clients(profile_id);
create index nanny_clients_anon_token_idx on nanny_clients(anon_token) where anon_token is not null;
create index nanny_clients_email_idx on nanny_clients(org_id, client_email) where client_email is not null;

-- ────────────────────────────────────────────────────────────
-- BOOKINGS (Service requests — the demand side)
-- State machine: open → matched → scheduled → confirmed →
--               in_progress → completed → closed
-- ────────────────────────────────────────────────────────────
create table nanny_bookings (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references nanny_orgs(id) on delete cascade,
  client_id         uuid not null references nanny_clients(id) on delete restrict,
  service_type_id   uuid references nanny_service_types(id),
  -- Human-readable reference (e.g. "REF1234")
  reference         text unique not null,
  -- State machine
  booking_state     text not null default 'open'
                      check (booking_state in ('open','matched','scheduled','confirmed','in_progress','completed','cancelled','closed')),
  cancellation_reason text,
  cancelled_at      timestamptz,
  -- Schedule
  scheduled_start   timestamptz not null,
  scheduled_end     timestamptz not null,
  actual_start      timestamptz,
  actual_end        timestamptz,
  -- Location
  service_address   text not null,
  location_notes    text,
  -- Service details
  service_notes     text,
  special_requirements jsonb not null default '{}'::jsonb,    -- children details, specific needs, etc.
  -- Financial
  quoted_rate       numeric(8,2),
  quoted_hours      numeric(4,1),
  is_emergency      boolean not null default false,
  -- Metadata
  source            text not null default 'direct'
                      check (source in ('direct','widget','admin','api')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index nanny_bookings_org_idx on nanny_bookings(org_id);
create index nanny_bookings_client_idx on nanny_bookings(client_id);
create index nanny_bookings_state_idx on nanny_bookings(org_id, booking_state);
create index nanny_bookings_schedule_idx on nanny_bookings(org_id, scheduled_start);
create index nanny_bookings_reference_idx on nanny_bookings(reference);

-- Sequence for generating human-readable booking references
create sequence nanny_booking_ref_seq start 1000;

-- ────────────────────────────────────────────────────────────
-- ASSIGNMENTS (Worker–Booking junction with state machine)
-- State: proposed → worker_accepted → client_confirmed →
--        in_progress → completed | cancelled
-- ────────────────────────────────────────────────────────────
create table nanny_assignments (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references nanny_bookings(id) on delete cascade,
  worker_id         uuid not null references nanny_workers(id) on delete restrict,
  org_id            uuid not null references nanny_orgs(id),
  -- State machine
  assignment_state  text not null default 'proposed'
                      check (assignment_state in ('proposed','worker_accepted','client_confirmed','in_progress','completed','cancelled','no_show')),
  cancellation_reason text,
  cancelled_at      timestamptz,
  -- Who actioned each transition (for audit trail)
  proposed_by       uuid references profiles(id),
  worker_responded_at timestamptz,
  client_responded_at timestamptz,
  completed_at      timestamptz,
  -- Financial snapshot (locked at time of assignment)
  hourly_rate       numeric(8,2),
  is_emergency      boolean not null default false,
  -- Computed after completion
  hours_worked      numeric(5,2),
  base_amount       numeric(10,2),
  surcharge_amount  numeric(10,2),
  holiday_pay       numeric(10,2),
  total_amount      numeric(10,2),
  -- Worker rating (submitted post-assignment)
  worker_rating     int check (worker_rating between 1 and 5),
  worker_review     text,
  rated_at          timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index nanny_assignments_booking_idx on nanny_assignments(booking_id);
create index nanny_assignments_worker_idx on nanny_assignments(worker_id);
create index nanny_assignments_org_state_idx on nanny_assignments(org_id, assignment_state);

-- ────────────────────────────────────────────────────────────
-- TIME LOGS (Clock-in/out entries for hourly billing)
-- ────────────────────────────────────────────────────────────
create table nanny_time_logs (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references nanny_assignments(id) on delete cascade,
  worker_id       uuid not null references nanny_workers(id),
  -- Clock events
  clocked_in_at   timestamptz,
  clocked_out_at  timestamptz,
  -- Override by admin (if worker forgot to log)
  is_manual_entry boolean not null default false,
  entered_by      uuid references profiles(id),
  -- Computed duration (minutes)
  duration_minutes int generated always as (
    case when clocked_in_at is not null and clocked_out_at is not null
    then extract(epoch from (clocked_out_at - clocked_in_at))::int / 60
    else null end
  ) stored,
  notes           text,
  created_at      timestamptz not null default now()
);

create index nanny_time_logs_assignment_idx on nanny_time_logs(assignment_id);

-- ────────────────────────────────────────────────────────────
-- INVOICES (Financial records)
-- ────────────────────────────────────────────────────────────
create table nanny_invoices (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references nanny_orgs(id) on delete cascade,
  client_id       uuid not null references nanny_clients(id) on delete restrict,
  assignment_id   uuid references nanny_assignments(id),
  -- Invoice reference (human-readable)
  invoice_number  text unique not null,
  -- State machine
  invoice_state   text not null default 'draft'
                    check (invoice_state in ('draft','sent','viewed','paid','overdue','voided','disputed')),
  -- Amounts
  subtotal        numeric(10,2) not null default 0,
  tax_rate        numeric(5,4) not null default 0,
  tax_amount      numeric(10,2) not null default 0,
  total           numeric(10,2) not null default 0,
  currency        text not null default 'KES',
  -- Payment
  payment_method  text,
  payment_reference text,
  paid_at         timestamptz,
  -- Tokenized payment link for anon clients
  payment_token   text unique,
  payment_token_expires timestamptz,
  -- Dates
  issued_at       timestamptz not null default now(),
  due_at          timestamptz not null default (now() + interval '7 days'),
  -- Notes
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create sequence nanny_invoice_num_seq start 1000;

create index nanny_invoices_org_idx on nanny_invoices(org_id);
create index nanny_invoices_client_idx on nanny_invoices(client_id);
create index nanny_invoices_state_idx on nanny_invoices(org_id, invoice_state);
create index nanny_invoices_payment_token_idx on nanny_invoices(payment_token) where payment_token is not null;

-- ────────────────────────────────────────────────────────────
-- INVOICE ITEMS (Line items)
-- ────────────────────────────────────────────────────────────
create table nanny_invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references nanny_invoices(id) on delete cascade,
  description text not null,
  quantity    numeric(8,2) not null default 1,
  unit_price  numeric(10,2) not null,
  line_total  numeric(10,2) generated always as (quantity * unit_price) stored,
  sort_order  int not null default 0
);

create index nanny_invoice_items_invoice_idx on nanny_invoice_items(invoice_id);

-- ────────────────────────────────────────────────────────────
-- RATINGS (Worker ratings submitted by clients)
-- ────────────────────────────────────────────────────────────
create table nanny_ratings (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references nanny_orgs(id) on delete cascade,
  assignment_id uuid not null unique references nanny_assignments(id) on delete cascade,
  worker_id     uuid not null references nanny_workers(id) on delete cascade,
  client_id     uuid not null references nanny_clients(id),
  -- Rating data
  overall       int not null check (overall between 1 and 5),
  -- Dimension ratings (stored as JSONB for flexibility)
  dimensions    jsonb not null default '{}'::jsonb,
  -- {"punctuality": 5, "reliability": 4, "care_quality": 5}
  review_text   text,
  -- Client identity for display
  reviewer_name text,
  -- Whether rating is public (worker can hide on Case portfolio)
  is_public     boolean not null default true,
  -- Sync to Case Portfolio
  case_proof_item_id uuid references proof_items(id),
  created_at    timestamptz not null default now()
);

create index nanny_ratings_worker_idx on nanny_ratings(worker_id);
create index nanny_ratings_org_idx on nanny_ratings(org_id);

-- ────────────────────────────────────────────────────────────
-- NOTIFICATIONS (Outbound notification queue)
-- ────────────────────────────────────────────────────────────
create table nanny_notifications (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references nanny_orgs(id) on delete cascade,
  -- Recipient: either a worker or a client (or both via booking)
  worker_id       uuid references nanny_workers(id),
  client_id       uuid references nanny_clients(id),
  -- Notification content
  type            text not null,
  -- e.g. "booking_confirmed","assignment_proposed","invoice_sent","credential_expiring"
  channel         text not null default 'email'
                    check (channel in ('email','sms','push','in_app')),
  subject         text,
  body            text not null,
  -- Delivery
  status          text not null default 'pending'
                    check (status in ('pending','sent','delivered','failed')),
  sent_at         timestamptz,
  -- Reference for context
  reference_type  text,                                        -- 'booking','assignment','invoice','credential'
  reference_id    uuid,
  created_at      timestamptz not null default now()
);

create index nanny_notifications_org_idx on nanny_notifications(org_id);
create index nanny_notifications_status_idx on nanny_notifications(status) where status = 'pending';

-- ────────────────────────────────────────────────────────────
-- ORG INVITATIONS (For staff/worker onboarding)
-- ────────────────────────────────────────────────────────────
create table nanny_invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references nanny_orgs(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('admin','worker','client')),
  invited_by  uuid references profiles(id),
  token       text unique not null default '',  -- set via trigger
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

create index nanny_invitations_org_idx on nanny_invitations(org_id);
create index nanny_invitations_token_idx on nanny_invitations(token);
create index nanny_invitations_email_idx on nanny_invitations(org_id, email);

-- ────────────────────────────────────────────────────────────
-- ORG MEMBERS (Admins and dispatchers)
-- Workers are in nanny_workers, this is for agency staff.
-- ────────────────────────────────────────────────────────────
create table nanny_org_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references nanny_orgs(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  role        text not null check (role in ('owner','admin','dispatcher')),
  created_at  timestamptz not null default now(),
  unique (org_id, profile_id)
);

create index nanny_org_members_org_idx on nanny_org_members(org_id);
create index nanny_org_members_profile_idx on nanny_org_members(profile_id);

-- ────────────────────────────────────────────────────────────
-- TRIGGERS: Updated_at maintenance
-- ────────────────────────────────────────────────────────────
create or replace function nanny_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger nanny_orgs_updated_at
  before update on nanny_orgs
  for each row execute function nanny_set_updated_at();

create trigger nanny_workers_updated_at
  before update on nanny_workers
  for each row execute function nanny_set_updated_at();

create trigger nanny_clients_updated_at
  before update on nanny_clients
  for each row execute function nanny_set_updated_at();

create trigger nanny_bookings_updated_at
  before update on nanny_bookings
  for each row execute function nanny_set_updated_at();

create trigger nanny_assignments_updated_at
  before update on nanny_assignments
  for each row execute function nanny_set_updated_at();

create trigger nanny_worker_creds_updated_at
  before update on nanny_worker_credentials
  for each row execute function nanny_set_updated_at();

create trigger nanny_invoices_updated_at
  before update on nanny_invoices
  for each row execute function nanny_set_updated_at();

-- ────────────────────────────────────────────────────────────
-- BOOKING REFERENCE GENERATOR
-- ────────────────────────────────────────────────────────────
create or replace function nanny_generate_booking_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := 'NB-' || to_char(nextval('nanny_booking_ref_seq'), 'FM0000');
  end if;
  return new;
end;
$$;

create trigger nanny_bookings_set_reference
  before insert on nanny_bookings
  for each row execute function nanny_generate_booking_reference();

-- ────────────────────────────────────────────────────────────
-- INVOICE NUMBER GENERATOR
-- ────────────────────────────────────────────────────────────
create or replace function nanny_generate_invoice_number()
returns trigger language plpgsql as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || to_char(nextval('nanny_invoice_num_seq'), 'FM0000');
  end if;
  return new;
end;
$$;

create trigger nanny_invoices_set_number
  before insert on nanny_invoices
  for each row execute function nanny_generate_invoice_number();

-- ────────────────────────────────────────────────────────────
-- INVITATION TOKEN GENERATOR
-- ────────────────────────────────────────────────────────────
create or replace function nanny_generate_invitation_token()
returns trigger language plpgsql as $$
begin
  if new.token is null or new.token = '' then
    new.token := encode(gen_random_bytes(32), 'hex');
  end if;
  return new;
end;
$$;

create trigger nanny_invitations_set_token
  before insert on nanny_invitations
  for each row execute function nanny_generate_invitation_token();

-- ────────────────────────────────────────────────────────────
-- COMPUTED VIEWS
-- ────────────────────────────────────────────────────────────

-- Worker compliance view: who's missing which credentials
create or replace view nanny_worker_compliance as
select
  w.id as worker_id,
  w.org_id,
  coalesce(p.display_name, w.shadow_name) as worker_name,
  w.worker_state,
  w.role_type,
  ct.id as credential_type_id,
  ct.code,
  ct.name as credential_name,
  ct.is_required,
  wc.id as credential_id,
  wc.status as credential_status,
  wc.expiry_date,
  case
    when wc.id is null then 'missing'
    when wc.status = 'expired' then 'expired'
    when wc.status = 'revoked' then 'revoked'
    when wc.status = 'rejected' then 'rejected'
    when wc.status = 'pending' then 'pending_review'
    when wc.expiry_date < now() + interval '30 days' then 'expiring_soon'
    else 'ok'
  end as compliance_status
from nanny_workers w
join nanny_orgs o on o.id = w.org_id
join nanny_credential_types ct on ct.org_id = w.org_id and not ct.is_archived
left join nanny_worker_credentials wc on wc.worker_id = w.id
  and wc.credential_type_id = ct.id
  and wc.status in ('approved','pending')
left join profiles p on p.id = w.profile_id
order by w.id, ct.sort_order;

-- Assignment + booking summary view for admin dashboard
create or replace view nanny_assignment_summary as
select
  a.id as assignment_id,
  a.org_id,
  a.booking_id,
  b.reference as booking_reference,
  b.scheduled_start,
  b.scheduled_end,
  b.service_address,
  a.assignment_state,
  a.worker_id,
  coalesce(p.display_name, w.shadow_name) as worker_name,
  p.avatar_url as worker_avatar,
  a.hours_worked,
  a.total_amount,
  a.worker_rating,
  b.client_id,
  c.client_name,
  c.client_phone,
  st.name as service_type_name,
  b.is_emergency,
  b.created_at as booking_created_at
from nanny_assignments a
join nanny_bookings b on b.id = a.booking_id
join nanny_workers w on w.id = a.worker_id
join nanny_clients c on c.id = b.client_id
left join profiles p on p.id = w.profile_id
left join nanny_service_types st on st.id = b.service_type_id;

-- ────────────────────────────────────────────────────────────
-- RPC FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Create an anon booking (no auth required)
create or replace function nanny_create_anon_booking(
  p_org_slug      text,
  p_client_name   text,
  p_client_email  text,
  p_client_phone  text,
  p_service_code  text,
  p_start         timestamptz,
  p_end_time      timestamptz,
  p_address       text,
  p_notes         text default null,
  p_special       jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_org           nanny_orgs;
  v_service       nanny_service_types;
  v_client_id     uuid;
  v_anon_token    text;
  v_booking_id    uuid;
  v_reference     text;
begin
  -- Validate org
  select * into v_org from nanny_orgs where slug = p_org_slug and status = 'active';
  if not found then
    raise exception 'Agency not found or inactive';
  end if;

  -- Validate service type
  select * into v_service from nanny_service_types
  where org_id = v_org.id and code = p_service_code and is_active = true;
  if not found then
    raise exception 'Service type not found';
  end if;

  -- Create or find client (dedup by email within org)
  if p_client_email is not null then
    select id into v_client_id from nanny_clients
    where org_id = v_org.id and client_email = p_client_email
    limit 1;
  end if;

  if v_client_id is null then
    v_anon_token := encode(gen_random_bytes(24), 'hex');
    insert into nanny_clients (org_id, client_name, client_email, client_phone, anon_token)
    values (v_org.id, p_client_name, p_client_email, p_client_phone, v_anon_token)
    returning id into v_client_id;
  end if;

  -- Create booking
  insert into nanny_bookings (
    org_id, client_id, service_type_id,
    scheduled_start, scheduled_end,
    service_address, service_notes,
    special_requirements, source
  )
  values (
    v_org.id, v_client_id, v_service.id,
    p_start, p_end_time,
    p_address, p_notes,
    p_special, 'widget'
  )
  returning id, reference into v_booking_id, v_reference;

  return jsonb_build_object(
    'booking_id', v_booking_id,
    'reference', v_reference,
    'anon_token', v_anon_token,
    'client_id', v_client_id
  );
end;
$$;

-- Track booking by anon token (for status page without login)
create or replace function nanny_get_booking_by_token(p_anon_token text)
returns jsonb
language plpgsql security definer
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'booking', row_to_json(b.*),
    'client', row_to_json(c.*),
    'service', row_to_json(st.*),
    'assignments', coalesce(jsonb_agg(jsonb_build_object(
      'assignment_state', a.assignment_state,
      'worker_name', coalesce(p.display_name, w.shadow_name),
      'worker_avatar', p.avatar_url,
      'scheduled_start', b.scheduled_start,
      'scheduled_end', b.scheduled_end
    )) filter (where a.id is not null), '[]'::jsonb)
  )
  into v_result
  from nanny_clients c
  join nanny_bookings b on b.client_id = c.id
  join nanny_orgs o on o.id = c.org_id
  left join nanny_service_types st on st.id = b.service_type_id
  left join nanny_assignments a on a.booking_id = b.id
    and a.assignment_state not in ('cancelled')
  left join nanny_workers w on w.id = a.worker_id
  left join profiles p on p.id = w.profile_id
  where c.anon_token = p_anon_token
  group by b.id, c.id, st.id, o.id;

  return v_result;
end;
$$;

-- Worker claim shadow profile
create or replace function nanny_claim_shadow_worker(
  p_claim_token text,
  p_profile_id  uuid
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_worker nanny_workers;
begin
  select * into v_worker from nanny_workers
  where claim_token = p_claim_token
    and claim_token_expires > now();

  if not found then
    raise exception 'Invalid or expired claim token';
  end if;

  update nanny_workers
  set profile_id = p_profile_id,
      claim_token = null,
      claim_token_expires = null,
      worker_state = 'applicant',
      updated_at = now()
  where id = v_worker.id;

  return jsonb_build_object('worker_id', v_worker.id, 'org_id', v_worker.org_id);
end;
$$;

-- Complete assignment and compute financials
create or replace function nanny_complete_assignment(
  p_assignment_id   uuid,
  p_clocked_out_at  timestamptz default now()
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_assignment  nanny_assignments;
  v_booking     nanny_bookings;
  v_org         nanny_orgs;
  v_hours       numeric;
  v_base        numeric;
  v_surcharge   numeric;
  v_holiday_pay numeric;
  v_total       numeric;
  v_emergency_pct numeric;
  v_holiday_rate  numeric;
begin
  select a.*, b.scheduled_start, b.scheduled_end, b.is_emergency
  into v_assignment
  from nanny_assignments a
  join nanny_bookings b on b.id = a.booking_id
  where a.id = p_assignment_id
    and a.assignment_state = 'in_progress';

  if not found then
    raise exception 'Assignment not found or not in progress';
  end if;

  select * into v_org from nanny_orgs where id = v_assignment.org_id;
  select * into v_booking from nanny_bookings where id = v_assignment.booking_id;

  -- Update time log
  update nanny_time_logs
  set clocked_out_at = p_clocked_out_at
  where assignment_id = p_assignment_id
    and clocked_out_at is null;

  -- Calculate hours from time logs
  select coalesce(sum(duration_minutes), 0) / 60.0
  into v_hours
  from nanny_time_logs
  where assignment_id = p_assignment_id
    and duration_minutes is not null;

  -- Get policy values
  v_emergency_pct := coalesce((v_org.policy->>'emergency_surcharge_pct')::numeric, 20);
  v_holiday_rate := coalesce((v_org.policy->>'holiday_pay_rate')::numeric, 0.1207);

  -- Compute financials
  v_base := v_hours * coalesce(v_assignment.hourly_rate, 0);
  v_surcharge := case when v_assignment.is_emergency then v_base * (v_emergency_pct / 100) else 0 end;
  v_holiday_pay := (v_base + v_surcharge) * v_holiday_rate;
  v_total := v_base + v_surcharge + v_holiday_pay;

  -- Update assignment
  update nanny_assignments
  set assignment_state  = 'completed',
      completed_at      = now(),
      hours_worked      = v_hours,
      base_amount       = v_base,
      surcharge_amount  = v_surcharge,
      holiday_pay       = v_holiday_pay,
      total_amount      = v_total,
      updated_at        = now()
  where id = p_assignment_id;

  -- Update booking state
  update nanny_bookings
  set booking_state = 'completed',
      actual_end    = p_clocked_out_at,
      updated_at    = now()
  where id = v_assignment.booking_id;

  -- Auto-create invoice if policy says so
  if (v_org.policy->>'auto_invoice')::boolean then
    perform nanny_create_post_assignment_invoice(p_assignment_id);
  end if;

  return jsonb_build_object(
    'hours_worked', v_hours,
    'base_amount', v_base,
    'surcharge_amount', v_surcharge,
    'holiday_pay', v_holiday_pay,
    'total_amount', v_total
  );
end;
$$;

-- Auto-create invoice from completed assignment
create or replace function nanny_create_post_assignment_invoice(p_assignment_id uuid)
returns uuid
language plpgsql security definer
as $$
declare
  v_a    nanny_assignments;
  v_b    nanny_bookings;
  v_inv  uuid;
  v_token text;
begin
  select a.*, b.client_id, b.service_type_id
  into v_a
  from nanny_assignments a
  join nanny_bookings b on b.id = a.booking_id
  where a.id = p_assignment_id;

  select * into v_b from nanny_bookings where id = v_a.booking_id;

  v_token := encode(gen_random_bytes(24), 'hex');

  -- Create invoice
  insert into nanny_invoices (
    org_id, client_id, assignment_id,
    invoice_state,
    subtotal, total,
    payment_token, payment_token_expires
  )
  values (
    v_a.org_id,
    v_b.client_id,
    p_assignment_id,
    'sent',
    v_a.total_amount, v_a.total_amount,
    v_token, now() + interval '30 days'
  )
  returning id into v_inv;

  -- Create line items
  if v_a.base_amount > 0 then
    insert into nanny_invoice_items (invoice_id, description, quantity, unit_price, sort_order)
    values (v_inv, 'Service hours (' || v_a.hours_worked || 'h × ' || v_a.hourly_rate || ')', v_a.hours_worked, v_a.hourly_rate, 1);
  end if;

  if v_a.surcharge_amount > 0 then
    insert into nanny_invoice_items (invoice_id, description, quantity, unit_price, sort_order)
    values (v_inv, 'Emergency surcharge', 1, v_a.surcharge_amount, 2);
  end if;

  if v_a.holiday_pay > 0 then
    insert into nanny_invoice_items (invoice_id, description, quantity, unit_price, sort_order)
    values (v_inv, 'Holiday pay (12.07%)', 1, v_a.holiday_pay, 3);
  end if;

  return v_inv;
end;
$$;

-- Update worker average rating after new rating
create or replace function nanny_refresh_worker_rating()
returns trigger language plpgsql as $$
begin
  update nanny_workers
  set avg_rating = (
    select round(avg(overall)::numeric, 2)
    from nanny_ratings
    where worker_id = new.worker_id
  ),
  total_assignments = (
    select count(*)
    from nanny_assignments
    where worker_id = new.worker_id
      and assignment_state = 'completed'
  ),
  updated_at = now()
  where id = new.worker_id;
  return new;
end;
$$;

create trigger nanny_ratings_refresh_worker
  after insert or update on nanny_ratings
  for each row execute function nanny_refresh_worker_rating();

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

alter table nanny_orgs enable row level security;
alter table nanny_credential_types enable row level security;
alter table nanny_service_types enable row level security;
alter table nanny_workers enable row level security;
alter table nanny_worker_credentials enable row level security;
alter table nanny_clients enable row level security;
alter table nanny_bookings enable row level security;
alter table nanny_assignments enable row level security;
alter table nanny_time_logs enable row level security;
alter table nanny_invoices enable row level security;
alter table nanny_invoice_items enable row level security;
alter table nanny_ratings enable row level security;
alter table nanny_notifications enable row level security;
alter table nanny_invitations enable row level security;
alter table nanny_org_members enable row level security;

-- Helper function: check if current user is a member of org
create or replace function nanny_is_org_member(p_org_id uuid, p_role text default null)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from nanny_org_members m
    join profiles p on p.id = m.profile_id
    where m.org_id = p_org_id
      and p.owner_id = auth.uid()
      and (p_role is null or m.role = p_role or m.role = 'owner')
  )
  or exists (
    -- org owner via profiles table
    select 1 from nanny_orgs o
    join profiles p on p.id = o.owner_profile_id
    where o.id = p_org_id
      and p.owner_id = auth.uid()
  );
$$;

-- Helper: check if current user is the worker
create or replace function nanny_is_worker(p_worker_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from nanny_workers w
    join profiles p on p.id = w.profile_id
    where w.id = p_worker_id
      and p.owner_id = auth.uid()
  );
$$;

-- ORGS: Public read for is_public orgs; write for org owner
create policy "nanny_orgs_public_read" on nanny_orgs
  for select using (is_public = true);

create policy "nanny_orgs_member_read" on nanny_orgs
  for select using (nanny_is_org_member(id));

create policy "nanny_orgs_owner_write" on nanny_orgs
  for all using (
    exists (
      select 1 from profiles p
      where p.id = owner_profile_id and p.owner_id = auth.uid()
    )
  );

-- CREDENTIAL TYPES: public read, org member write
create policy "nanny_cred_types_public_read" on nanny_credential_types
  for select using (
    exists (select 1 from nanny_orgs o where o.id = org_id and o.is_public)
  );

create policy "nanny_cred_types_member_write" on nanny_credential_types
  for all using (nanny_is_org_member(org_id));

-- SERVICE TYPES: public read
create policy "nanny_svc_types_public_read" on nanny_service_types
  for select using (
    exists (select 1 from nanny_orgs o where o.id = org_id and o.is_public)
    and is_active = true
  );

create policy "nanny_svc_types_member_write" on nanny_service_types
  for all using (nanny_is_org_member(org_id));

-- WORKERS: org member read all, worker read self
create policy "nanny_workers_member_read" on nanny_workers
  for select using (nanny_is_org_member(org_id));

create policy "nanny_workers_self_read" on nanny_workers
  for select using (nanny_is_worker(id));

create policy "nanny_workers_member_write" on nanny_workers
  for all using (nanny_is_org_member(org_id));

-- WORKER CREDENTIALS: org member or self
create policy "nanny_worker_creds_access" on nanny_worker_credentials
  for all using (
    nanny_is_org_member((select org_id from nanny_workers where id = worker_id))
    or nanny_is_worker(worker_id)
  );

-- CLIENTS: org member only
create policy "nanny_clients_member_access" on nanny_clients
  for all using (nanny_is_org_member(org_id));

-- BOOKINGS: org member or owner client
create policy "nanny_bookings_member_access" on nanny_bookings
  for all using (nanny_is_org_member(org_id));

-- ASSIGNMENTS: org member or assigned worker
create policy "nanny_assignments_member_access" on nanny_assignments
  for all using (
    nanny_is_org_member(org_id)
    or nanny_is_worker(worker_id)
  );

-- TIME LOGS: via assignment access
create policy "nanny_time_logs_access" on nanny_time_logs
  for all using (
    nanny_is_org_member((select org_id from nanny_assignments where id = assignment_id))
    or nanny_is_worker(worker_id)
  );

-- INVOICES: org member
create policy "nanny_invoices_member_access" on nanny_invoices
  for all using (nanny_is_org_member(org_id));

-- INVOICE ITEMS: via invoice
create policy "nanny_invoice_items_access" on nanny_invoice_items
  for all using (
    nanny_is_org_member((select org_id from nanny_invoices where id = invoice_id))
  );

-- RATINGS: org member or worker self
create policy "nanny_ratings_access" on nanny_ratings
  for all using (
    nanny_is_org_member(org_id)
    or nanny_is_worker(worker_id)
  );

create policy "nanny_ratings_public_read" on nanny_ratings
  for select using (is_public = true);

-- NOTIFICATIONS: org member
create policy "nanny_notifications_member_access" on nanny_notifications
  for all using (nanny_is_org_member(org_id));

-- INVITATIONS: org member (for admin); token-based for recipient
create policy "nanny_invitations_member_access" on nanny_invitations
  for all using (nanny_is_org_member(org_id));

-- ORG MEMBERS: org admin
create policy "nanny_org_members_access" on nanny_org_members
  for all using (nanny_is_org_member(org_id));

-- ────────────────────────────────────────────────────────────
-- SEED: Default credential types for nanny vertical
-- These are pre-seeded per-org on org creation via a function
-- ────────────────────────────────────────────────────────────
create or replace function nanny_seed_org_defaults(p_org_id uuid, p_vertical text default 'nanny')
returns void
language plpgsql security definer
as $$
begin
  if p_vertical in ('nanny','both') then
    insert into nanny_credential_types (org_id, code, name, description, issuing_body, requires_expiry, default_validity_days, is_required, sort_order)
    values
      (p_org_id, 'enhanced_dbs', 'Enhanced DBS Check', 'Enhanced Disclosure and Barring Service certificate', 'DBS', true, 1095, true, 1),
      (p_org_id, 'paediatric_first_aid', 'Paediatric First Aid', 'First aid certificate specifically for children', 'Various', true, 1095, true, 2),
      (p_org_id, 'first_aid_work', 'First Aid at Work', 'Standard first aid qualification for workplace', 'HSE', true, 1095, false, 3),
      (p_org_id, 'cpr', 'CPR Certification', 'Cardiopulmonary Resuscitation training', 'Various', true, 730, false, 4),
      (p_org_id, 'nvq_level3', 'NVQ Level 3 (Childcare)', 'NVQ Level 3 in Children and Young People Workforce', 'Ofqual', false, null, false, 5),
      (p_org_id, 'safeguarding', 'Safeguarding Training', 'Child safeguarding awareness training', 'NSPCC/Various', true, 730, true, 6),
      (p_org_id, 'ofsted', 'Ofsted Registration', 'Registration with Ofsted for childcare', 'Ofsted', true, 365, false, 7),
      (p_org_id, 'right_to_work', 'Right to Work', 'Proof of legal right to work in the country', 'UKVI/Gov', false, null, true, 8)
    on conflict (org_id, code) do nothing;
  end if;

  if p_vertical in ('cleaning','both') then
    insert into nanny_credential_types (org_id, code, name, description, issuing_body, requires_expiry, default_validity_days, is_required, sort_order)
    values
      (p_org_id, 'basic_dbs', 'Basic DBS Check', 'Basic Disclosure and Barring Service certificate', 'DBS', true, 1095, true, 1),
      (p_org_id, 'coshh', 'COSHH Training', 'Control of Substances Hazardous to Health', 'HSE', true, 365, true, 2),
      (p_org_id, 'manual_handling', 'Manual Handling', 'Safe manual handling and lifting certificate', 'Various', true, 730, false, 3),
      (p_org_id, 'carpet_cleaning', 'Carpet Cleaning Certificate', 'Professional carpet and upholstery cleaning', 'NCCA', false, null, false, 4),
      (p_org_id, 'commercial_cleaning', 'Commercial Cleaning', 'Professional commercial/office cleaning qualification', 'BICS', false, null, false, 5)
    on conflict (org_id, code) do nothing;
  end if;

  -- Seed service types
  if p_vertical in ('nanny','both') then
    insert into nanny_service_types (org_id, code, name, description, vertical, pricing_model, base_rate, min_hours, required_credentials, sort_order)
    values
      (p_org_id, 'daily_nanny', 'Daily Nanny', 'Daytime childcare in client home', 'nanny', 'hourly', 15.00, 4, '{enhanced_dbs,paediatric_first_aid,safeguarding}', 1),
      (p_org_id, 'live_in_nanny', 'Live-In Nanny', 'Full-time live-in childcare', 'nanny', 'hourly', 12.50, 40, '{enhanced_dbs,paediatric_first_aid,safeguarding,nvq_level3}', 2),
      (p_org_id, 'overnight', 'Overnight Care', 'Overnight childcare and supervision', 'nanny', 'flat_rate', 120.00, 8, '{enhanced_dbs,paediatric_first_aid}', 3),
      (p_org_id, 'emergency_cover', 'Emergency Cover', 'Same-day or next-day emergency childcare', 'nanny', 'hourly', 18.00, 2, '{enhanced_dbs,paediatric_first_aid,safeguarding}', 4),
      (p_org_id, 'maternity_nurse', 'Maternity Nurse', 'Newborn care specialist, days and nights', 'nanny', 'hourly', 22.00, 8, '{enhanced_dbs,paediatric_first_aid,first_aid_work,cpr}', 5),
      (p_org_id, 'after_school', 'After-School Care', 'School pick-up and afternoon childcare', 'nanny', 'hourly', 14.00, 2, '{enhanced_dbs,safeguarding}', 6),
      (p_org_id, 'holiday_cover', 'Holiday Cover', 'School holiday childcare', 'nanny', 'hourly', 15.00, 4, '{enhanced_dbs,paediatric_first_aid,safeguarding}', 7),
      (p_org_id, 'elderly_care', 'Elderly Care', 'Companionship and care for elderly clients', 'nanny', 'hourly', 14.00, 3, '{enhanced_dbs,first_aid_work,cpr}', 8)
    on conflict (org_id, code) do nothing;
  end if;

  if p_vertical in ('cleaning','both') then
    insert into nanny_service_types (org_id, code, name, description, vertical, pricing_model, base_rate, min_hours, required_credentials, sort_order)
    values
      (p_org_id, 'regular_domestic', 'Regular Domestic', 'Recurring weekly or fortnightly home cleaning', 'cleaning', 'hourly', 12.00, 2, '{basic_dbs,coshh}', 1),
      (p_org_id, 'deep_clean', 'Deep Clean', 'Thorough one-off deep clean of property', 'cleaning', 'quoted', null, 4, '{basic_dbs,coshh}', 2),
      (p_org_id, 'end_of_tenancy', 'End of Tenancy', 'Move-out clean to deposit-return standard', 'cleaning', 'quoted', null, 6, '{basic_dbs,coshh}', 3),
      (p_org_id, 'carpet_clean', 'Carpet Clean', 'Professional steam/dry carpet cleaning', 'cleaning', 'quoted', null, 2, '{basic_dbs,coshh,carpet_cleaning}', 4),
      (p_org_id, 'commercial', 'Commercial/Office', 'Regular commercial premises cleaning', 'cleaning', 'hourly', 14.00, 3, '{basic_dbs,coshh,commercial_cleaning}', 5),
      (p_org_id, 'holiday_let', 'Holiday Let Turnaround', 'Fast turnaround cleaning for Airbnb/holiday lets', 'cleaning', 'flat_rate', 80.00, 2, '{basic_dbs,coshh}', 6)
    on conflict (org_id, code) do nothing;
  end if;
end;
$$;

-- Trigger to seed defaults when org is created
create or replace function nanny_on_org_created()
returns trigger language plpgsql as $$
begin
  -- Add owner as org member
  insert into nanny_org_members (org_id, profile_id, role)
  values (new.id, new.owner_profile_id, 'owner')
  on conflict do nothing;

  -- Seed default credential types and service types
  perform nanny_seed_org_defaults(new.id, new.vertical);

  return new;
end;
$$;

create trigger nanny_orgs_after_insert
  after insert on nanny_orgs
  for each row execute function nanny_on_org_created();
