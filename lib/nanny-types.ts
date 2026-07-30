/**
 * Nanny Agency TypeScript types matching the DB schema
 */

// ─── Agency / Organization ───────────────────────────────────────────────────

export interface NannyOrg {
  id: string
  owner_profile_id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  cover_url: string | null
  vertical: 'caregiving' | 'nanny' | 'cleaning' | 'both' | 'all'
  status: 'active' | 'suspended' | 'closed'
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  location_area: string | null
  policy: NannyOrgPolicy
  is_public: boolean
  paystack_subaccount_code: string | null
  seo_title: string | null
  seo_description: string | null
  page_config: NannyPageConfig
  billing_plan: string
  billing_status: string
  next_billing_date: string | null
  paystack_auth_code: string | null
  billing_email: string | null
  created_at: string
  updated_at: string
}

export interface NannyPageConfig {
  hero_headline: string | null
  hero_subtitle: string | null
  pitch_title: string
  pitch_body: string | null
  pitch_bullets: string[]
  show_services: boolean
  show_workers: boolean
  show_testimonials: boolean
  cta_text: string
  cta_subtext: string
  accent_color: string | null
  hero_pattern: 'dots' | 'grid' | 'waves' | 'none'
  stats: { label: string; value: string }[]
}

export interface NannyOrgPolicy {
  matching_mode: 'shortlist' | 'auto_assign'
  cancellation_grace_hours: number
  emergency_surcharge_pct: number
  holiday_pay_rate: number
  overtime_multiplier: number
  overtime_threshold_hours: number
  payout_cadence: 'daily' | 'weekly' | 'monthly'
  agency_cut_pct: number
  auto_invoice: boolean
  require_timelog: boolean
  continuity_preference: boolean
}

// ─── Credential Types ────────────────────────────────────────────────────────

export interface NannyCredentialType {
  id: string
  org_id: string
  code: string
  name: string
  description: string | null
  issuing_body: string | null
  vertical: 'caregiving' | 'nanny' | 'cleaning' | 'both' | 'all'
  requires_expiry: boolean
  default_validity_days: number | null
  is_required: boolean
  is_archived: boolean
  sort_order: number
  created_at: string
}

// ─── Service Types ───────────────────────────────────────────────────────────

export interface NannyServiceType {
  id: string
  org_id: string
  code: string
  name: string
  description: string | null
  vertical: 'caregiving' | 'nanny' | 'cleaning'
  pricing_model: 'hourly' | 'per_day' | 'per_task' | 'per_week' | 'per_month' | 'per_shift' | 'flat_rate' | 'quoted'
  duration_unit: 'hour' | 'day' | 'week' | 'month' | 'task' | 'shift'
  base_rate: number | null
  min_hours: number | null
  max_hours: number | null
  required_credentials: string[]
  is_active: boolean
  sort_order: number
  created_at: string
}

// ─── Workers ─────────────────────────────────────────────────────────────────

export type WorkerState = 'applicant' | 'vetted' | 'active' | 'on_break' | 'suspended' | 'inactive'

export interface NannyWorker {
  id: string
  org_id: string
  profile_id: string | null
  shadow_name: string | null
  shadow_phone: string | null
  shadow_email: string | null
  worker_state: WorkerState
  suspension_reason: string | null
  role_type: 'caregiver' | 'senior_caregiver' | 'patient_care' | 'nanny' | 'cleaner' | 'maternity_nurse' | 'live_in' | 'both' | 'all'
  availability: WorkerAvailability
  hourly_rate: number | null
  preferences: WorkerPreferences
  avg_rating: number | null
  total_assignments: number
  claim_token: string | null
  notes: string | null
  show_on_public: boolean
  payment_details: string | null
  created_at: string
  updated_at: string
  // Joined
  profile?: {
    display_name: string
    avatar_url: string | null
    handle: string
    category: string | null
    location_area: string | null
  }
  credentials?: NannyWorkerCredential[]
}

export interface WorkerAvailability {
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]
  start_time: string   // HH:MM
  end_time: string     // HH:MM
  start_date?: string  // ISO date
  end_date?: string    // ISO date
}

export interface WorkerPreferences {
  age_groups?: string[]            // ['0-2', '2-5', '5-10', '10+']
  property_types?: string[]        // ['house', 'flat', 'commercial']
  travel_radius_km?: number
  has_car?: boolean
  speaks?: string[]                // languages
  live_in_available?: boolean
  overnight_available?: boolean
}

// ─── Worker Credentials ──────────────────────────────────────────────────────

export type CredentialStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked'

export interface NannyWorkerCredential {
  id: string
  worker_id: string
  credential_type_id: string
  file_url: string | null
  status: CredentialStatus
  issue_date: string | null
  expiry_date: string | null
  certificate_number: string | null
  issuing_body: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  // Joined
  credential_type?: NannyCredentialType
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface NannyClient {
  id: string
  org_id: string
  profile_id: string | null
  client_name: string
  client_email: string | null
  client_phone: string | null
  anon_token: string | null
  client_type: 'family' | 'individual' | 'corporate' | 'care_home'
  status: 'active' | 'suspended' | 'inactive'
  details: ClientDetails
  preferred_worker_ids: string[]
  notes: string | null
  paystack_auth_code: string | null
  next_billing_date: string | null
  billing_plan: string | null
  created_at: string
  updated_at: string
}

export interface ClientDetails {
  // For families
  children?: { age: number; name?: string; notes?: string }[]
  pets?: string[]
  special_requirements?: string
  // For cleaning
  property_type?: string
  property_size_sqm?: number
  access_notes?: string
  // Common
  address?: string
  parking_available?: boolean
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export type BookingState =
  | 'open' | 'matched' | 'scheduled' | 'confirmed'
  | 'in_progress' | 'completed' | 'cancelled' | 'closed'

export interface NannyBooking {
  id: string
  org_id: string
  client_id: string
  service_type_id: string | null
  reference: string
  booking_state: BookingState
  cancellation_reason: string | null
  cancelled_at: string | null
  scheduled_start: string
  scheduled_end: string
  actual_start: string | null
  actual_end: string | null
  service_address: string
  location_notes: string | null
  service_notes: string | null
  special_requirements?: Record<string, any>
  is_emergency: boolean
  quoted_rate: number
  pricing_model: 'hourly' | 'fixed' | 'recurring_monthly'
  source: 'direct' | 'widget' | 'admin' | 'api'
  requested_worker_id?: string | null
  pricing_unit?: string
  custom_pricing_enabled?: boolean
  agency_commission_pct?: number | null
  unit_rate?: number | null
  advanced_settings?: Record<string, any> | null
  created_at: string
  updated_at: string
  // Joined
  client?: NannyClient
  service_type?: NannyServiceType
  assignments?: NannyAssignment[]
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export type AssignmentState =
  | 'proposed' | 'worker_accepted' | 'client_confirmed'
  | 'in_progress' | 'completed' | 'cancelled' | 'no_show'

export interface NannyAssignment {
  id: string
  booking_id: string
  worker_id: string
  org_id: string
  assignment_state: AssignmentState
  cancellation_reason: string | null
  cancelled_at: string | null
  proposed_by: string | null
  worker_responded_at: string | null
  client_responded_at: string | null
  completed_at: string | null
  hourly_rate: number | null
  is_emergency: boolean
  hours_worked: number | null
  base_amount: number
  surcharge_amount: number
  holiday_pay: number
  total_amount: number
  agency_revenue: number
  worker_payout: number
  rating_score?: number | null
  worker_review: string | null
  rated_at: string | null
  created_at: string
  updated_at: string
  // Joined
  worker?: NannyWorker
  booking?: NannyBooking
}

// ─── Time Logs ───────────────────────────────────────────────────────────────

export interface NannyTimeLog {
  id: string
  assignment_id: string
  worker_id: string
  clocked_in_at: string | null
  clocked_out_at: string | null
  is_manual_entry: boolean
  duration_minutes: number | null
  notes: string | null
  created_at: string
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export type InvoiceState = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'voided' | 'disputed'

export interface NannyInvoice {
  id: string
  org_id: string
  client_id: string
  assignment_id: string | null
  invoice_number: string
  invoice_state: InvoiceState
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string
  payment_method: string | null
  payment_reference: string | null
  paid_at: string | null
  payment_token: string | null
  payment_token_expires: string | null
  issued_at: string
  due_at: string
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  client?: NannyClient
  items?: NannyInvoiceItem[]
}

export interface NannyInvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

// ─── Ratings ─────────────────────────────────────────────────────────────────

export interface NannyRating {
  id: string
  org_id: string
  assignment_id: string
  worker_id: string
  client_id: string
  overall: number
  dimensions: {
    punctuality?: number
    reliability?: number
    care_quality?: number
    communication?: number
    [key: string]: number | undefined
  }
  review_text: string | null
  reviewer_name: string | null
  is_public: boolean
  case_proof_item_id: string | null
  created_at: string
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface NannyNotification {
  id: string
  org_id: string
  worker_id: string | null
  client_id: string | null
  type: string
  channel: 'email' | 'sms' | 'push' | 'in_app'
  subject: string | null
  body: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  sent_at: string | null
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

// ─── Compliance View ──────────────────────────────────────────────────────────

export interface WorkerComplianceRow {
  worker_id: string
  org_id: string
  worker_name: string
  worker_state: WorkerState
  role_type: string
  credential_type_id: string
  code: string
  credential_name: string
  is_required: boolean
  credential_id: string | null
  credential_status: string | null
  expiry_date: string | null
  compliance_status: 'ok' | 'missing' | 'expired' | 'revoked' | 'rejected' | 'pending_review' | 'expiring_soon'
}

// ─── Org Member ───────────────────────────────────────────────────────────────

export interface NannyOrgMember {
  id: string
  org_id: string
  profile_id: string
  role: 'owner' | 'admin' | 'dispatcher'
  created_at: string
  profile?: {
    display_name: string
    avatar_url: string | null
    handle: string
  }
}

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface AnonBookingResult {
  booking_id: string
  reference: string
  anon_token: string | null
  client_id: string
}

export interface AssignmentSummary {
  assignment_id: string
  org_id: string
  booking_id: string
  booking_reference: string
  scheduled_start: string
  scheduled_end: string
  service_address: string
  assignment_state: AssignmentState
  worker_id: string
  worker_name: string
  worker_avatar: string | null
  hours_worked: number | null
  total_amount: number | null
  worker_rating: number | null
  client_id: string
  client_name: string
  client_phone: string | null
  service_type_name: string | null
  is_emergency: boolean
  booking_created_at: string
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface NannyDashboardStats {
  active_workers: number
  open_bookings: number
  bookings_today: number
  revenue_mtd: number
  pending_credentials: number
  avg_worker_rating: number
  assignments_this_week: number
}
