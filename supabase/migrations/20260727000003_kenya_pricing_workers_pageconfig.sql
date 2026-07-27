-- ============================================================
-- MIGRATION 3: Kenya Pricing Models, Page Config & Worker Browsing
-- 20260727000003_kenya_pricing_workers_pageconfig.sql
-- ============================================================

-- 1. Expand pricing_model to include Kenya-standard billing periods
alter table nanny_service_types drop constraint if exists nanny_service_types_pricing_model_check;
alter table nanny_service_types add constraint nanny_service_types_pricing_model_check
  check (pricing_model in ('hourly', 'per_day', 'per_task', 'per_week', 'per_month', 'per_shift', 'flat_rate', 'quoted'));

-- Default to per_day for new services (most common in Kenya)
alter table nanny_service_types alter column pricing_model set default 'per_day';

-- min_hours column repurposed as min_duration (the unit depends on pricing_model)
-- We add a min_duration_label column for display purposes
alter table nanny_service_types add column if not exists duration_unit text
  check (duration_unit in ('hour', 'day', 'week', 'month', 'task', 'shift'))
  default 'day';

-- 2. Add page_config JSONB to nanny_orgs for public page customization
alter table nanny_orgs add column if not exists page_config jsonb not null default '{
  "hero_headline": null,
  "hero_subtitle": null,
  "pitch_title": "Why choose us?",
  "pitch_body": null,
  "pitch_bullets": [],
  "show_services": true,
  "show_workers": true,
  "show_testimonials": false,
  "cta_text": "Book Now",
  "cta_subtext": "No account required. Quick & easy.",
  "accent_color": null,
  "hero_pattern": "dots",
  "stats": []
}'::jsonb;

-- 3. Track requested worker on bookings
alter table nanny_bookings add column if not exists requested_worker_id uuid
  references nanny_workers(id) on delete set null;

-- 4. Track pricing unit actually used for a booking
alter table nanny_bookings add column if not exists pricing_unit text
  check (pricing_unit in ('hour', 'day', 'week', 'month', 'task', 'shift', 'flat'));

-- 5. Let workers opt in/out of public profile listing
alter table nanny_workers add column if not exists show_on_public boolean not null default true;

-- 6. Update service seed defaults to Kenya pricing models
create or replace function nanny_seed_org_defaults(p_org_id uuid, p_vertical text default 'caregiving')
returns void
language plpgsql security definer
as $$
begin
  -- Caregiving Credentials (Primary)
  if p_vertical in ('caregiving', 'all') then
    insert into nanny_credential_types (org_id, code, name, description, issuing_body, requires_expiry, default_validity_days, is_required, sort_order)
    values
      (p_org_id, 'health_social_care', 'NVQ Health & Social Care', 'NVQ Level 2/3 Diploma in Health and Social Care', 'Ofqual/City&Guilds', false, null, true, 1),
      (p_org_id, 'elder_care_cert', 'Elderly & Senior Care Cert', 'Specialized geriatric care and mobility training certificate', 'Red Cross/Various', true, 1095, true, 2),
      (p_org_id, 'dementia_care', 'Dementia & Memory Care', 'Certified training for Alzheimer''s and dementia care', 'Alzheimer Society', true, 1095, false, 3),
      (p_org_id, 'med_admin', 'Medication Administration', 'Safe handling and administration of prescribed medication', 'NHS/HSE', true, 730, true, 4),
      (p_org_id, 'caregiver_dbs', 'Enhanced DBS (Adult & Child Check)', 'Enhanced DBS with Barred Lists check for vulnerable adults', 'DBS', true, 1095, true, 5),
      (p_org_id, 'patient_handling', 'Moving & Handling Patients', 'Safe patient transfer and hoist operation certificate', 'Various', true, 730, true, 6)
    on conflict (org_id, code) do nothing;
  end if;

  if p_vertical in ('nanny', 'all', 'caregiving') then
    insert into nanny_credential_types (org_id, code, name, description, issuing_body, requires_expiry, default_validity_days, is_required, sort_order)
    values
      (p_org_id, 'enhanced_dbs', 'Enhanced DBS Check', 'Enhanced Disclosure and Barring Service certificate', 'DBS', true, 1095, true, 10),
      (p_org_id, 'paediatric_first_aid', 'Paediatric First Aid', 'First aid certificate specifically for children', 'Various', true, 1095, true, 11),
      (p_org_id, 'first_aid_work', 'First Aid at Work', 'Standard first aid qualification for workplace', 'HSE', true, 1095, false, 12),
      (p_org_id, 'cpr', 'CPR Certification', 'Cardiopulmonary Resuscitation training', 'Various', true, 730, false, 13),
      (p_org_id, 'nvq_level3', 'NVQ Level 3 (Childcare)', 'NVQ Level 3 in Children and Young People Workforce', 'Ofqual', false, null, false, 14),
      (p_org_id, 'safeguarding', 'Safeguarding Training', 'Child safeguarding awareness training', 'NSPCC/Various', true, 730, true, 15)
    on conflict (org_id, code) do nothing;
  end if;

  if p_vertical in ('cleaning', 'all') then
    insert into nanny_credential_types (org_id, code, name, description, issuing_body, requires_expiry, default_validity_days, is_required, sort_order)
    values
      (p_org_id, 'basic_dbs', 'Basic DBS Check', 'Basic Disclosure and Barring Service certificate', 'DBS', true, 1095, true, 20),
      (p_org_id, 'coshh', 'COSHH Training', 'Control of Substances Hazardous to Health', 'HSE', true, 365, true, 21),
      (p_org_id, 'manual_handling', 'Manual Handling', 'Safe manual handling and lifting certificate', 'Various', true, 730, false, 22)
    on conflict (org_id, code) do nothing;
  end if;

  -- ── Services — Kenya pricing models ────────────────────────────────────────
  if p_vertical in ('caregiving', 'all') then
    insert into nanny_service_types (org_id, code, name, description, vertical, pricing_model, duration_unit, base_rate, min_hours, required_credentials, sort_order)
    values
      (p_org_id, 'elderly_care',    'Senior & Elderly Home Care',       'Dedicated daily assistance, companionship, mobility support, and medication management for seniors.',       'caregiving', 'per_day',   'day',   1800.00, 1, '{health_social_care,elder_care_cert,med_admin,caregiver_dbs}', 1),
      (p_org_id, 'patient_care',    'Specialized Patient & Recovery Care', 'Post-operative and chronic illness home care provided by trained caregivers.',                           'caregiving', 'per_day',   'day',   2200.00, 1, '{health_social_care,med_admin,patient_handling,caregiver_dbs}', 2),
      (p_org_id, 'dementia_support','Dementia & Memory Care',           'Specialist support for individuals living with Alzheimer''s or dementia.',                                  'caregiving', 'per_day',   'day',   2500.00, 1, '{health_social_care,dementia_care,caregiver_dbs}', 3),
      (p_org_id, 'companionship',   'Companionship & Assisted Living',  'Social engagement, light meal prep, errand assistance, and home accompaniment.',                           'caregiving', 'per_task',  'task',  800.00,  null, '{caregiver_dbs}', 4),
      (p_org_id, 'live_in_care',    'Live-In Caregiver',                'Full-time live-in caregiving for seniors or recovering patients. Weekly rate.',                            'caregiving', 'per_week',  'week',  12000.00, null, '{health_social_care,caregiver_dbs}', 5)
    on conflict (org_id, code) do nothing;
  end if;

  if p_vertical in ('nanny', 'all', 'caregiving') then
    insert into nanny_service_types (org_id, code, name, description, vertical, pricing_model, duration_unit, base_rate, min_hours, required_credentials, sort_order)
    values
      (p_org_id, 'daily_nanny',    'Daily Nanny',         'Daytime dedicated childcare in client home by verified caregiver.',             'nanny', 'per_day',   'day',   1500.00, 1, '{enhanced_dbs,paediatric_first_aid,safeguarding}', 10),
      (p_org_id, 'live_in_nanny',  'Live-In Nanny',       'Full-time live-in childcare and household support. Monthly rate.',              'nanny', 'per_month', 'month', 35000.00, null, '{enhanced_dbs,paediatric_first_aid,safeguarding}', 11),
      (p_org_id, 'maternity_nurse','Maternity Nurse',      'Specialist newborn care for post-natal support and feeding routines. Per day.', 'nanny', 'per_day',   'day',   2500.00, 1, '{enhanced_dbs,paediatric_first_aid,cpr}', 12),
      (p_org_id, 'overnight_care', 'Overnight Childcare', 'Overnight supervision and baby monitor support. Per night.',                    'nanny', 'per_shift', 'shift', 3000.00, null, '{enhanced_dbs,paediatric_first_aid}', 13)
    on conflict (org_id, code) do nothing;
  end if;

  if p_vertical in ('cleaning', 'all', 'caregiving') then
    insert into nanny_service_types (org_id, code, name, description, vertical, pricing_model, duration_unit, base_rate, min_hours, required_credentials, sort_order)
    values
      (p_org_id, 'regular_domestic','Regular Domestic Cleaning', 'Weekly or fortnightly house cleaning by a background-checked cleaner. Per visit.',   'cleaning', 'per_task',  'task', 1200.00, null, '{basic_dbs,coshh}', 20),
      (p_org_id, 'deep_clean',      'Deep Cleaning & Sanitization', 'Thorough one-off deep clean and sanitization of residential or commercial property.', 'cleaning', 'quoted',    'task', null,    null, '{basic_dbs,coshh}', 21)
    on conflict (org_id, code) do nothing;
  end if;
end;
$$;

-- 7. Update the anon booking RPC to accept optional worker_id
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
  p_special       jsonb default '{}'::jsonb,
  p_worker_id     uuid default null
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
  select * into v_org from nanny_orgs where slug = p_org_slug and status = 'active';
  if not found then
    raise exception 'Agency not found or inactive';
  end if;

  select * into v_service from nanny_service_types
  where org_id = v_org.id and code = p_service_code and is_active = true;
  if not found then
    raise exception 'Service type not found';
  end if;

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

  insert into nanny_bookings (
    org_id, client_id, service_type_id,
    scheduled_start, scheduled_end,
    service_address, service_notes,
    special_requirements, source,
    requested_worker_id,
    pricing_unit
  )
  values (
    v_org.id, v_client_id, v_service.id,
    p_start, p_end_time,
    p_address, p_notes,
    p_special, 'widget',
    p_worker_id,
    coalesce(v_service.duration_unit, 'day')
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
