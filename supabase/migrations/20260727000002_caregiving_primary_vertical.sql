-- ============================================================
-- CARE GIVING PRIMARY VERTICAL & COMPLEMENTARY SERVICES
-- Migration: 20260727000002_caregiving_primary_vertical.sql
-- ============================================================

-- 1. Update check constraints to include 'caregiving' as primary vertical
alter table nanny_orgs drop constraint if exists nanny_orgs_vertical_check;
alter table nanny_orgs add constraint nanny_orgs_vertical_check
  check (vertical in ('caregiving', 'nanny', 'cleaning', 'all'));

alter table nanny_orgs alter column vertical set default 'caregiving';

alter table nanny_credential_types drop constraint if exists nanny_credential_types_vertical_check;
alter table nanny_credential_types add constraint nanny_credential_types_vertical_check
  check (vertical in ('caregiving', 'nanny', 'cleaning', 'all'));

alter table nanny_credential_types alter column vertical set default 'all';

alter table nanny_service_types drop constraint if exists nanny_service_types_vertical_check;
alter table nanny_service_types add constraint nanny_service_types_vertical_check
  check (vertical in ('caregiving', 'nanny', 'cleaning'));

alter table nanny_service_types alter column vertical set default 'caregiving';

alter table nanny_workers drop constraint if exists nanny_workers_role_type_check;
alter table nanny_workers add constraint nanny_workers_role_type_check
  check (role_type in ('caregiver', 'senior_caregiver', 'patient_care', 'nanny', 'cleaner', 'maternity_nurse', 'live_in', 'all'));

alter table nanny_workers alter column role_type set default 'caregiver';

-- 2. Update seed function to include caregiving credentials & services
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

  -- Nanny / Childcare Credentials
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

  -- Cleaning Credentials
  if p_vertical in ('cleaning', 'all') then
    insert into nanny_credential_types (org_id, code, name, description, issuing_body, requires_expiry, default_validity_days, is_required, sort_order)
    values
      (p_org_id, 'basic_dbs', 'Basic DBS Check', 'Basic Disclosure and Barring Service certificate', 'DBS', true, 1095, true, 20),
      (p_org_id, 'coshh', 'COSHH Training', 'Control of Substances Hazardous to Health', 'HSE', true, 365, true, 21),
      (p_org_id, 'manual_handling', 'Manual Handling', 'Safe manual handling and lifting certificate', 'Various', true, 730, false, 22)
    on conflict (org_id, code) do nothing;
  end if;

  -- Caregiving Services (Primary Vertical)
  if p_vertical in ('caregiving', 'all') then
    insert into nanny_service_types (org_id, code, name, description, vertical, pricing_model, base_rate, min_hours, required_credentials, sort_order)
    values
      (p_org_id, 'elderly_care', 'Senior & Elderly Home Care', 'Dedicated daily assistance, companionship, mobility support, and medication management for seniors.', 'caregiving', 'hourly', 16.00, 3, '{health_social_care,elder_care_cert,med_admin,caregiver_dbs}', 1),
      (p_org_id, 'patient_care', 'Specialized Patient & Recovery Care', 'Post-operative and chronic illness home care provided by trained caregivers.', 'caregiving', 'hourly', 18.00, 4, '{health_social_care,med_admin,patient_handling,caregiver_dbs}', 2),
      (p_org_id, 'dementia_support', 'Dementia & Memory Care', 'Specialist support for individuals living with Alzheimer''s or dementia.', 'caregiving', 'hourly', 20.00, 4, '{health_social_care,dementia_care,caregiver_dbs}', 3),
      (p_org_id, 'companionship', 'Companionship & Assisted Living', 'Social engagement, light meal prep, errand assistance, and home accompaniment.', 'caregiving', 'hourly', 14.00, 2, '{caregiver_dbs}', 4)
    on conflict (org_id, code) do nothing;
  end if;

  -- Nanny & Childcare Services (Complementary Vertical)
  if p_vertical in ('nanny', 'all', 'caregiving') then
    insert into nanny_service_types (org_id, code, name, description, vertical, pricing_model, base_rate, min_hours, required_credentials, sort_order)
    values
      (p_org_id, 'daily_nanny', 'Daily Nanny', 'Daytime dedicated childcare in client home by verified caregiver.', 'nanny', 'hourly', 15.00, 4, '{enhanced_dbs,paediatric_first_aid,safeguarding}', 10),
      (p_org_id, 'live_in_nanny', 'Live-In Nanny', 'Full-time live-in childcare and household support.', 'nanny', 'hourly', 12.50, 40, '{enhanced_dbs,paediatric_first_aid,safeguarding}', 11),
      (p_org_id, 'maternity_nurse', 'Maternity Nurse', 'Specialist newborn care for post-natal support and feeding routines.', 'nanny', 'hourly', 22.00, 8, '{enhanced_dbs,paediatric_first_aid,cpr}', 12),
      (p_org_id, 'overnight_care', 'Overnight Childcare', 'Overnight supervision and baby monitor support.', 'nanny', 'flat_rate', 120.00, 8, '{enhanced_dbs,paediatric_first_aid}', 13)
    on conflict (org_id, code) do nothing;
  end if;

  -- Domestic Cleaning Services (Complementary Vertical)
  if p_vertical in ('cleaning', 'all', 'caregiving') then
    insert into nanny_service_types (org_id, code, name, description, vertical, pricing_model, base_rate, min_hours, required_credentials, sort_order)
    values
      (p_org_id, 'regular_domestic', 'Regular Domestic Cleaning', 'Weekly or fortnightly house cleaning by a background-checked cleaner.', 'cleaning', 'hourly', 12.00, 2, '{basic_dbs,coshh}', 20),
      (p_org_id, 'deep_clean', 'Deep Cleaning & Sanitization', 'Thorough one-off deep clean and sanitization of residential or commercial property.', 'cleaning', 'quoted', null, 4, '{basic_dbs,coshh}', 21)
    on conflict (org_id, code) do nothing;
  end if;
end;
$$;
