import type { ProofItem } from './types'

export const FREE_ITEMS_PER_PILLAR = 4
export const FREE_EVIDENCE_PER_ITEM = 2
export const FREE_MONTHLY_VIEWS = 100

/**
 * Returns proof items with visibility flags adjusted for the free tier.
 * Items that should be hidden due to plan limits have a __downgraded flag added.
 * This is for UI display only — actual DB visibility is managed by the SQL function.
 */
export function applyFreeTierDisplay(
  items: ProofItem[],
  plan: 'free' | 'plus'
): (ProofItem & { __downgraded?: boolean })[] {
  if (plan === 'plus') return items

  const byPillar: Record<string, ProofItem[]> = {}
  for (const item of items) {
    if (!byPillar[item.pillar]) byPillar[item.pillar] = []
    byPillar[item.pillar].push(item)
  }

  return items.map(item => {
    const pillarItems = byPillar[item.pillar] || []
    const sorted = [...pillarItems].sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const rank = sorted.findIndex(i => i.id === item.id)
    if (rank >= FREE_ITEMS_PER_PILLAR) {
      return { ...item, __downgraded: true }
    }
    return item
  })
}

/**
 * Returns a human-readable message for a downgraded item.
 */
export function getDowngradeMessage(pillar: string): string {
  return `This item is hidden because your ${pillar} pillar has more than ${FREE_ITEMS_PER_PILLAR} items. Upgrade to Case+ to show all items.`
}
