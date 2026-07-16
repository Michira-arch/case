/**
 * Completeness score calculation (§6.2)
 * Weighted rule matching the spec:
 * - 20% base for profile basics filled in
 * - +10% per proof item with ≥1 evidence file, capped at 80%
 * - Total capped at 100%
 */

import type { Profile, ProofItem } from './types'

export function calculateCompleteness(
  profile: Partial<Profile>,
  proofItems: ProofItem[]
): { score: number; tip: string } {
  // Endowed Progress: Start at 30% for account creation and phone OTP verification
  let score = 30

  // Base: profile basics (15%)
  const hasBasics =
    profile.display_name &&
    profile.role_line &&
    profile.tagline
  if (hasBasics) score += 15

  // +5% if avatar set
  if (profile.avatar_url) score += 5

  // +10% if claim is set
  if (profile.claim_text) score += 10

  // Proof items with evidence (+10% per item, cap at 40%)
  const itemsWithEvidence = proofItems.filter(
    (item) => item.visible && (item.evidence?.length ?? 0) > 0
  )
  const evidenceScore = Math.min(40, itemsWithEvidence.length * 10)
  score += evidenceScore

  score = Math.min(100, score)

  // Generate tip
  const tip = getTip(profile, proofItems, score)

  return { score, tip }
}

function getTip(
  profile: Partial<Profile>,
  proofItems: ProofItem[],
  score: number
): string {
  if (score >= 90) return "Your Case is looking great — share it!"
  if (!profile.avatar_url) return "Add a photo to your profile"
  if (!profile.claim_text) return "Add your claim — state what you can do or the skill/knowledge you posit you possess"
  if (!profile.tagline) return "Add a tagline to tell your story"

  const withoutEvidence = proofItems.filter(
    (item) => item.visible && (item.evidence?.length ?? 0) === 0
  )
  if (withoutEvidence.length > 0) {
    return `Add evidence to "${withoutEvidence[0].title}" to build trust`
  }

  const pillarsPresent = new Set(proofItems.filter(i => i.visible).map(i => i.pillar))
  if (!pillarsPresent.has('vouched')) return "Ask a client for a recommendation — it's the most trusted proof"
  if (!pillarsPresent.has('aiming')) return "Add an 'aiming' item to show what you're looking for"
  if (!pillarsPresent.has('did')) return "Add a 'did' item — what work have you completed?"

  return "Add more evidence to strengthen your claims"
}

/**
 * Check if a profile is over the free tier limits
 */
export function checkFreeTierLimits(
  plan: 'free' | 'plus',
  proofItems: ProofItem[]
): {
  overProofItemLimit: boolean
  overEvidenceLimit: boolean
  pillarsOverLimit: string[]
} {
  if (plan === 'plus') {
    return { overProofItemLimit: false, overEvidenceLimit: false, pillarsOverLimit: [] }
  }

  const FREE_ITEMS_PER_PILLAR = 4
  const FREE_EVIDENCE_PER_ITEM = 2

  const pillarsOverLimit: string[] = []
  let overEvidenceLimit = false

  const byPillar = proofItems.reduce((acc, item) => {
    if (!acc[item.pillar]) acc[item.pillar] = []
    acc[item.pillar].push(item)
    return acc
  }, {} as Record<string, ProofItem[]>)

  for (const [pillar, items] of Object.entries(byPillar)) {
    if (items.length > FREE_ITEMS_PER_PILLAR) {
      pillarsOverLimit.push(pillar)
    }
  }

  for (const item of proofItems) {
    if ((item.evidence?.length ?? 0) > FREE_EVIDENCE_PER_ITEM) {
      overEvidenceLimit = true
      break
    }
  }

  return {
    overProofItemLimit: pillarsOverLimit.length > 0,
    overEvidenceLimit,
    pillarsOverLimit,
  }
}
