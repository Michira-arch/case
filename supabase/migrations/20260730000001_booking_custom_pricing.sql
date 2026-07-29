-- Add per-booking custom pricing capabilities
ALTER TABLE nanny_bookings ADD COLUMN custom_pricing_enabled boolean DEFAULT false;
ALTER TABLE nanny_bookings ADD COLUMN agency_commission_pct numeric;
ALTER TABLE nanny_bookings ADD COLUMN unit_rate numeric;
ALTER TABLE nanny_bookings ADD COLUMN advanced_settings jsonb DEFAULT '{}'::jsonb;

-- Ensure the complete_assignment function respects custom booking pricing if enabled
CREATE OR REPLACE FUNCTION nanny_complete_assignment(
  p_assignment_id   uuid,
  p_clocked_out_at  timestamptz DEFAULT now(),
  p_hours_worked    numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment  nanny_assignments;
  v_booking     nanny_bookings;
  v_org         nanny_orgs;
  v_worker      nanny_workers;
  v_service     nanny_service_types;
  v_total_cost  numeric := 0;
  v_agency_rev  numeric := 0;
  v_worker_pay  numeric := 0;
  v_commission_pct numeric;
  v_unit_rate   numeric;
BEGIN
  -- Get assignment and booking
  SELECT * INTO v_assignment FROM nanny_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found'; END IF;

  SELECT * INTO v_booking FROM nanny_bookings WHERE id = v_assignment.booking_id;
  IF v_booking.booking_state != 'in_progress' AND v_booking.booking_state != 'scheduled' THEN
    RAISE EXCEPTION 'Booking is not in progress or scheduled. State: %', v_booking.booking_state;
  END IF;

  -- Get org, worker, service
  SELECT * INTO v_org FROM nanny_orgs WHERE id = v_booking.org_id;
  SELECT * INTO v_worker FROM nanny_workers WHERE id = v_assignment.worker_id;
  SELECT * INTO v_service FROM nanny_service_types WHERE id = v_booking.service_type_id;

  -- Determine the Unit Rate (Custom overrides Booking Quoted overrides Service Default)
  IF v_booking.custom_pricing_enabled AND v_booking.unit_rate IS NOT NULL THEN
    v_unit_rate := v_booking.unit_rate;
  ELSIF v_booking.quoted_rate IS NOT NULL THEN
    v_unit_rate := v_booking.quoted_rate;
  ELSIF v_service.base_rate IS NOT NULL THEN
    v_unit_rate := v_service.base_rate;
  ELSE
    v_unit_rate := 0;
  END IF;

  -- Calculate Total Cost based on Pricing Model
  IF v_booking.pricing_model = 'hourly' THEN
    IF p_hours_worked IS NULL THEN RAISE EXCEPTION 'Hours worked required for hourly pricing'; END IF;
    v_total_cost := v_unit_rate * p_hours_worked;
  ELSIF v_booking.pricing_model = 'fixed' OR v_booking.pricing_model = 'flat_rate' OR v_booking.pricing_model = 'quoted' THEN
    v_total_cost := v_unit_rate;
  ELSIF v_booking.pricing_model = 'recurring_monthly' THEN
    v_total_cost := v_unit_rate;
  ELSE
    v_total_cost := v_unit_rate;
  END IF;

  -- Add Advanced Settings flat fee if present
  IF v_booking.custom_pricing_enabled AND v_booking.advanced_settings ? 'flat_placement_fee' THEN
    v_total_cost := v_total_cost + (v_booking.advanced_settings->>'flat_placement_fee')::numeric;
  END IF;

  -- Determine Commission Percentage (Custom Booking overrides Worker overrides Org)
  IF v_booking.custom_pricing_enabled AND v_booking.agency_commission_pct IS NOT NULL THEN
    v_commission_pct := v_booking.agency_commission_pct;
  ELSIF v_worker.agency_cut_pct IS NOT NULL THEN
    v_commission_pct := v_worker.agency_cut_pct;
  ELSIF v_org.policy ? 'agency_cut_pct' THEN
    v_commission_pct := (v_org.policy->>'agency_cut_pct')::numeric;
  ELSE
    v_commission_pct := 20; -- Global fallback
  END IF;

  -- Calculate Splits
  v_agency_rev := v_total_cost * (v_commission_pct / 100.0);
  
  -- If there's a flat placement fee, it goes entirely to the agency
  IF v_booking.custom_pricing_enabled AND v_booking.advanced_settings ? 'flat_placement_fee' THEN
    v_agency_rev := v_agency_rev + (v_booking.advanced_settings->>'flat_placement_fee')::numeric * (1 - (v_commission_pct/100.0));
  END IF;

  v_worker_pay := v_total_cost - v_agency_rev;

  -- Update assignment
  UPDATE nanny_assignments
  SET
    assignment_state = 'completed',
    actual_start = COALESCE(actual_start, now()),
    actual_end = now(),
    hours_worked = p_hours_worked,
    agency_revenue = v_agency_rev,
    worker_payout = v_worker_pay
  WHERE id = p_assignment_id;

  -- Update booking
  UPDATE nanny_bookings
  SET 
    booking_state = 'completed',
    actual_end = now()
  WHERE id = v_booking.id;

  -- Create Invoice
  IF NOT EXISTS (SELECT 1 FROM nanny_invoices WHERE assignment_id = p_assignment_id) THEN
    INSERT INTO nanny_invoices (
      org_id, client_id, assignment_id, subtotal, total, invoice_state, due_at
    ) VALUES (
      v_booking.org_id,
      v_booking.client_id,
      p_assignment_id,
      v_total_cost,
      v_total_cost,
      'draft',
      now() + interval '7 days'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_cost', v_total_cost,
    'agency_revenue', v_agency_rev,
    'worker_payout', v_worker_pay
  );

END;
$$;
