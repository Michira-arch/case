'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Profile, ProofItem, Subscription } from '@/lib/types'
import type { User } from '@supabase/supabase-js'
import { calculateCompleteness } from '@/lib/completeness'
import { createClient } from '@/lib/supabase/client'
import { getMediaUrl } from '@/lib/r2'
import styles from './DashboardClient.module.css'

interface Props {
  user: User
  profiles: Profile[]
  activeProfile: Profile | null
  subscription: Subscription | null
  proofItems: ProofItem[]
  monthlyViews?: number
}

const PILLAR_ORDER = ['did', 'trained', 'vouched', 'aiming'] as const

export default function DashboardClient({
  user,
  profiles,
  activeProfile,
  subscription,
  proofItems,
  monthlyViews = 0,
}: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ProofItem[]>(proofItems)
  const plan = subscription?.plan || 'free'
  const profile = activeProfile

  const { score, tip } = calculateCompleteness(profile || {}, items)

  const initials = profile?.display_name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || '')
  const profileUrl = profile ? `${appUrl}/@${profile.handle}` : ''

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(profileUrl)
  }

  const handleShare = async () => {
    if (navigator.share && profile) {
      try {
        await navigator.share({
          title: `${profile.display_name} — Case`,
          url: profileUrl,
        })
      } catch { await handleCopyLink() }
    } else {
      await handleCopyLink()
    }
  }

  const handleToggleVisibility = async (itemId: string, currentVisible: boolean) => {
    const supabase = createClient()
    await supabase
      .from('proof_items')
      .update({ visible: !currentVisible })
      .eq('id', itemId)

    setItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, visible: !i.visible } : i)
    )
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this proof item and all its evidence?')) return
    const supabase = createClient()
    await supabase.from('proof_items').delete().eq('id', itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  if (!profile) {
    return (
      <div className={styles.empty}>
        <h2>Welcome to Case</h2>
        <p>Let's build your proof-of-work profile.</p>
        <Link href="/onboarding" className="btn btn--brass btn--lg">
          Get started
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.dash}>
      {/* Header */}
      <div className={styles.head}>
        <div className={styles.who}>
          <Link href="/dashboard/settings" className={styles.avatarLink} title="Change profile photo">
            {profile.avatar_url ? (
              <img src={getMediaUrl(profile.avatar_url)} alt="" className={styles.avatarImg} />
            ) : (
              <div className={styles.avatar}>{initials}</div>
            )}
          </Link>
          <div>
            <p className={styles.name}>{profile.display_name}</p>
            <p className={styles.handle}>
              case.app/<span>@{profile.handle}</span>
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline btn--sm"
          >
            Preview
          </a>
          <button onClick={handleShare} className="btn btn--dark btn--sm">
            Share
          </button>
          <Link href="/dashboard/proof/new" className="btn btn--brass btn--sm">
            + Add proof
          </Link>
        </div>
      </div>

      {/* Completeness bar */}
      <div className={styles.completeness}>
        <div className={styles.completenessTop}>
          <span>Your case is <b>{score}%</b> built</span>
          <span className={styles.tip}>{tip}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Views limit bar (only for free plan) */}
      {plan === 'free' && (
        <div className={styles.completeness} style={{ marginTop: '16px' }}>
          <div className={styles.completenessTop}>
            <span>Monthly Views: <b>{monthlyViews} / 100</b></span>
            <span className={styles.tip} style={{ color: monthlyViews >= 80 ? '#c81e1e' : 'var(--brass-deep)' }}>
              {monthlyViews >= 80 
                ? "Warning: Approaching limit! Upgrade to avoid profile suspension."
                : "Resetting on the 1st of next month. Upgrade for unlimited views."}
            </span>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${Math.min(100, monthlyViews)}%`,
                backgroundColor: monthlyViews >= 80 ? '#c81e1e' : 'var(--brass-deep)'
              }} 
            />
          </div>
        </div>
      )}

      {/* Plan banner */}
      {plan === 'free' && (
        <div className={styles.planBanner}>
          <span>You're on the free plan — limited to 100 profile views/mo, 4 items per pillar, and 2 evidence files per item.</span>
          <Link href="/dashboard/billing" className="btn btn--brass btn--sm">
            Upgrade to Case+
          </Link>
        </div>
      )}

      {/* Proof items */}
      <div className={styles.itemsSection}>
        <p className={styles.sectionTitle}>Your proof, all in one place</p>
        <p className={styles.sectionSub}>
          Every claim is stronger with something behind it — a photo, a certificate, a screenshot, a video.
        </p>

        {PILLAR_ORDER.map(pillar => {
          const pillarItems = items.filter(i => i.pillar === pillar)
          return (
            <div key={pillar} className={styles.pillarGroup}>
              <div className={styles.pillarHeader}>
                <span className={`stamp stamp--${pillar}`}>{pillar}</span>
                <span className={styles.pillarCount}>{pillarItems.length}</span>
              </div>
              {pillarItems.length === 0 ? (
                <div className={styles.pillarEmpty}>
                  <Link href={`/dashboard/proof/new?pillar=${pillar}`} className={styles.addPillarBtn}>
                    + Add a {pillar} item
                  </Link>
                </div>
              ) : (
                pillarItems.map(item => (
                  <ProofItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => handleToggleVisibility(item.id, item.visible)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))
              )}
            </div>
          )
        })}
      </div>

      {/* Add proof CTA */}
      <div className={styles.addSection}>
        <Link href="/dashboard/proof/new" className={styles.addToggle}>
          + Add a piece of proof
        </Link>
      </div>

      {/* Recommendation request section */}
      <div className={styles.vouchSection}>
        <div className={styles.vouchHead}>
          <div>
            <p className={styles.sectionTitle}>Recommendation requests</p>
            <p className={styles.sectionSub}>
              Send a link to a client or employer — they submit a recommendation directly.
            </p>
          </div>
          <Link href="/dashboard/vouch/new" className="btn btn--outline btn--sm">
            Request recommendation
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ---- Proof item row ---- */
function ProofItemRow({ item, onToggle, onDelete }: {
  item: ProofItem
  onToggle: () => void
  onDelete: () => void
}) {
  const evidenceCount = (item as any).evidence?.length ?? 0

  return (
    <div className={`${styles.itemRow} ${!item.visible ? styles.itemHidden : ''}`}>
      <div className={styles.itemTop}>
        <div className={styles.itemInfo}>
          <h4 className={styles.itemTitle}>{item.title}</h4>
          {item.detail && <p className={styles.itemDetail}>{item.detail}</p>}
        </div>
        <div className={styles.itemControls}>
          <span className={`badge ${item.visible ? 'badge--green' : 'badge--muted'}`}>
            {item.visible ? 'public' : 'hidden'}
          </span>
          <Link href={`/dashboard/proof/${item.id}/edit`} className={styles.editLink}>
            Edit
          </Link>
        </div>
      </div>
      <div className={styles.itemBottom}>
        {evidenceCount > 0 ? (
          <span className="evidence-pill">
            📎 {evidenceCount} {evidenceCount === 1 ? 'file' : 'files'}
          </span>
        ) : (
          <Link href={`/dashboard/proof/${item.id}/edit?tab=evidence`} className="evidence-pill evidence-pill--empty">
            + Add evidence
          </Link>
        )}
        <div className={styles.itemActions}>
          <button onClick={onToggle} className={styles.actionBtn}>
            {item.visible ? 'Hide' : 'Show'}
          </button>
          <button onClick={onDelete} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
