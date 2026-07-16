'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { requestNotificationPermissionAndGetToken } from '@/lib/firebase'
import type { Profile, ProofItem, Subscription } from '@/lib/types'
import type { User } from '@supabase/supabase-js'
import { calculateCompleteness } from '@/lib/completeness'
import { createClient } from '@/lib/supabase/client'
import { getMediaUrl } from '@/lib/r2'
import { applyFreeTierDisplay, getDowngradeMessage } from '@/lib/downgrade'
import { GUIDE_PROOF_ITEMS } from '@/lib/guide-examples'
import WeeklyReport from '@/components/WeeklyReport/WeeklyReport'
import BusinessCardModal from '@/components/profile/BusinessCardModal'
import QuickActionDrawer from '@/components/dashboard/QuickActionDrawer'
import TrustQuest from '@/components/dashboard/TrustQuest'
import VisitorSimulator from '@/components/dashboard/VisitorSimulator'
import PwaManager from '@/components/dashboard/PwaManager'
import { getDisplayDomain } from '@/lib/domain'
import styles from './DashboardClient.module.css'

interface Props {
  user: User
  profiles: Profile[]
  activeProfile: Profile | null
  subscription: Subscription | null
  proofItems: ProofItem[]
  monthlyViews?: number
  weekViews?: number
  prevWeekViews?: number
  evidenceTapsWeek?: number
  socialClicksWeek?: number
  vouchCount?: number
  itemsWithoutEvidence?: number
}

const PILLAR_ORDER = ['did', 'trained', 'vouched', 'aiming'] as const

export default function DashboardClient({
  user,
  profiles,
  activeProfile,
  subscription,
  proofItems,
  monthlyViews = 0,
  weekViews = 0,
  prevWeekViews = 0,
  evidenceTapsWeek = 0,
  socialClicksWeek = 0,
  vouchCount = 0,
  itemsWithoutEvidence = 0,
}: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ProofItem[]>(proofItems)
  const plan = subscription?.plan || 'free'

  const [activeDrawer, setActiveDrawer] = useState<'avatar' | 'claim' | 'basics' | 'proof' | null>(null)
  const [localProfile, setLocalProfile] = useState(activeProfile)


  const [showGuide, setShowGuide] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const isGuideMode = showGuide && items.length === 0
  const displayItems = isGuideMode 
    ? applyFreeTierDisplay(GUIDE_PROOF_ITEMS, plan)
    : applyFreeTierDisplay(items, plan)

  const { score, tip } = calculateCompleteness(localProfile || {}, items)

  const profile = localProfile
  const hasBasics = !!(localProfile?.display_name && localProfile?.role_line && localProfile?.tagline)
  const itemsWithEvidence = items.filter(item => item.visible && (item.evidence?.length ?? 0) > 0)
  const evidenceCountTotal = itemsWithEvidence.length

  const initials = localProfile?.display_name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || '')
  const profileUrl = localProfile ? `${appUrl}/@${localProfile.handle}` : ''

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
      {/* PWA Install & Push Permission Manager */}
      <PwaManager profileId={profile.id} />

      {/* Weekly report card */}
      <WeeklyReport
        profile={profile}
        weekViews={weekViews}
        prevWeekViews={prevWeekViews}
        evidenceTaps={evidenceTapsWeek}
        socialClicks={socialClicksWeek}
        vouchCount={vouchCount}
        itemsWithoutEvidence={itemsWithoutEvidence}
        totalItems={items.length}
        plan={plan as 'free' | 'plus'}
      />

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
              {getDisplayDomain()}/<span>@{profile.handle}</span>
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <button 
            onClick={() => setShowCardModal(true)} 
            className="btn btn--outline btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            💳 Card
          </button>
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

      {/* Case File Integrity / Verification Status Dossier Panel */}
      <div className={styles.dossierBadge}>
        <div className={styles.dossierRow}>
          <div>
            <span className={styles.dossierLabel}>CASE FILE STATUS</span>
            <span className={`${styles.dossierValue} ${score === 100 ? styles.dossierValueVerified : ''}`}>
              {score === 100 ? '✓ FULLY AUTHENTICATED' : '⚙ INTEGRITY BUILD PENDING'}
            </span>
          </div>
          <div>
            <span className={styles.dossierLabel}>DOSSIER FILE NUMBER</span>
            <span className={styles.dossierValue}>CASE-2026-NBO-{profile.handle.toUpperCase()}</span>
          </div>
          <div>
            <span className={styles.dossierLabel}>AUTHENTICITY METHOD</span>
            <span className={styles.dossierValue}>SECURE OTP-VERIFIED</span>
          </div>
        </div>
        <div className={styles.dossierSecurityLine}>
          <span>RLS Protection: ACTIVE</span>
          <span>·</span>
          <span>Database Integrity: ENFORCED</span>
          <span>·</span>
          <span>Identity Binding: SECURE</span>
        </div>
      </div>

      {/* Completeness bar */}
      <div className={styles.completeness}>
        <TrustQuest score={score} plan={plan as 'free' | 'plus'} />
        <div className={styles.completenessTop}>
          <span>Dossier Completion Index: <b>{score}%</b></span>
          <span className={styles.tip}>{tip}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${score}%` }} />
        </div>

        {/* Verification Checklist */}
        <div className={styles.checklist}>
          <div className={styles.checklistGrid}>
            <div className={`${styles.checkItem} ${styles.checkItemDone}`}>
              <span className={styles.checkIcon}>✓</span>
              <span>Account Secured (+15%)</span>
            </div>
            <div className={`${styles.checkItem} ${styles.checkItemDone}`}>
              <span className={styles.checkIcon}>✓</span>
              <span>Phone OTP Identity Verified (+15%)</span>
            </div>
            {localProfile?.avatar_url ? (
              <div className={`${styles.checkItem} ${styles.checkItemDone}`}>
                <span className={styles.checkIcon}>✓</span>
                <span>Profile / Appearance Photo Set (+5%)</span>
              </div>
            ) : (
              <button
                className={styles.checkItem}
                onClick={() => setActiveDrawer('avatar')}
                type="button"
              >
                <span className={styles.checkIcon}>○</span>
                <span>Profile / Appearance Photo Set (+5%)</span>
              </button>
            )}
            {localProfile?.claim_text ? (
              <div className={`${styles.checkItem} ${styles.checkItemDone}`}>
                <span className={styles.checkIcon}>✓</span>
                <span>Write Opening Claim Statement (+10%)</span>
              </div>
            ) : (
              <button
                className={styles.checkItem}
                onClick={() => setActiveDrawer('claim')}
                type="button"
              >
                <span className={styles.checkIcon}>○</span>
                <span>Write Opening Claim Statement (+10%)</span>
              </button>
            )}
            {hasBasics ? (
              <div className={`${styles.checkItem} ${styles.checkItemDone}`}>
                <span className={styles.checkIcon}>✓</span>
                <span>Profile Information Form (+15%)</span>
              </div>
            ) : (
              <button
                className={styles.checkItem}
                onClick={() => setActiveDrawer('basics')}
                type="button"
              >
                <span className={styles.checkIcon}>○</span>
                <span>Profile Information Form (+15%)</span>
              </button>
            )}
            {evidenceCountTotal >= 4 ? (
              <div className={`${styles.checkItem} ${styles.checkItemDone}`}>
                <span className={styles.checkIcon}>✓</span>
                <span>Evidence-Backed Proof Items (Maxed out +40%)</span>
              </div>
            ) : (
              <button
                className={styles.checkItem}
                onClick={() => setActiveDrawer('proof')}
                type="button"
              >
                <span className={styles.checkIcon}>{evidenceCountTotal > 0 ? '✓' : '○'}</span>
                <span>Evidence-Backed Proof Items ({evidenceCountTotal}/4, +10% each)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visitor Simulator */}
      <VisitorSimulator
        profile={localProfile || {}}
        proofItems={items}
        onEdit={(field) => setActiveDrawer(field)}
      />

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

        {items.length === 0 && !showGuide && (
          <div className={styles.emptyFeedCard}>
            <p className={styles.emptyFeedTitle}>Your Case File is Empty</p>
            <p className={styles.emptyFeedDesc}>
              A strong Case needs evidence. Add your first piece of proof (a project, credential, or recommendation) or explore a reference blueprint to see how to organize your page.
            </p>
            <div className={styles.emptyFeedActions}>
              <Link href="/dashboard/proof/new" className="btn btn--brass btn--sm">
                + Add your first proof
              </Link>
              <button 
                onClick={() => setShowGuide(true)} 
                className="btn btn--outline btn--sm"
              >
                Show Reference Blueprint
              </button>
            </div>
          </div>
        )}

        {isGuideMode && (
          <div className={styles.guideBanner}>
            <div className={styles.guideIcon}>💡</div>
            <div>
              <p className={styles.guideTitle}>Guided Blueprint: Alex Rivera (Spatial Flow Coordinator)</p>
              <p className={styles.guideDesc}>
                This is a mock blueprint of a complete profile to show you how a Case is built. 
                Click <b>Customize</b> on any item to edit and save it as your own.
              </p>
              <button 
                onClick={() => setShowGuide(false)} 
                className={styles.hideGuideBtn}
              >
                Hide Reference Blueprint
              </button>
            </div>
          </div>
        )}

        {PILLAR_ORDER.map(pillar => {
          const pillarItems = displayItems.filter(i => i.pillar === pillar)
          const visibleCount = pillarItems.filter(i => !(i as any).__downgraded).length
          const hiddenCount = pillarItems.length - visibleCount
          return (
            <div key={pillar} className={styles.pillarGroup}>
              <div className={styles.pillarHeader}>
                <span className={`stamp stamp--${pillar}`}>{pillar}</span>
                <span className={styles.pillarCount}>
                  {hiddenCount > 0 ? `${visibleCount}/${pillarItems.length} shown` : pillarItems.length}
                </span>
                {hiddenCount > 0 && (
                  <span className={styles.pillarCountHidden}>(+{hiddenCount} hidden)</span>
                )}
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
                    downgraded={(item as any).__downgraded}
                    isGuideMode={isGuideMode}
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
      {showCardModal && (
        <BusinessCardModal profile={profile} onClose={() => setShowCardModal(false)} />
      )}
      {activeDrawer && localProfile && (
        <QuickActionDrawer
          type={activeDrawer}
          profileId={localProfile.id}
          currentValue={
            activeDrawer === 'avatar' ? localProfile.avatar_url || '' :
            activeDrawer === 'claim'  ? localProfile.claim_text  || '' :
            localProfile.display_name || ''
          }
          currentRoleLine={localProfile.role_line || ''}
          currentTagline={localProfile.tagline || ''}
          onClose={() => setActiveDrawer(null)}
          onSaved={(newValue) => {
            if (activeDrawer === 'proof') {
              setItems((prev) => [...prev, newValue])
            } else {
              setLocalProfile((prev: any) => ({
                ...prev,
                ...(activeDrawer === 'avatar' ? { avatar_url: newValue }  : {}),
                ...(activeDrawer === 'claim'  ? { claim_text: newValue }  : {}),
                ...(activeDrawer === 'basics' ? newValue                  : {}),
              }))
            }
            setActiveDrawer(null)
          }}
        />
      )}
    </div>
  )
}

/* ---- Proof item row ---- */
function ProofItemRow({ item, downgraded, isGuideMode, onToggle, onDelete }: {
  item: ProofItem
  downgraded?: boolean
  isGuideMode?: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const evidenceCount = (item as any).evidence?.length ?? 0

  if (downgraded) {
    return (
      <div className={`${styles.itemRow} ${styles.itemDowngraded}`}>
        <div className={styles.itemTop}>
          <div className={styles.itemInfo}>
            <h4 className={styles.itemTitle}>{item.title}</h4>
            <p className={styles.downgradeMsg}>{getDowngradeMessage(item.pillar)}</p>
          </div>
          <div className={styles.itemControls}>
            <span className="badge badge--muted">hidden: upgrade needed</span>
          </div>
        </div>
        <div className={styles.itemBottom}>
          <span />
          <Link href="/dashboard/billing" className="btn btn--brass btn--sm">
            Upgrade →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.itemRow} ${isGuideMode ? styles.itemGuide : ''} ${!item.visible && !isGuideMode ? styles.itemHidden : ''}`}>
      <div className={styles.itemTop}>
        <div className={styles.itemInfo}>
          <h4 className={styles.itemTitle}>
            {item.title}
            {isGuideMode && <span className={styles.guideBadge}>Template Blueprint</span>}
          </h4>
          {item.detail && <p className={styles.itemDetail}>{item.detail}</p>}
        </div>
        <div className={styles.itemControls}>
          {!isGuideMode && (
            <span className={`badge ${item.visible ? 'badge--green' : 'badge--muted'}`}>
              {item.visible ? 'public' : 'hidden'}
            </span>
          )}
          <Link href={`/dashboard/proof/${item.id}/edit`} className={styles.editLink}>
            {isGuideMode ? 'Customize →' : 'Edit'}
          </Link>
        </div>
      </div>
      <div className={styles.itemBottom}>
        {isGuideMode ? (
          <span className={styles.guideMsgBottom}>Guide item: click Customize to adopt as your own</span>
        ) : evidenceCount > 0 ? (
          <span className="evidence-pill">
            📎 {evidenceCount} {evidenceCount === 1 ? 'file' : 'files'}
          </span>
        ) : (
          <Link href={`/dashboard/proof/${item.id}/edit?tab=evidence`} className="evidence-pill evidence-pill--empty">
            + Add evidence
          </Link>
        )}
        {!isGuideMode && (
          <div className={styles.itemActions}>
            <button onClick={onToggle} className={styles.actionBtn}>
              {item.visible ? 'Hide' : 'Show'}
            </button>
            <button onClick={onDelete} className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
