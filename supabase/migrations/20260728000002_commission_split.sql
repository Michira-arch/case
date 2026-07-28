-- Remove platform_commission_pct from nanny_orgs policy
UPDATE nanny_orgs 
SET policy = policy - 'platform_commission_pct'
WHERE policy ? 'platform_commission_pct';

-- Set a default agency_cut_pct on the policy if it doesn't exist
UPDATE nanny_orgs
SET policy = jsonb_set(policy, '{agency_cut_pct}', '20'::jsonb)
WHERE NOT (policy ? 'agency_cut_pct');

-- Add commission_rate override to nanny_workers
ALTER TABLE nanny_workers ADD COLUMN agency_cut_pct numeric;

-- Add revenue split columns to nanny_assignments
ALTER TABLE nanny_assignments ADD COLUMN agency_revenue numeric DEFAULT 0;
ALTER TABLE nanny_assignments ADD COLUMN worker_payout numeric DEFAULT 0;

-- Support recurring / fixed price on nanny_service_types
ALTER TABLE nanny_service_types DROP CONSTRAINT nanny_service_types_pricing_model_check;
ALTER TABLE nanny_service_types ADD CONSTRAINT nanny_service_types_pricing_model_check 
  CHECK (pricing_model IN ('hourly', 'flat_rate', 'quoted', 'fixed', 'recurring_monthly'));

-- Add pricing_model to nanny_bookings so we know how to bill it at completion time
ALTER TABLE nanny_bookings ADD COLUMN pricing_model text DEFAULT 'hourly' CHECK (pricing_model IN ('hourly', 'fixed', 'recurring_monthly'));

-- Update the complete assignment function to handle the split and fixed pricing
CREATE OR REPLACE FUNCTION nanny_complete_assignment(
  p_assignment_id uuid,
  p_hours_worked numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_assignment record;
  v_booking record;
  v_org record;
  v_worker record;
  v_hours numeric;
  v_base numeric := 0;
  v_surcharge numeric := 0;
  v_holiday_pay numeric := 0;
  v_total numeric := 0;
  v_agency_cut_pct numeric := 20;
  v_agency_rev numeric := 0;
  v_worker_pay numeric := 0;
  v_emergency_pct numeric;
  v_holiday_rate numeric;
BEGIN
  -- Get assignment, booking, and org
  SELECT a.* INTO v_assignment
  FROM nanny_assignments a
  WHERE a.id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  SELECT * INTO v_booking FROM nanny_bookings WHERE id = v_assignment.booking_id;
  SELECT * INTO v_org FROM nanny_orgs WHERE id = v_assignment.org_id;
  SELECT * INTO v_worker FROM nanny_workers WHERE id = v_assignment.worker_id;

  -- Determine agency cut percentage
  -- Worker-specific override first, then agency policy default
  v_agency_cut_pct := COALESCE(
    v_worker.agency_cut_pct,
    (v_org.policy->>'agency_cut_pct')::numeric,
    20
  );

  -- Get policy values for modifiers
  v_emergency_pct := COALESCE((v_org.policy->>'emergency_surcharge_pct')::numeric, 20);
  v_holiday_rate := COALESCE((v_org.policy->>'holiday_pay_rate')::numeric, 0.1207);

  -- Calculate duration in hours
  IF p_hours_worked IS NOT NULL THEN
    v_hours := p_hours_worked;
  ELSIF v_assignment.clocked_in_at IS NOT NULL AND v_assignment.clocked_out_at IS NOT NULL THEN
    v_hours := EXTRACT(EPOCH FROM (v_assignment.clocked_out_at - v_assignment.clocked_in_at)) / 3600;
  ELSE
    v_hours := COALESCE(v_assignment.hours_worked, 0);
  END IF;

  -- Compute financials based on pricing model
  IF v_booking.pricing_model IN ('fixed', 'recurring_monthly') THEN
    -- Base amount is just the quoted rate
    v_base := COALESCE(v_booking.quoted_rate, 0);
  ELSE
    -- Hourly
    v_base := v_hours * COALESCE(v_assignment.hourly_rate, 0);
  END IF;

  v_surcharge := CASE WHEN v_assignment.is_emergency THEN v_base * (v_emergency_pct / 100) ELSE 0 END;
  v_holiday_pay := (v_base + v_surcharge) * v_holiday_rate;
  v_total := v_base + v_surcharge + v_holiday_pay;

  -- Split the base (and surcharge) between agency and worker. 
  -- Holiday pay goes 100% to the worker. 
  v_agency_rev := (v_base + v_surcharge) * (v_agency_cut_pct / 100);
  v_worker_pay := (v_base + v_surcharge) - v_agency_rev + v_holiday_pay;

  -- Update assignment
  UPDATE nanny_assignments
  SET assignment_state  = 'completed',
      completed_at      = NOW(),
      hours_worked      = v_hours,
      base_amount       = v_base,
      surcharge_amount  = v_surcharge,
      holiday_pay       = v_holiday_pay,
      total_amount      = v_total,
      agency_revenue    = v_agency_rev,
      worker_payout     = v_worker_pay,
      updated_at        = NOW()
  WHERE id = p_assignment_id;

  -- Update booking state 
  UPDATE nanny_bookings
  SET booking_state = 'completed',
      actual_end    = NOW(),
      updated_at    = NOW()
  WHERE id = v_assignment.booking_id;

  -- Auto-create invoice if policy says so
  IF (v_org.policy->>'auto_invoice')::boolean THEN
    PERFORM nanny_create_post_assignment_invoice(p_assignment_id);
  END IF;

  RETURN jsonb_build_object(
    'hours_worked', v_hours,
    'base_amount', v_base,
    'surcharge_amount', v_surcharge,
    'holiday_pay', v_holiday_pay,
    'total_amount', v_total,
    'agency_revenue', v_agency_rev,
    'worker_payout', v_worker_pay
  );
END;
$$;
