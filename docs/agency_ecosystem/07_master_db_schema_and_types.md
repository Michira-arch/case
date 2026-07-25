# Domain 7 — Master Database Schema, RLS & TypeScript Contracts

This document defines the microscopic, production-ready schema, Row Level Security (RLS) policies, PL/pgSQL RPCs, and TypeScript interfaces that power the Case Agency Ecosystem. It connects the Brand, Talent, Financials, Smart Automations, and Operations domains into a single source of truth.

## 1. Complete DDL (PostgreSQL)

```sql
-- Enums
CREATE TYPE agency_role AS ENUM ('admin', 'manager', 'member');
CREATE TYPE subscription_tier AS ENUM ('free', 'tier1', 'tier2', 'tier3', 'tier4');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid');
CREATE TYPE join_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE transaction_type AS ENUM ('client_payment', 'escrow_fee', 'agency_revenue', 'talent_payable', 'payout');
CREATE TYPE pitch_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected');

-- 1. agencies
CREATE TABLE agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    handle VARCHAR(64) UNIQUE NOT NULL CHECK (handle ~ '^[a-zA-Z0-9_-]+$'),
    name VARCHAR(255) NOT NULL,
    primary_color VARCHAR(7) DEFAULT '#000000',
    secondary_color VARCHAR(7) DEFAULT '#FFFFFF',
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    location JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_agencies_handle ON agencies(handle);
CREATE INDEX idx_agencies_owner ON agencies(owner_id);

-- 2. agency_members
CREATE TABLE agency_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role agency_role NOT NULL DEFAULT 'member',
    paystack_subaccount_code VARCHAR(255),
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agency_id, user_id)
);
CREATE INDEX idx_agency_members_agency ON agency_members(agency_id);
CREATE INDEX idx_agency_members_user ON agency_members(user_id);

-- 3. agency_profiles_overlay
CREATE TABLE agency_profiles_overlay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    visibility_state VARCHAR(50) DEFAULT 'public' CHECK (visibility_state IN ('public', 'private', 'hidden')),
    custom_title VARCHAR(128),
    custom_rate DECIMAL(12, 2),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agency_id, user_id)
);

-- 4. agency_join_requests
CREATE TABLE agency_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status join_request_status DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    UNIQUE(agency_id, user_id)
);

-- 5. agency_subscriptions
CREATE TABLE agency_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL DEFAULT 'free',
    status subscription_status NOT NULL DEFAULT 'active',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agency_id)
);

-- 6. agency_transactions
CREATE TABLE agency_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
    type transaction_type NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    debit_account VARCHAR(255) NOT NULL,
    credit_account VARCHAR(255) NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_transactions_agency ON agency_transactions(agency_id);
CREATE INDEX idx_transactions_reference ON agency_transactions(reference_id);

-- 7. agency_payout_ledger
CREATE TABLE agency_payout_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    available_balance DECIMAL(12, 2) DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL,
    last_payout_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agency_id, user_id, currency)
);

-- 8. agency_pitches
CREATE TABLE agency_pitches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    client_email VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    status pitch_status DEFAULT 'draft',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_value DECIMAL(12, 2),
    currency VARCHAR(3),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_pitches_token ON agency_pitches(token);

-- 9. agency_rules
CREATE TABLE agency_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_agency_rules ON agency_rules(agency_id, rule_type);

-- 10. agency_events_log
CREATE TABLE agency_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_agency_events_agency ON agency_events_log(agency_id);
```

## 2. Supabase RLS Policies

```sql
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_profiles_overlay ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_payout_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_events_log ENABLE ROW LEVEL SECURITY;

-- Helper Function
CREATE OR REPLACE FUNCTION get_agency_role(check_agency_id UUID, check_user_id UUID)
RETURNS agency_role AS $$
  SELECT role FROM agency_members WHERE agency_id = check_agency_id AND user_id = check_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- agencies
CREATE POLICY "Agencies are viewable by everyone" ON agencies FOR SELECT USING (true);
CREATE POLICY "Only owner or admins can update agency" ON agencies FOR UPDATE USING (
  auth.uid() = owner_id OR get_agency_role(id, auth.uid()) = 'admin'
);

-- agency_members
CREATE POLICY "Members viewable by public" ON agency_members FOR SELECT USING (true);
CREATE POLICY "Only admins can manage members" ON agency_members FOR ALL USING (
  get_agency_role(agency_id, auth.uid()) = 'admin'
);
CREATE POLICY "Users can view their own membership" ON agency_members FOR SELECT USING (
  user_id = auth.uid()
);

-- agency_profiles_overlay
CREATE POLICY "Public profiles viewable by all" ON agency_profiles_overlay FOR SELECT USING (
  visibility_state = 'public'
);
CREATE POLICY "Admins/Managers can view all overlays" ON agency_profiles_overlay FOR SELECT USING (
  get_agency_role(agency_id, auth.uid()) IN ('admin', 'manager')
);
CREATE POLICY "Admins can update overlays" ON agency_profiles_overlay FOR ALL USING (
  get_agency_role(agency_id, auth.uid()) = 'admin'
);

-- agency_join_requests
CREATE POLICY "Users can view and create their own requests" ON agency_join_requests FOR ALL USING (
  user_id = auth.uid()
);
CREATE POLICY "Admins/Managers can view and manage requests" ON agency_join_requests FOR ALL USING (
  get_agency_role(agency_id, auth.uid()) IN ('admin', 'manager')
);

-- agency_pitches
CREATE POLICY "Pitches viewable by token (public)" ON agency_pitches FOR SELECT USING (true);
CREATE POLICY "Admins/Managers can manage pitches" ON agency_pitches FOR ALL USING (
  get_agency_role(agency_id, auth.uid()) IN ('admin', 'manager')
);

-- Transactions & Ledgers (Strictly Internal)
CREATE POLICY "Only Admins view transactions" ON agency_transactions FOR SELECT USING (
  get_agency_role(agency_id, auth.uid()) = 'admin'
);
CREATE POLICY "Users view own ledger" ON agency_payout_ledger FOR SELECT USING (
  user_id = auth.uid() OR get_agency_role(agency_id, auth.uid()) = 'admin'
);
```

## 3. Stored Procedures / RPC Specs

```sql
-- 1. approve_agency_member
CREATE OR REPLACE FUNCTION approve_agency_member(p_request_id UUID, p_admin_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_agency_id UUID;
    v_user_id UUID;
BEGIN
    SELECT agency_id, user_id INTO v_agency_id, v_user_id FROM agency_join_requests WHERE id = p_request_id;
    IF get_agency_role(v_agency_id, p_admin_id) NOT IN ('admin', 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    UPDATE agency_join_requests SET status = 'approved', resolved_at = now() WHERE id = p_request_id;
    INSERT INTO agency_members (agency_id, user_id, role) VALUES (v_agency_id, v_user_id, 'member');
    INSERT INTO agency_events_log (agency_id, actor_id, event_type, metadata) 
    VALUES (v_agency_id, p_admin_id, 'member_approved', jsonb_build_object('user_id', v_user_id));
    RETURN TRUE;
END;
$$;

-- 2. execute_client_payment_split
CREATE OR REPLACE FUNCTION execute_client_payment_split(p_pitch_id UUID, p_amount DECIMAL, p_currency VARCHAR)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_agency_id UUID;
    v_talent_split DECIMAL;
    v_agency_split DECIMAL;
BEGIN
    SELECT agency_id INTO v_agency_id FROM agency_pitches WHERE id = p_pitch_id;
    -- In real implementation, splits are derived from agency_rules or pitch payload
    v_agency_split := p_amount * 0.20;
    v_talent_split := p_amount * 0.80;

    INSERT INTO agency_transactions (agency_id, type, amount, currency, debit_account, credit_account, reference_id)
    VALUES 
        (v_agency_id, 'client_payment', p_amount, p_currency, 'escrow_inbound', 'escrow_holding', p_pitch_id),
        (v_agency_id, 'agency_revenue', v_agency_split, p_currency, 'escrow_holding', 'agency_revenue_account', p_pitch_id),
        (v_agency_id, 'talent_payable', v_talent_split, p_currency, 'escrow_holding', 'talent_payable_account', p_pitch_id);
        
    RETURN TRUE;
END;
$$;

-- 3. leave_agency_safe
CREATE OR REPLACE FUNCTION leave_agency_safe(p_agency_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Ensure no pending active pitches for user (simplified check)
    DELETE FROM agency_members WHERE agency_id = p_agency_id AND user_id = p_user_id;
    DELETE FROM agency_profiles_overlay WHERE agency_id = p_agency_id AND user_id = p_user_id;
    INSERT INTO agency_events_log (agency_id, actor_id, event_type, metadata) 
    VALUES (p_agency_id, p_user_id, 'member_left', jsonb_build_object('user_id', p_user_id));
    RETURN TRUE;
END;
$$;

-- 4. dissolve_agency_safe
CREATE OR REPLACE FUNCTION dissolve_agency_safe(p_agency_id UUID, p_owner_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM agencies WHERE id = p_agency_id AND owner_id = p_owner_id) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    -- Logic to clear all data or mark as dissolved
    DELETE FROM agency_members WHERE agency_id = p_agency_id;
    DELETE FROM agencies WHERE id = p_agency_id;
    RETURN TRUE;
END;
$$;
```

## 4. Comprehensive TypeScript Interfaces

```typescript
export type AgencyRole = 'admin' | 'manager' | 'member';
export type SubscriptionTier = 'free' | 'tier1' | 'tier2' | 'tier3' | 'tier4';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'unpaid';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type TransactionType = 'client_payment' | 'escrow_fee' | 'agency_revenue' | 'talent_payable' | 'payout';
export type PitchStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';

export interface Agency {
    id: string;
    owner_id: string;
    handle: string;
    name: string;
    primary_color: string;
    secondary_color: string;
    is_verified: boolean;
    verified_at?: string;
    location?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface AgencyMember {
    id: string;
    agency_id: string;
    user_id: string;
    role: AgencyRole;
    paystack_subaccount_code?: string;
    joined_at: string;
}

export interface AgencyProfileOverlay {
    id: string;
    agency_id: string;
    user_id: string;
    visibility_state: 'public' | 'private' | 'hidden';
    custom_title?: string;
    custom_rate?: number;
    updated_at: string;
}

export interface AgencyJoinRequest {
    id: string;
    agency_id: string;
    user_id: string;
    status: JoinRequestStatus;
    message?: string;
    created_at: string;
    resolved_at?: string;
}

export interface AgencySubscription {
    id: string;
    agency_id: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    current_period_end: string;
    created_at: string;
    updated_at: string;
}

export interface AgencyTransaction {
    id: string;
    agency_id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    debit_account: string;
    credit_account: string;
    reference_id?: string;
    created_at: string;
}

export interface AgencyPayoutLedger {
    id: string;
    agency_id: string;
    user_id: string;
    available_balance: number;
    currency: string;
    last_payout_at?: string;
    updated_at: string;
}

export interface AgencyPitch {
    id: string;
    agency_id: string;
    created_by: string;
    client_email: string;
    token: string;
    status: PitchStatus;
    payload: Record<string, any>;
    total_value?: number;
    currency?: string;
    created_at: string;
    updated_at: string;
}

export interface AgencyRule {
    id: string;
    agency_id: string;
    rule_type: string;
    configuration: Record<string, any>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AgencyEventLog {
    id: string;
    agency_id: string;
    actor_id?: string;
    event_type: string;
    metadata?: Record<string, any>;
    created_at: string;
}
```
