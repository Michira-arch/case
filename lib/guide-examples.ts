import type { ProofItem } from './types'

export const GUIDE_PROFILE = {
  display_name: 'Alex Rivera',
  role_line: 'Spatial Flow Coordinator',
  tagline: 'Optimizing layouts, physical movement, and layout flows for retail spaces, galleries, and events.',
  claim_text: 'I optimize how people move and feel in physical spaces. Whether it is a busy café or an exhibition, I design floor arrangements that reduce bottlenecks and increase comfort. The evidence below shows my blueprints and client feedback.',
  location_area: 'Nairobi CBD',
  avatar_url: null,
}

export const GUIDE_PROOF_ITEMS: ProofItem[] = [
  {
    id: 'guide-did',
    profile_id: 'guide-profile',
    pillar: 'did',
    title: 'Optimized Kilimani Art Gallery Layout',
    detail: 'Reconfigured layout for the 2026 Art Expo, increasing exhibition capacity by 45% and reducing bottlenecks near entrance checkpoints.',
    when_label: 'March 2026',
    visible: true,
    sort_order: 0,
    source: 'owner',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    evidence: []
  },
  {
    id: 'guide-trained',
    profile_id: 'guide-profile',
    pillar: 'trained',
    title: 'Advanced Spatial Layout & Flow Certification',
    detail: 'Completed intensive training in queue theory, spatial design, and public circulation safety at the Design Institute.',
    when_label: 'Graduated 2025',
    visible: true,
    sort_order: 0,
    source: 'owner',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    evidence: []
  },
  {
    id: 'guide-vouched',
    profile_id: 'guide-profile',
    pillar: 'vouched',
    title: 'Alex transformed our café customer journey',
    detail: 'From Brenda W. (Café Owner): "Alex rearranged our seating and ordering queue. Our checkout times dropped by 45s per customer and weekend sales rose by 18%."',
    when_label: 'April 2026',
    visible: true,
    sort_order: 0,
    source: 'owner',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    evidence: []
  },
  {
    id: 'guide-aiming',
    profile_id: 'guide-profile',
    pillar: 'aiming',
    title: 'Seeking layout design partnerships with retail stores',
    detail: 'Looking to consult with supermarkets and retail shops in Nairobi to audit, analyze, and optimize customer path-to-purchase flow.',
    when_label: 'Target: Mid 2026',
    visible: true,
    sort_order: 0,
    source: 'owner',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    evidence: []
  }
]

export function getGuideItem(id: string): ProofItem | undefined {
  return GUIDE_PROOF_ITEMS.find(item => item.id === id)
}
