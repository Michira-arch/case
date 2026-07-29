-- Migration 20260729000003_profile_subscriptions.sql

-- A single table where we store the subscription details for a provider's client.
CREATE TABLE IF NOT EXISTS profile_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- The provider with the sub-account
    client_email TEXT NOT NULL,
    client_name TEXT,
    amount_kes NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due
    paystack_auth_code TEXT,
    next_billing_date TIMESTAMPTZ,
    paystack_reference TEXT, -- Initial reference that started this
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note: In a full app, you'd probably let providers define their own plans.
-- For this MVP, we assume the provider configures a flat subscription rate,
-- or we let them pass the amount in the URL, or default to a standard amount.
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_amount_kes NUMERIC DEFAULT 1000,
ADD COLUMN IF NOT EXISTS subscription_interval TEXT DEFAULT 'monthly';
