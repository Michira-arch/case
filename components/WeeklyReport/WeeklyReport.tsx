'use client'

import Link from 'next/link'
import type { Profile } from '@/lib/types'
import styles from './WeeklyReport.module.css'

interface WeeklyReportProps {
  profile: Profile
  weekViews: number
  prevWeekViews: number
  evidenceTaps: number
  socialClicks: number
  vouchCount: number
  itemsWithoutEvidence: number
  totalItems: number
  plan: 'free' | 'plus'
}

export default function WeeklyReport({
  profile,
  weekViews,
  prevWeekViews,
  evidenceTaps,
  socialClicks,
  vouchCount,
  itemsWithoutEvidence,
  totalItems,
  plan,
}: WeeklyReportProps) {
  const firstName = profile.display_name?.split(' ')[0] || 'there'
  const diff = weekViews - prevWeekViews
  const trending = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'

  function getViewsLine(): string {
    if (weekViews === 0) return `No one visited your Case this week yet — it needs to be shared to get seen.`
    if (trending === 'up') return `Your Case had ${weekViews} visitor${weekViews !== 1 ? 's' : ''} this week — ${diff} more than last week. 📈`
    if (trending === 'down') return `Your Case had ${weekViews} visitor${weekViews !== 1 ? 's' : ''} this week, ${Math.abs(diff)} fewer than last week.`
    return `Your Case had ${weekViews} visitor${weekViews !== 1 ? 's' : ''} this week — same as last week.`
  }

  function getEngagementLine(): string | null {
    if (weekViews === 0) return null
    if (evidenceTaps > 0) return `${evidenceTaps} ${evidenceTaps === 1 ? 'person' : 'people'} tapped into your evidence this week.`
    if (socialClicks > 0) return `${socialClicks} ${socialClicks === 1 ? 'person' : 'people'} clicked your social links.`
    return null
  }

  function getTip(): { text: string; cta: string; href: string } {
    if (vouchCount === 0) {
      return {
        text: `You don't have any vouches yet. Profiles with at least one vouch get significantly more trust from visitors.`,
        cta: 'Send a vouch request →',
        href: '/dashboard/vouch/new',
      }
    }
    if (itemsWithoutEvidence > 0) {
      return {
        text: `You have ${itemsWithoutEvidence} proof item${itemsWithoutEvidence > 1 ? 's' : ''} with no evidence attached. Evidence is what makes the difference between a claim and proof.`,
        cta: 'Add evidence →',
        href: '/dashboard',
      }
    }
    if (!(profile as any).claim_text) {
      return {
        text: `Your profile doesn't have a claim yet — the one thing you want people to believe about you.`,
        cta: 'Add your claim →',
        href: '/dashboard/settings',
      }
    }
    if (weekViews === 0 || weekViews < 5) {
      return {
        text: `The best way to get more views is to share your Case link — in your WhatsApp bio, Instagram bio, or in a message to someone you just did work for.`,
        cta: 'Copy your link →',
        href: '/dashboard',
      }
    }
    if (plan === 'free' && weekViews >= 20) {
      return {
        text: `You're getting good traffic. Case+ unlocks full analytics so you can see exactly where visitors come from.`,
        cta: 'Upgrade to Case+ →',
        href: '/dashboard/billing',
      }
    }
    return {
      text: `Keep adding evidence to your proof items. The more real proof you have, the more convincing your Case becomes.`,
      cta: 'Add a proof item →',
      href: '/dashboard/proof/new',
    }
  }

  const tip = getTip()
  const viewsLine = getViewsLine()
  const engLine = getEngagementLine()

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.badge}>This week</span>
        <span className={styles.date}>
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className={styles.body}>
        <p className={styles.greeting}>Hey {firstName} 👋</p>
        <p className={styles.message}>{viewsLine}</p>
        {engLine && <p className={styles.message}>{engLine}</p>}
      </div>

      <div className={styles.tip}>
        <span className={styles.tipLabel}>One thing that could help</span>
        <p className={styles.tipText}>{tip.text}</p>
        <Link href={tip.href} className={styles.tipCta}>{tip.cta}</Link>
      </div>
    </div>
  )
}
