// Supabase client types matching our database schema

export type Persona = 'service' | 'professional' | 'jobseeker'
export type Pillar = 'did' | 'trained' | 'vouched' | 'aiming'
export type EvidenceType = 'img' | 'pdf' | 'vid'
export type Plan = 'free' | 'plus'
export type PlanPeriod = '6m' | '12m'
export type PaymentStatus = 'pending' | 'success' | 'failed'
export type VouchStatus = 'pending' | 'completed' | 'expired'

export interface Profile {
  id: string
  owner_id: string
  handle: string
  persona: Persona
  display_name: string
  role_line: string | null
  tagline: string | null
  avatar_url: string | null
  socials: SocialLink[]
  is_public: boolean
  locale: 'en' | 'sw'
  category: string | null
  tags: string[]
  location_area: string | null
  discoverable: boolean
  showcase_images: string[]
  physical_attributes?: {
    height?: string
    build?: string
    bio?: string
    photo_url?: string
  }
  created_at: string
  updated_at: string
}

export interface SocialLink {
  platform: string
  url: string
}

export interface ProofItem {
  id: string
  profile_id: string
  pillar: Pillar
  title: string
  detail: string | null
  when_label: string | null
  visible: boolean
  sort_order: number
  source: 'owner' | 'vouch_request'
  created_at: string
  updated_at: string
  evidence?: Evidence[]
}

export interface Evidence {
  id: string
  proof_item_id: string
  type: EvidenceType
  storage_key: string
  caption: string | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  bytes_original: number | null
  bytes_compressed: number | null
  created_at: string
}

export interface VouchRequest {
  id: string
  profile_id: string
  token: string
  recipient_label: string | null
  message: string | null
  status: VouchStatus
  created_at: string
  expires_at: string
  completed_at: string | null
  resulting_proof_item_id: string | null
}

export interface Payment {
  id: string
  profile_id: string
  paystack_reference: string
  amount_kes: number
  plan_period: PlanPeriod
  channel: string | null
  status: PaymentStatus
  created_at: string
}

export interface Subscription {
  id: string
  profile_id: string
  plan: Plan
  current_period_end: string | null
  last_payment_id: string | null
  created_at: string
  updated_at: string
}

export interface PricingPlan {
  id: PlanPeriod
  label: string
  amount_kes: number
  months: number
  description: string
}

// Assembled public profile (from get_public_profile RPC)
export interface PublicProfile {
  id: string
  handle: string
  persona: Persona
  display_name: string
  role_line: string | null
  tagline: string | null
  avatar_url: string | null
  socials: SocialLink[]
  category: string | null
  tags: string[]
  location_area: string | null
  locale: string
  plan: Plan
  plan_expires: string | null
  showcase_images?: string[]
  physical_attributes?: {
    height?: string
    build?: string
    bio?: string
    photo_url?: string
  }
  proof_items: PublicProofItem[]
}

export interface PublicProofItem {
  id: string
  pillar: Pillar
  title: string
  detail: string | null
  when_label: string | null
  sort_order: number
  source: string
  created_at: string
  evidence: PublicEvidence[] | null
}

export interface PublicEvidence {
  id: string
  type: EvidenceType
  storage_key: string
  caption: string | null
  width: number | null
  height: number | null
  duration_seconds: number | null
}

export interface AnalyticsSummary {
  total_views: number
  views_7d: number
  evidence_taps: number
  social_clicks: number
  sparkline: { date: string; views: number }[]
  referrers: { host: string; count: number }[] | null
  device_split: { device: string; count: number }[] | null
}

export interface CompletenessData {
  score: number
  tip: string
}
