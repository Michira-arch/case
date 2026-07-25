-- Migration 006: Agency OS Extended Schema
-- Adds: agency_rules, agency_events_log, agency_payout_ledger, agency_pitches
-- Also adds color theming columns to agencies
-- NOTE: agency_profiles_overlay functionality is handled via agency_members.overlay_data (existing)
-- Run after 20260725143000_agency_system migration

-- =============================================
-- ALTER agencies: add color theming columns
-- =============================================
-- =============================================
-- ENUMS (safe, idempotent)
-- =============================================
DO $$ BEGIN
  CREATE TYPE pitch_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- ALTER agencies: add color theming columns
-- =============================================
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS location JSONB DEFAULT '{}'::jsonb;

-- -- =============================================
-- NOTE: overlay data is stored in agency_members.overlay_data JSONB (already exists)
-- We add a helper view for convenience
-- =============================================
CREATE OR REPLACE VIEW public.agency_member_profiles AS
  SELECT
    am.id AS membership_id,
    am.agency_id,
    am.user_id,
    am.role,
    am.status,
    am.paystack_subaccount,
    am.custom_split_pct,
    am.overlay_data,
    am.joined_at,
    p.handle,
    p.display_name,
    p.avatar_url,
    p.category,
    p.role_line
  FROM public.agency_members am
  LEFT JOIN public.profiles p ON p.id = am.profile_id
  WHERE am.status = 'active';



-- =============================================
-- agency_rules
-- Per-agency operational configuration rules
-- =============================================
CREATE TABLE IF NOT EXISTS public.agency_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  rule_type VARCHAR(64) NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, rule_type)
);
CREATE INDEX IF NOT EXISTS idx_agency_rules_agency ON public.agency_rules(agency_id, rule_type);

ALTER TABLE public.agency_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins and managers can manage rules" ON public.agency_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = agency_id AND am.user_id = auth.uid() AND am.role IN ('admin', 'manager')
    )
  );

-- Seed default rules for each agency on creation (trigger)
CREATE OR REPLACE FUNCTION public.seed_default_agency_rules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.agency_rules (agency_id, rule_type, configuration, is_active) VALUES
    (NEW.id, 'DEFAULT_SPLIT', '{"agency_pct": 20, "talent_pct": 80}'::jsonb, true),
    (NEW.id, 'MIN_COMPLETENESS_SCORE', '{"min_score": 70}'::jsonb, true),
    (NEW.id, 'AUTO_APPROVE_THRESHOLD', '{"score_threshold": 90}'::jsonb, false),
    (NEW.id, 'INVOICE_AUTO_SEND', '{"enabled": false}'::jsonb, false),
    (NEW.id, 'REQUIRE_VOUCHED_PROOF', '{"required": true}'::jsonb, true)
  ON CONFLICT (agency_id, rule_type) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_seed_agency_rules ON public.agencies;
CREATE TRIGGER trigger_seed_agency_rules
  AFTER INSERT ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_agency_rules();

-- =============================================
-- agency_events_log
-- Immutable audit log for all agency actions
-- =============================================
CREATE TABLE IF NOT EXISTS public.agency_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_events_agency_ts ON public.agency_events_log(agency_id, created_at DESC);

ALTER TABLE public.agency_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all events in their agency" ON public.agency_events_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = agency_id AND am.user_id = auth.uid() AND am.role = 'admin'
    )
  );

CREATE POLICY "System can insert events" ON public.agency_events_log
  FOR INSERT WITH CHECK (true);

-- =============================================
-- agency_payout_ledger
-- Per-member, per-currency balance tracking
-- =============================================
CREATE TABLE IF NOT EXISTS public.agency_payout_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  available_balance DECIMAL(12, 2) DEFAULT 0.00 CHECK (available_balance >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'KES',
  last_payout_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, user_id, currency)
);

ALTER TABLE public.agency_payout_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ledger balance" ON public.agency_payout_ledger
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all ledger balances in their agency" ON public.agency_payout_ledger
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = agency_id AND am.user_id = auth.uid() AND am.role = 'admin'
    )
  );

-- =============================================
-- agency_pitches
-- Client proposal pitches with shareable tokens
-- =============================================
CREATE TABLE IF NOT EXISTS public.agency_pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  client_email VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  token VARCHAR(64) UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status pitch_status DEFAULT 'draft',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- payload shape: { line_items: [{desc, qty, unit_price}], talent_ids: [], note: "" }
  total_value DECIMAL(12, 2),
  agency_cut_amount DECIMAL(12, 2),
  talent_cut_amount DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'KES',
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_pitches_token ON public.agency_pitches(token);
CREATE INDEX IF NOT EXISTS idx_agency_pitches_agency ON public.agency_pitches(agency_id, status);

ALTER TABLE public.agency_pitches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins and managers can manage pitches" ON public.agency_pitches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.agency_id = agency_id AND am.user_id = auth.uid() AND am.role IN ('admin', 'manager')
    )
  );

-- Pitches are viewable by token (for client-facing pitch page)
CREATE POLICY "Pitches viewable publicly by token lookup" ON public.agency_pitches
  FOR SELECT USING (true);

-- =============================================
-- agency_join_requests: add invite token support
-- =============================================
ALTER TABLE public.agency_join_requests
  ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'talent_apply' CHECK (direction IN ('talent_apply', 'agency_invite')),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- =============================================
-- UPDATED STORED PROCEDURES
-- =============================================

-- approve_agency_member_v2: uses existing agency_members schema
CREATE OR REPLACE FUNCTION public.approve_agency_member_v2(p_request_id UUID, p_role TEXT DEFAULT 'talent')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_agency_id UUID;
  v_user_id UUID;
  v_profile_id UUID;
  v_member_id UUID;
  v_caller_role TEXT;
BEGIN
  SELECT r.agency_id, r.user_id, p.id
  INTO v_agency_id, v_user_id, v_profile_id
  FROM public.agency_join_requests r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE r.id = p_request_id AND r.status = 'pending';

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already resolved';
  END IF;

  -- Verify caller is admin or manager
  SELECT role INTO v_caller_role FROM public.agency_members
  WHERE agency_id = v_agency_id AND user_id = auth.uid() AND status = 'active';

  IF v_caller_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Approve request (existing RPC sets the join_request status)
  UPDATE public.agency_join_requests
  SET status = 'approved', updated_at = now()
  WHERE id = p_request_id;

  -- Insert into agency_members (triggers enforce_agency_limit)
  INSERT INTO public.agency_members (agency_id, user_id, profile_id, role, status, overlay_data)
  VALUES (v_agency_id, v_user_id, v_profile_id, p_role, 'active', '{"visibility_state":"public"}'::jsonb)
  ON CONFLICT (agency_id, user_id) DO UPDATE SET status = 'active', role = p_role
  RETURNING id INTO v_member_id;

  -- Initialize payout ledger
  INSERT INTO public.agency_payout_ledger (agency_id, user_id, available_balance, currency)
  SELECT v_agency_id, v_user_id, 0.00, COALESCE(a.currency, 'KES')
  FROM public.agencies a WHERE a.id = v_agency_id
  ON CONFLICT (agency_id, user_id, currency) DO NOTHING;

  -- Log event
  INSERT INTO public.agency_events_log (agency_id, actor_id, event_type, metadata)
  VALUES (v_agency_id, auth.uid(), 'member_approved', jsonb_build_object('user_id', v_user_id, 'role', p_role));

  RETURN jsonb_build_object('success', true, 'member_id', v_member_id);
END;
$$;

-- leave_agency_safe_v2: uses existing agency_members schema (status='left')
CREATE OR REPLACE FUNCTION public.leave_agency_safe_v2(p_agency_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Soft-delete: mark as 'left' (preserves data, just removes from active roster)
  UPDATE public.agency_members
  SET status = 'left',
      overlay_data = overlay_data || '{"visibility_state":"hidden"}'::jsonb
  WHERE agency_id = p_agency_id AND user_id = v_user_id;
  -- Log
  INSERT INTO public.agency_events_log (agency_id, actor_id, event_type, metadata)
  VALUES (p_agency_id, v_user_id, 'member_left', jsonb_build_object('user_id', v_user_id));
  RETURN TRUE;
END;
$$;

-- execute_client_payment_split: double-entry ledger on payment
CREATE OR REPLACE FUNCTION public.execute_client_payment_split(p_pitch_id UUID, p_amount DECIMAL, p_currency VARCHAR)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_agency_id UUID;
  v_agency_pct DECIMAL DEFAULT 20;
  v_talent_pct DECIMAL DEFAULT 80;
  v_agency_cut DECIMAL;
  v_talent_cut DECIMAL;
  v_talent_ids JSONB;
  v_talent_id TEXT;
BEGIN
  SELECT agency_id, payload->'talent_ids' INTO v_agency_id, v_talent_ids
  FROM public.agency_pitches WHERE id = p_pitch_id;

  -- Get split from agency rules
  SELECT (configuration->>'agency_pct')::DECIMAL INTO v_agency_pct
  FROM public.agency_rules
  WHERE agency_id = v_agency_id AND rule_type = 'DEFAULT_SPLIT' AND is_active = true
  LIMIT 1;

  v_talent_pct := 100 - COALESCE(v_agency_pct, 20);
  v_agency_cut := ROUND(p_amount * (COALESCE(v_agency_pct, 20) / 100.0), 2);
  v_talent_cut := p_amount - v_agency_cut;

  -- Record client payment
  INSERT INTO public.agency_transactions (agency_id, type, amount, currency, debit_account, credit_account, reference_id)
  VALUES (v_agency_id, 'client_payment', p_amount, p_currency, 'escrow_inbound', 'escrow_holding', p_pitch_id);

  -- Record agency revenue
  INSERT INTO public.agency_transactions (agency_id, type, amount, currency, debit_account, credit_account, reference_id)
  VALUES (v_agency_id, 'agency_revenue', v_agency_cut, p_currency, 'escrow_holding', 'agency_revenue_account', p_pitch_id);

  -- Record talent payable (split evenly across all talent in pitch)
  IF v_talent_ids IS NOT NULL AND jsonb_array_length(v_talent_ids) > 0 THEN
    FOR v_talent_id IN SELECT jsonb_array_elements_text(v_talent_ids) LOOP
      INSERT INTO public.agency_transactions (agency_id, type, amount, currency, debit_account, credit_account, reference_id)
      VALUES (v_agency_id, 'talent_payable', ROUND(v_talent_cut / jsonb_array_length(v_talent_ids), 2), p_currency, 'escrow_holding', v_talent_id, p_pitch_id);

      -- Credit the payout ledger
      INSERT INTO public.agency_payout_ledger (agency_id, user_id, available_balance, currency)
      VALUES (v_agency_id, v_talent_id::UUID, ROUND(v_talent_cut / jsonb_array_length(v_talent_ids), 2), p_currency)
      ON CONFLICT (agency_id, user_id, currency) DO UPDATE
      SET available_balance = agency_payout_ledger.available_balance + ROUND(v_talent_cut / jsonb_array_length(v_talent_ids), 2),
          updated_at = now();
    END LOOP;
  END IF;

  -- Update pitch
  UPDATE public.agency_pitches
  SET status = 'accepted', agency_cut_amount = v_agency_cut, talent_cut_amount = v_talent_cut, accepted_at = now()
  WHERE id = p_pitch_id;

  -- Log event
  INSERT INTO public.agency_events_log (agency_id, actor_id, event_type, metadata)
  VALUES (v_agency_id, NULL, 'payment_split_executed', jsonb_build_object('pitch_id', p_pitch_id, 'amount', p_amount, 'agency_cut', v_agency_cut, 'talent_cut', v_talent_cut));

  RETURN TRUE;
END;
$$;

-- dissolve_agency_safe: graceful shutdown with checks
CREATE OR REPLACE FUNCTION public.dissolve_agency_safe(p_agency_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner_id UUID;
  v_active_pitches INT;
  v_pending_balances DECIMAL;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.agencies WHERE id = p_agency_id;
  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the agency owner can dissolve this agency';
  END IF;

  SELECT COUNT(*) INTO v_active_pitches FROM public.agency_pitches
  WHERE agency_id = p_agency_id AND status IN ('sent', 'viewed');

  IF v_active_pitches > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resolve all active pitches before dissolving', 'active_pitches', v_active_pitches);
  END IF;

  SELECT COALESCE(SUM(available_balance), 0) INTO v_pending_balances
  FROM public.agency_payout_ledger WHERE agency_id = p_agency_id;

  IF v_pending_balances > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Release all pending talent balances before dissolving', 'pending_balance', v_pending_balances);
  END IF;

  -- Archive members (data sovereignty — mark left, not deleted)
  UPDATE public.agency_members SET status = 'left' WHERE agency_id = p_agency_id AND status = 'active';

  -- Log final event
  INSERT INTO public.agency_events_log (agency_id, actor_id, event_type, metadata)
  VALUES (p_agency_id, auth.uid(), 'agency_dissolved', jsonb_build_object('dissolved_at', now()));

  -- Soft-delete the agency
  UPDATE public.agencies SET name = name || ' [Dissolved]', handle = handle || '-dissolved-' || extract(epoch from now())::bigint WHERE id = p_agency_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
