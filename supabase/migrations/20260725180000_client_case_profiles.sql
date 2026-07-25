-- Migration 007: Client Case Profiles & 2-Sided Proof Ecosystem
-- Allows agency clients to have a verified Case profile, 1-click escrow checkout, and 2-sided work proof.

-- =============================================
-- client_profiles
-- Represents verified corporate/brand clients on Case
-- =============================================
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  handle VARCHAR(64) UNIQUE NOT NULL,
  logo_url VARCHAR(512),
  tagline VARCHAR(255),
  industry VARCHAR(100),
  website_url VARCHAR(255),
  location JSONB DEFAULT '{}'::jsonb,
  tax_id VARCHAR(100),
  verified_brand_badge BOOLEAN DEFAULT true,
  on_time_payment_rate DECIMAL(5,2) DEFAULT 100.00,
  total_spent DECIMAL(12,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_profiles_owner ON public.client_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_handle ON public.client_profiles(handle);

ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client profiles viewable by all" ON public.client_profiles
  FOR SELECT USING (true);

CREATE POLICY "Clients can insert/update their own profile" ON public.client_profiles
  FOR ALL USING (auth.uid() = owner_id);

-- =============================================
-- client_campaigns
-- 2-sided campaign nodes connecting Client <-> Agency <-> Talent
-- =============================================
CREATE TABLE IF NOT EXISTS public.client_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  pitch_id UUID REFERENCES public.agency_pitches(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  budget DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disputed')),
  talent_ids JSONB DEFAULT '[]'::jsonb,
  proof_url VARCHAR(512),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_campaigns_client ON public.client_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_client_campaigns_agency ON public.client_campaigns(agency_id);

ALTER TABLE public.client_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaigns viewable by participants and public when completed" ON public.client_campaigns
  FOR SELECT USING (true);

CREATE POLICY "Clients and agency admins can update campaigns" ON public.client_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = client_id AND cp.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.agency_members am WHERE am.agency_id = agency_id AND am.user_id = auth.uid() AND am.role IN ('admin', 'manager'))
  );

-- =============================================
-- client_vouches
-- 2-sided endorsements between Client <-> Agency / Talent
-- =============================================
CREATE TABLE IF NOT EXISTS public.client_vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.client_campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  talent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role VARCHAR(20) CHECK (author_role IN ('client', 'agency', 'talent')),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_vouches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client vouches viewable by all" ON public.client_vouches
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create vouches" ON public.client_vouches
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- STORED PROCEDURE: accept_pitch_as_client
-- Atomically handles pitch acceptance, payment split, client profile creation, and campaign node creation
-- =============================================
CREATE OR REPLACE FUNCTION public.accept_pitch_as_client(
  p_pitch_id UUID,
  p_client_user_id UUID,
  p_company_name TEXT DEFAULT NULL,
  p_company_handle TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pitch public.agency_pitches%ROWTYPE;
  v_client_profile_id UUID;
  v_campaign_id UUID;
  v_handle TEXT;
BEGIN
  SELECT * INTO v_pitch FROM public.agency_pitches WHERE id = p_pitch_id;

  IF v_pitch.id IS NULL THEN
    RAISE EXCEPTION 'Pitch not found';
  END IF;

  -- 1. Ensure Client Profile exists
  SELECT id INTO v_client_profile_id FROM public.client_profiles WHERE owner_id = p_client_user_id;

  IF v_client_profile_id IS NULL THEN
    v_handle := COALESCE(p_company_handle, 'brand-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    INSERT INTO public.client_profiles (owner_id, company_name, handle, currency)
    VALUES (
      p_client_user_id,
      COALESCE(p_company_name, v_pitch.client_name, v_pitch.client_email),
      v_handle,
      COALESCE(v_pitch.currency, 'USD')
    )
    RETURNING id INTO v_client_profile_id;
  END IF;

  -- 2. Execute double-entry ledger payment split
  PERFORM public.execute_client_payment_split(p_pitch_id, v_pitch.total_value, COALESCE(v_pitch.currency, 'USD'));

  -- 3. Update total_spent on client profile
  UPDATE public.client_profiles
  SET total_spent = total_spent + v_pitch.total_value,
      updated_at = now()
  WHERE id = v_client_profile_id;

  -- 4. Create 2-sided Campaign Node
  INSERT INTO public.client_campaigns (
    client_id, agency_id, pitch_id, title, budget, currency, status, talent_ids
  ) VALUES (
    v_client_profile_id,
    v_pitch.agency_id,
    v_pitch.id,
    COALESCE(v_pitch.payload->>'title', 'Agency Campaign Work'),
    v_pitch.total_value,
    COALESCE(v_pitch.currency, 'USD'),
    'completed',
    COALESCE(v_pitch.payload->'talent_ids', '[]'::jsonb)
  )
  RETURNING id INTO v_campaign_id;

  -- 5. Auto-log event
  INSERT INTO public.agency_events_log (agency_id, actor_id, event_type, metadata)
  VALUES (
    v_pitch.agency_id,
    p_client_user_id,
    'client_pitch_accepted',
    jsonb_build_object(
      'pitch_id', p_pitch_id,
      'client_profile_id', v_client_profile_id,
      'campaign_id', v_campaign_id,
      'total_value', v_pitch.total_value
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'client_profile_id', v_client_profile_id,
    'campaign_id', v_campaign_id,
    'pitch_id', p_pitch_id
  );
END;
$$;
