-- Migration 20260730100000_agency_client_billing.sql

ALTER TABLE nanny_orgs
ADD COLUMN IF NOT EXISTS paystack_auth_code TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT;
