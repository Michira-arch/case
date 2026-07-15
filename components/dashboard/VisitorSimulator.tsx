'use client'

import { useState } from 'react'
import { getMediaUrl } from '@/lib/r2'
import styles from './VisitorSimulator.module.css'

export interface VisitorSimulatorProps {
  profile: {
    display_name?: string | null
    role_line?: string | null
    tagline?: string | null
    claim_text?: string | null
    avatar_url?: string | null
    handle?: string
  }
  proofItems: Array<{ pillar: string; title: string; visible: boolean; evidence?: any[] }>
  onEdit: (field: 'avatar' | 'claim' | 'basics') => void
}

const PILLAR_COLORS: Record<string, string> = {
  did: 'var(--brass)',
  trained: 'var(--trained)',
  vouched: 'var(--verified)',
  aiming: 'var(--aim)',
}

export default function VisitorSimulator({ profile, proofItems, onEdit }: VisitorSimulatorProps) {
  const [expanded, setExpanded] = useState(false)
  const [tooltip, setTooltip] = useState<{ text: string; id: string } | null>(null)

  const handle = profile.handle || 'you'
  const avatarUrl = profile.avatar_url ? getMediaUrl(profile.avatar_url) : null

  const initials = profile.display_name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  const visibleItems = proofItems
    .filter(item => item.visible)
    .slice(0, 4)

  return (
    <div className={styles.wrapper}>
      {/* Collapsible header */}
      <button
        className={styles.toggleRow}
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
      >
        <span className={styles.toggleLabel}>👁️ Visitor View — Preview how clients see you</span>
        <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Expandable content */}
      <div className={`${styles.expandBody} ${expanded ? styles.expandBodyOpen : ''}`}>
        <div className={styles.browserFrame}>
          {/* Browser chrome bar */}
          <div className={styles.chrome}>
            <span className={styles.dot} style={{ background: '#FF5F57' }} />
            <span className={styles.dot} style={{ background: '#FEBC2E' }} />
            <span className={styles.dot} style={{ background: '#28C840' }} />
            <div className={styles.urlBar}>
              <span className={styles.urlText}>case.app/@{handle}</span>
            </div>
          </div>

          {/* Mini profile content */}
          <div className={styles.miniProfile}>
            {/* Hero */}
            <div className={styles.hero}>
              {/* Avatar */}
              <div className={styles.avatarWrap}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className={styles.avatar} />
                ) : (
                  <div className={styles.avatarEmpty}>
                    <span className={styles.avatarInitials}>{initials}</span>
                    <button
                      className={styles.addOverlay}
                      onClick={() => onEdit('avatar')}
                      title="Add profile photo"
                    >
                      + Add photo
                    </button>
                  </div>
                )}
              </div>

              {/* Name / role / tagline */}
              <div className={styles.heroText}>
                {profile.display_name ? (
                  <p className={styles.name}>{profile.display_name}</p>
                ) : (
                  <button className={styles.addField} onClick={() => onEdit('basics')}>
                    + Add name
                  </button>
                )}
                {profile.role_line ? (
                  <p className={styles.role}>{profile.role_line}</p>
                ) : (
                  <button className={styles.addField} onClick={() => onEdit('basics')}>
                    + Add role
                  </button>
                )}
                {profile.tagline ? (
                  <p className={styles.tagline}>{profile.tagline}</p>
                ) : (
                  <button className={styles.addField} onClick={() => onEdit('basics')}>
                    + Add tagline
                  </button>
                )}
              </div>
            </div>

            {/* Claim */}
            <div className={styles.claimSection}>
              {profile.claim_text ? (
                <blockquote className={styles.claim}>{profile.claim_text}</blockquote>
              ) : (
                <div
                  className={styles.claimMissing}
                  onMouseEnter={() => setTooltip({ text: '👤 A visitor just closed this tab', id: 'claim' })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <p className={styles.claimMissingText}>
                    Your claim is missing. Visitors won&apos;t know what to believe.
                  </p>
                  <button
                    className={styles.claimWriteBtn}
                    onClick={() => onEdit('claim')}
                  >
                    Write your claim
                  </button>
                  {tooltip?.id === 'claim' && (
                    <div className={styles.tooltip}>{tooltip.text}</div>
                  )}
                </div>
              )}
            </div>

            {/* Proof row */}
            {visibleItems.length > 0 ? (
              <div className={styles.proofRow}>
                {visibleItems.map((item, i) => {
                  const hasEvidence = (item.evidence?.length ?? 0) > 0
                  const tooltipId = `proof-${i}`
                  return (
                    <div
                      key={i}
                      className={`${styles.proofPill} ${!hasEvidence ? styles.proofPillWeak : ''}`}
                      onMouseEnter={() =>
                        !hasEvidence
                          ? setTooltip({ text: '👤 No proof yet. Hard to trust.', id: tooltipId })
                          : undefined
                      }
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span
                        className={styles.pillarDot}
                        style={{ background: PILLAR_COLORS[item.pillar] || 'var(--ink-muted)' }}
                      />
                      <span className={styles.pillTitle}>
                        {item.title.length > 22 ? item.title.slice(0, 20) + '\u2026' : item.title}
                      </span>
                      {!hasEvidence && (
                        <span className={styles.warnIcon} aria-label="No evidence">
                          ⚠️
                        </span>
                      )}
                      {tooltip?.id === tooltipId && (
                        <div className={styles.tooltip}>{tooltip.text}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={styles.proofEmpty}>No proof items yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
