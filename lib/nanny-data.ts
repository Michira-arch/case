/**
 * Nanny Agency — Supabase data access layer
 * Server-side functions for the nanny caregiving feature
 */

import { createClient, createServiceClient } from '@/lib/supabase/server'
import type {
  NannyOrg,
  NannyWorker,
  NannyClient,
  NannyBooking,
  NannyAssignment,
  NannyServiceType,
  NannyCredentialType,
  NannyWorkerCredential,
  NannyInvoice,
  NannyRating,
  NannyDashboardStats,
  AssignmentSummary,
  WorkerComplianceRow,
} from '@/lib/nanny-types'

// ─── Orgs ────────────────────────────────────────────────────────────────────

const DEFAULT_DEMO_ORG: NannyOrg = {
  id: '00000000-0000-0000-0000-000000000001',
  owner_profile_id: '00000000-0000-0000-0000-000000000000',
  slug: 'sunny-smiles',
  name: 'Sunny Smiles Nanny & Caregiving Agency',
  tagline: 'Trusted, DBS-checked nannies and professional domestic care for your family',
  description: 'Sunny Smiles connects families with vetted, highly-qualified nannies, maternity nurses, and domestic caregivers. Every worker is verified with proof of experience and compliance certificates.',
  logo_url: null,
  cover_url: null,
  vertical: 'all',
  status: 'active',
  contact_email: 'contact@sunnysmiles.care',
  contact_phone: '+254 712 345 678',
  address: 'Kilimani, Nairobi, Kenya',
  location_area: 'Nairobi',
  policy: {
    matching_mode: 'shortlist',
    cancellation_grace_hours: 24,
    emergency_surcharge_pct: 20,
    holiday_pay_rate: 0.1207,
    overtime_multiplier: 1.5,
    overtime_threshold_hours: 8,
    payout_cadence: 'weekly',
    platform_commission_pct: 15,
    auto_invoice: true,
    require_timelog: true,
    continuity_preference: true,
  },
  is_public: true,
  seo_title: 'Sunny Smiles Nanny & Caregiving Agency',
  seo_description: 'Book verified nannies, maternity nurses, and caregivers in Nairobi.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const DEFAULT_DEMO_SERVICES: NannyServiceType[] = [
  // ── 1. Caregiving (Primary Vertical) ──
  {
    id: '00000000-0000-0000-0000-000000000101',
    org_id: '00000000-0000-0000-0000-000000000001',
    code: 'elderly_care',
    name: 'Senior & Elderly Home Care',
    description: 'Dedicated daily assistance, companionship, mobility support, and medication management for seniors.',
    vertical: 'caregiving',
    pricing_model: 'hourly',
    base_rate: 16.00,
    min_hours: 3,
    max_hours: 12,
    required_credentials: ['health_social_care', 'elder_care_cert', 'med_admin', 'caregiver_dbs'],
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    org_id: '00000000-0000-0000-0000-000000000001',
    code: 'patient_care',
    name: 'Specialized Patient & Recovery Care',
    description: 'Post-operative and chronic illness home care provided by certified healthcare assistants.',
    vertical: 'caregiving',
    pricing_model: 'hourly',
    base_rate: 18.00,
    min_hours: 4,
    max_hours: 12,
    required_credentials: ['health_social_care', 'med_admin', 'patient_handling', 'caregiver_dbs'],
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000103',
    org_id: '00000000-0000-0000-0000-000000000001',
    code: 'dementia_support',
    name: 'Dementia & Memory Care',
    description: 'Specialist, patient-centered support for individuals living with Alzheimer’s or dementia.',
    vertical: 'caregiving',
    pricing_model: 'hourly',
    base_rate: 20.00,
    min_hours: 4,
    max_hours: 12,
    required_credentials: ['health_social_care', 'dementia_care', 'caregiver_dbs'],
    is_active: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000104',
    org_id: '00000000-0000-0000-0000-000000000001',
    code: 'companionship',
    name: 'Companionship & Assisted Living',
    description: 'Social engagement, light meal prep, errand assistance, and home accompaniment.',
    vertical: 'caregiving',
    pricing_model: 'hourly',
    base_rate: 14.00,
    min_hours: 2,
    max_hours: 8,
    required_credentials: ['caregiver_dbs'],
    is_active: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },

  // ── 2. Childcare & Nanny (Complementary Vertical) ──
  {
    id: '00000000-0000-0000-0000-000000000105',
    org_id: '00000000-0000-0000-0000-000000000001',
    code: 'daily_nanny',
    name: 'Daily Nanny & Childcare',
    description: 'Full-day or part-day dedicated childcare in your home by a verified nanny.',
    vertical: 'nanny',
    pricing_model: 'hourly',
    base_rate: 15.00,
    min_hours: 4,
    max_hours: 12,
    required_credentials: ['enhanced_dbs', 'paediatric_first_aid', 'safeguarding'],
    is_active: true,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000106',
    org_id: '00000000-0000-0000-0000-000000000001',
    code: 'maternity_nurse',
    name: 'Maternity Nurse Specialist',
    description: 'Specialist newborn care for post-natal support and infant feeding routines.',
    vertical: 'nanny',
    pricing_model: 'hourly',
    base_rate: 22.00,
    min_hours: 8,
    max_hours: 24,
    required_credentials: ['enhanced_dbs', 'paediatric_first_aid', 'cpr'],
    is_active: true,
    sort_order: 6,
    created_at: new Date().toISOString(),
  },

  // ── 3. Domestic Cleaning (Complementary Vertical) ──
  {
    id: '00000000-0000-0000-0000-000000000107',
    org_id: '00000000-0000-0000-0000-000000000001',
    code: 'regular_domestic',
    name: 'Regular Domestic Cleaning',
    description: 'Weekly or fortnightly house cleaning by a background-checked cleaner.',
    vertical: 'cleaning',
    pricing_model: 'hourly',
    base_rate: 12.00,
    min_hours: 2,
    max_hours: 8,
    required_credentials: ['basic_dbs', 'coshh'],
    is_active: true,
    sort_order: 7,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000108',
    org_id: '00000000-0000-0000-0000-000000000001',
    code: 'deep_clean',
    name: 'Deep Cleaning & Sanitization',
    description: 'Thorough one-off deep clean and sanitization of residential or commercial property.',
    vertical: 'cleaning',
    pricing_model: 'quoted',
    base_rate: null,
    min_hours: 4,
    max_hours: 12,
    required_credentials: ['basic_dbs', 'coshh'],
    is_active: true,
    sort_order: 8,
    created_at: new Date().toISOString(),
  },
]

export async function getNannyOrgBySlug(slug: string): Promise<NannyOrg | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('nanny_orgs')
      .select('*')
      .eq('slug', slug)
      .eq('is_public', true)
      .single()
    if (data) return data as NannyOrg
  } catch (err) {
    // ignore query errors and fallback to demo org
  }
  // Fallback demo org if requested slug is sunny-smiles, nanny, caregiving, or any unseeded slug
  return {
    ...DEFAULT_DEMO_ORG,
    slug: slug || 'sunny-smiles',
    name: slug && slug !== 'sunny-smiles'
      ? `${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')} Caregiving Agency`
      : DEFAULT_DEMO_ORG.name,
  }
}

export async function getNannyOrgsByOwner(ownerProfileId: string): Promise<NannyOrg[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('nanny_orgs')
    .select('*')
    .eq('owner_profile_id', ownerProfileId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data || []) as NannyOrg[]
}

export async function createNannyOrg(payload: {
  owner_profile_id: string
  slug: string
  name: string
  vertical: 'caregiving' | 'nanny' | 'cleaning' | 'all'
  tagline?: string
  description?: string
  contact_email?: string
  contact_phone?: string
  location_area?: string
}): Promise<{ org: NannyOrg | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('nanny_orgs')
    .insert(payload)
    .select()
    .single()
  if (error) return { org: null, error: error.message }
  return { org: data as NannyOrg, error: null }
}

export async function updateNannyOrg(
  orgId: string,
  delta: Partial<NannyOrg>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('nanny_orgs')
    .update({ ...delta, updated_at: new Date().toISOString() })
    .eq('id', orgId)
  return { error: error?.message || null }
}

// ─── Service Types ────────────────────────────────────────────────────────────

export async function getServiceTypes(orgId: string): Promise<NannyServiceType[]> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('nanny_service_types')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('sort_order')
    if (data && data.length > 0) {
      return data as NannyServiceType[]
    }
  } catch (err) {
    // fallback
  }
  return DEFAULT_DEMO_SERVICES
}

// ─── Workers ──────────────────────────────────────────────────────────────────

export async function getWorkers(orgId: string, state?: string): Promise<NannyWorker[]> {
  const supabase = createClient()
  let query = supabase
    .from('nanny_workers')
    .select(`
      *,
      profile:profiles(display_name, avatar_url, handle, category, location_area)
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (state) {
    query = query.eq('worker_state', state)
  }

  const { data } = await query
  return (data || []) as unknown as NannyWorker[]
}

export async function getWorkerById(workerId: string): Promise<NannyWorker | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('nanny_workers')
    .select(`
      *,
      profile:profiles(display_name, avatar_url, handle, category, location_area),
      credentials:nanny_worker_credentials(
        *,
        credential_type:nanny_credential_types(*)
      )
    `)
    .eq('id', workerId)
    .single()
  return data as unknown as NannyWorker | null
}

export async function updateWorkerState(
  workerId: string,
  state: NannyWorker['worker_state'],
  reason?: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('nanny_workers')
    .update({
      worker_state: state,
      suspension_reason: state === 'suspended' ? reason : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workerId)
  return { error: error?.message || null }
}

export async function createShadowWorker(payload: {
  org_id: string
  shadow_name: string
  shadow_phone?: string
  shadow_email?: string
  role_type: NannyWorker['role_type']
  hourly_rate?: number
}): Promise<{ worker: NannyWorker | null; error: string | null }> {
  const supabase = createClient()
  // Generate claim token
  const claimToken = generateToken(32)
  const claimExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('nanny_workers')
    .insert({
      ...payload,
      claim_token: claimToken,
      claim_token_expires: claimExpires,
    })
    .select()
    .single()
  if (error) return { worker: null, error: error.message }
  return { worker: data as NannyWorker, error: null }
}

// ─── Worker Credentials ───────────────────────────────────────────────────────

export async function getWorkerCredentials(workerId: string): Promise<NannyWorkerCredential[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('nanny_worker_credentials')
    .select(`
      *,
      credential_type:nanny_credential_types(*)
    `)
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
  return (data || []) as unknown as NannyWorkerCredential[]
}

export async function submitCredential(payload: {
  worker_id: string
  credential_type_id: string
  file_url?: string
  issue_date?: string
  expiry_date?: string
  certificate_number?: string
  issuing_body?: string
}): Promise<{ credential: NannyWorkerCredential | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('nanny_worker_credentials')
    .upsert(
      { ...payload, status: 'pending' },
      { onConflict: 'worker_id,credential_type_id', ignoreDuplicates: false }
    )
    .select()
    .single()
  if (error) return { credential: null, error: error.message }
  return { credential: data as NannyWorkerCredential, error: null }
}

export async function reviewCredential(
  credentialId: string,
  decision: 'approved' | 'rejected',
  reviewerProfileId: string,
  options?: { expiryDate?: string; rejectionReason?: string }
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('nanny_worker_credentials')
    .update({
      status: decision,
      reviewed_by: reviewerProfileId,
      reviewed_at: new Date().toISOString(),
      expiry_date: options?.expiryDate,
      rejection_reason: options?.rejectionReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', credentialId)
  return { error: error?.message || null }
}

export async function getWorkerCompliance(orgId: string): Promise<WorkerComplianceRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('nanny_worker_compliance')
    .select('*')
    .eq('org_id', orgId)
  return (data || []) as WorkerComplianceRow[]
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients(orgId: string): Promise<NannyClient[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('nanny_clients')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  return (data || []) as NannyClient[]
}

export async function getClientById(clientId: string): Promise<NannyClient | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('nanny_clients')
    .select('*')
    .eq('id', clientId)
    .single()
  return data as NannyClient | null
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getBookings(
  orgId: string,
  options?: { state?: string; from?: string; to?: string; limit?: number }
): Promise<NannyBooking[]> {
  const supabase = createClient()
  let query = supabase
    .from('nanny_bookings')
    .select(`
      *,
      client:nanny_clients(id, client_name, client_email, client_phone, client_type),
      service_type:nanny_service_types(id, name, code, pricing_model, base_rate),
      assignments:nanny_assignments(
        id, assignment_state, hourly_rate, hours_worked, total_amount,
        worker:nanny_workers(
          id, shadow_name, worker_state,
          profile:profiles(display_name, avatar_url, handle)
        )
      )
    `)
    .eq('org_id', orgId)
    .order('scheduled_start', { ascending: false })

  if (options?.state) query = query.eq('booking_state', options.state)
  if (options?.from) query = query.gte('scheduled_start', options.from)
  if (options?.to) query = query.lte('scheduled_start', options.to)
  if (options?.limit) query = query.limit(options.limit)

  const { data } = await query
  return (data || []) as unknown as NannyBooking[]
}

export async function getBookingById(bookingId: string): Promise<NannyBooking | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('nanny_bookings')
    .select(`
      *,
      client:nanny_clients(*),
      service_type:nanny_service_types(*),
      assignments:nanny_assignments(
        *,
        worker:nanny_workers(
          *,
          profile:profiles(display_name, avatar_url, handle)
        )
      )
    `)
    .eq('id', bookingId)
    .single()
  return data as unknown as NannyBooking | null
}

export async function createBooking(payload: {
  org_id: string
  client_id: string
  service_type_id?: string
  scheduled_start: string
  scheduled_end: string
  service_address: string
  service_notes?: string
  special_requirements?: Record<string, any>
  is_emergency?: boolean
  quoted_rate?: number
  quoted_hours?: number
  source?: string
}): Promise<{ booking: NannyBooking | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('nanny_bookings')
    .insert({ ...payload, booking_state: 'open' })
    .select()
    .single()
  if (error) return { booking: null, error: error.message }
  return { booking: data as NannyBooking, error: null }
}

export async function updateBookingState(
  bookingId: string,
  state: NannyBooking['booking_state'],
  reason?: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('nanny_bookings')
    .update({
      booking_state: state,
      cancellation_reason: state === 'cancelled' ? reason : undefined,
      cancelled_at: state === 'cancelled' ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
  return { error: error?.message || null }
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function proposeAssignment(payload: {
  booking_id: string
  worker_id: string
  org_id: string
  hourly_rate: number
  proposed_by?: string
}): Promise<{ assignment: NannyAssignment | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('nanny_assignments')
    .insert({ ...payload, assignment_state: 'proposed' })
    .select()
    .single()
  if (error) return { assignment: null, error: error.message }

  // Update booking state to matched
  await supabase
    .from('nanny_bookings')
    .update({ booking_state: 'matched', updated_at: new Date().toISOString() })
    .eq('id', payload.booking_id)

  return { assignment: data as NannyAssignment, error: null }
}

export async function updateAssignmentState(
  assignmentId: string,
  state: NannyAssignment['assignment_state'],
  reason?: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const update: Record<string, any> = {
    assignment_state: state,
    updated_at: new Date().toISOString(),
  }

  if (state === 'worker_accepted') update.worker_responded_at = new Date().toISOString()
  if (state === 'client_confirmed') {
    update.client_responded_at = new Date().toISOString()
    // Also update booking state
    const { data: assignment } = await supabase
      .from('nanny_assignments')
      .select('booking_id')
      .eq('id', assignmentId)
      .single()
    if (assignment) {
      await supabase
        .from('nanny_bookings')
        .update({ booking_state: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', assignment.booking_id)
    }
  }
  if (state === 'cancelled') {
    update.cancelled_at = new Date().toISOString()
    update.cancellation_reason = reason
  }

  const { error } = await supabase
    .from('nanny_assignments')
    .update(update)
    .eq('id', assignmentId)
  return { error: error?.message || null }
}

export async function clockInWorker(assignmentId: string, workerId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  // Create time log entry
  const { error: logError } = await supabase
    .from('nanny_time_logs')
    .insert({ assignment_id: assignmentId, worker_id: workerId, clocked_in_at: new Date().toISOString() })

  if (logError) return { error: logError.message }

  // Update assignment and booking state
  await supabase
    .from('nanny_assignments')
    .update({ assignment_state: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', assignmentId)

  const { data: assignment } = await supabase
    .from('nanny_assignments')
    .select('booking_id')
    .eq('id', assignmentId)
    .single()

  if (assignment) {
    await supabase
      .from('nanny_bookings')
      .update({
        booking_state: 'in_progress',
        actual_start: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment.booking_id)
  }

  return { error: null }
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoices(orgId: string): Promise<NannyInvoice[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('nanny_invoices')
    .select(`
      *,
      client:nanny_clients(client_name, client_email, client_phone),
      items:nanny_invoice_items(*)
    `)
    .eq('org_id', orgId)
    .order('issued_at', { ascending: false })
  return (data || []) as unknown as NannyInvoice[]
}

export async function getInvoiceByToken(token: string): Promise<NannyInvoice | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('nanny_invoices')
    .select(`
      *,
      client:nanny_clients(client_name, client_email),
      items:nanny_invoice_items(*)
    `)
    .eq('payment_token', token)
    .gt('payment_token_expires', new Date().toISOString())
    .single()
  return data as unknown as NannyInvoice | null
}

// ─── Ratings ──────────────────────────────────────────────────────────────────

export async function getWorkerRatings(workerId: string): Promise<NannyRating[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('nanny_ratings')
    .select('*')
    .eq('worker_id', workerId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
  return (data || []) as NannyRating[]
}

export async function submitRating(payload: {
  org_id: string
  assignment_id: string
  worker_id: string
  client_id: string
  overall: number
  dimensions?: Record<string, number>
  review_text?: string
  reviewer_name?: string
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('nanny_ratings')
    .upsert(
      { ...payload, dimensions: payload.dimensions || {} },
      { onConflict: 'assignment_id' }
    )
  return { error: error?.message || null }
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getNannyDashboardStats(orgId: string): Promise<NannyDashboardStats> {
  const supabase = createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [workers, openBookings, todayBookings, revenue, pendingCreds, weekAssignments, avgRating] =
    await Promise.all([
      supabase.from('nanny_workers').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('worker_state', 'active'),
      supabase.from('nanny_bookings').select('id', { count: 'exact', head: true }).eq('org_id', orgId).in('booking_state', ['open', 'matched', 'scheduled', 'confirmed']),
      supabase.from('nanny_bookings').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('scheduled_start', startOfToday).lt('scheduled_start', endOfToday),
      supabase.from('nanny_invoices').select('total').eq('org_id', orgId).eq('invoice_state', 'paid').gte('paid_at', startOfMonth),
      supabase.from('nanny_worker_credentials').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('nanny_assignments').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', startOfWeek),
      supabase.from('nanny_workers').select('avg_rating').eq('org_id', orgId).eq('worker_state', 'active').not('avg_rating', 'is', null),
    ])

  const revenueMtd = (revenue.data || []).reduce((sum: number, r: { total: number }) => sum + (r.total || 0), 0)
  const avgWorkerRating =
    (avgRating.data || []).length > 0
      ? (avgRating.data || []).reduce((sum: number, r: any) => sum + (r.avg_rating || 0), 0) /
        (avgRating.data || []).length
      : 0

  return {
    active_workers: workers.count || 0,
    open_bookings: openBookings.count || 0,
    bookings_today: todayBookings.count || 0,
    revenue_mtd: revenueMtd,
    pending_credentials: pendingCreds.count || 0,
    avg_worker_rating: Math.round(avgWorkerRating * 10) / 10,
    assignments_this_week: weekAssignments.count || 0,
  }
}

// ─── Anon Booking ─────────────────────────────────────────────────────────────

export async function createAnonBooking(payload: {
  org_slug: string
  client_name: string
  client_email: string
  client_phone: string
  service_code: string
  start: string
  end_time: string
  address: string
  notes?: string
  special?: Record<string, any>
}): Promise<{ result: any; error: string | null }> {
  const supabase = createServiceClient()

  // Ensure org exists in DB before creating booking
  const { data: existingOrg } = await supabase
    .from('nanny_orgs')
    .select('id')
    .eq('slug', payload.org_slug)
    .single()

  if (!existingOrg) {
    // Find or pick a profile to act as owner
    const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1).single()
    const ownerId = firstProfile?.id

    if (ownerId) {
      await supabase.from('nanny_orgs').insert({
        owner_profile_id: ownerId,
        slug: payload.org_slug,
        name: payload.org_slug === 'sunny-smiles' ? DEFAULT_DEMO_ORG.name : `${payload.org_slug} Caregiving Agency`,
        tagline: DEFAULT_DEMO_ORG.tagline,
        description: DEFAULT_DEMO_ORG.description,
        vertical: DEFAULT_DEMO_ORG.vertical,
        status: 'active',
        is_public: true,
        contact_email: payload.client_email || DEFAULT_DEMO_ORG.contact_email,
        contact_phone: payload.client_phone || DEFAULT_DEMO_ORG.contact_phone,
      })
    }
  }

  const { data, error } = await supabase.rpc('nanny_create_anon_booking', {
    p_org_slug: payload.org_slug,
    p_client_name: payload.client_name,
    p_client_email: payload.client_email,
    p_client_phone: payload.client_phone,
    p_service_code: payload.service_code,
    p_start: payload.start,
    p_end_time: payload.end_time,
    p_address: payload.address,
    p_notes: payload.notes || null,
    p_special: payload.special || {},
  })
  if (error) return { result: null, error: error.message }
  return { result: data, error: null }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateToken(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export {
  formatCurrency,
  formatDuration,
  getComplianceColor,
  getWorkerStateColor,
  getBookingStateColor,
} from '@/lib/nanny-utils'
