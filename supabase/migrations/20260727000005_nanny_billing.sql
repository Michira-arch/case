-- Billing Schema for Agencies & Clients

-- Agencies (nanny_orgs) pay the Platform.
ALTER TABLE nanny_orgs
ADD COLUMN billing_plan TEXT DEFAULT 'free',
ADD COLUMN billing_status TEXT DEFAULT 'active',
ADD COLUMN next_billing_date TIMESTAMPTZ,
ADD COLUMN paystack_subaccount_code TEXT;

-- Clients (nanny_clients) pay the Agencies. They can have saved payment methods.
ALTER TABLE nanny_clients
ADD COLUMN paystack_auth_code TEXT, -- To charge the client automatically
ADD COLUMN next_billing_date TIMESTAMPTZ, -- When their recurring bill is due
ADD COLUMN billing_plan TEXT;

-- Subscriptions / Invoices for the platform
CREATE TABLE IF NOT EXISTS nanny_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES nanny_orgs(id) ON DELETE CASCADE,
    client_id UUID REFERENCES nanny_clients(id) ON DELETE CASCADE,
    paystack_auth_code TEXT,
    billing_email TEXT,
    plan TEXT,
    status TEXT,
    next_billing_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
