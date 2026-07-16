'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PublicProfile, PublicProofItem, PublicEvidence, SocialLink } from '@/lib/types'
import { getMediaUrl } from '@/lib/r2'
import { logAnalyticsEvent } from '@/lib/analytics'
import { getDisplayDomain } from '@/lib/domain'
import styles from './profile.module.css'

interface Props {
  profile: PublicProfile
  handle: string
}

export default function ProfilePublicView({ profile, handle }: Props) {
  const [loadingState, setLoadingState] = useState<'rough' | 'refined' | 'detailed' | 'done'>('rough')

  useEffect(() => {
    // Log profile view to Firebase Analytics and Supabase
    logAnalyticsEvent(profile.id, 'profile_view', { referrerHost: document.referrer ? new URL(document.referrer).hostname : '' })

    const t1 = setTimeout(() => setLoadingState('refined'), 1000)
    const t2 = setTimeout(() => setLoadingState('detailed'), 2000)
    const t3 = setTimeout(() => setLoadingState('done'), 3000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])
  const appUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? window.location.origin
    : 'https://caseshow.info'
  const profileUrl = `${appUrl}/@${handle}`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.display_name} — Case`,
          text: profile.tagline || `Check out ${profile.display_name}'s proof-of-work profile`,
          url: profileUrl,
        })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(profileUrl)
      alert('Link copied!')
    }
  }

  const byPillar = {
    did:      profile.proof_items?.filter(i => i.pillar === 'did')      ?? [],
    trained:  profile.proof_items?.filter(i => i.pillar === 'trained')  ?? [],
    vouched:  profile.proof_items?.filter(i => i.pillar === 'vouched')  ?? [],
    aiming:   profile.proof_items?.filter(i => i.pillar === 'aiming')   ?? [],
  }

  const initials = profile.display_name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (loadingState !== 'done') {
    return (
      <div className={styles.page}>
        {/* Top bar */}
        <div className={styles.shareBar}>
          <div className={styles.handleTag}>
            <span className={styles.handleText}>
              {getDisplayDomain()}/<b>@{handle}</b>
            </span>
          </div>
          <div className={styles.shareActions}>
            <button className={styles.btnGhost} disabled>
              Share
            </button>
            <button className={styles.btnInstall} disabled>
              Build yours free →
            </button>
          </div>
        </div>

        <div className={`${styles.frame} ${styles.skeletonFrame}`}>
          {/* Hero Skeleton */}
          <header className={styles.heroSkeleton}>
            <div className={`${styles.avatarSkeleton} ${styles.pulse}`} />
            <div className={styles.heroTextSkeleton}>
              <div className={`${styles.lineSkeleton} ${styles.lineSkeletonName} ${styles.pulse}`} />
              <div className={`${styles.lineSkeleton} ${styles.lineSkeletonRole} ${styles.pulse}`} />
              {(loadingState === 'refined' || loadingState === 'detailed') && (
                <div className={`${styles.lineSkeleton} ${styles.lineSkeletonTagline} ${styles.pulse}`} />
              )}
              {loadingState === 'detailed' && (
                <div className={styles.socialRowSkeleton}>
                  <div className={`${styles.socialPillSkeleton} ${styles.pulse}`} />
                  <div className={`${styles.socialPillSkeleton} ${styles.pulse}`} />
                </div>
              )}
            </div>
          </header>

          {/* Claim Section Skeleton (only in refined & detailed) */}
          {(loadingState === 'refined' || loadingState === 'detailed') && (
            <div className={`${styles.claimSkeleton} ${styles.pulse}`}>
              <div className={styles.claimLineSkeleton} />
              <div className={styles.claimLineSkeleton} style={{ width: '80%' }} />
              {loadingState === 'detailed' && (
                <div className={styles.claimMetaSkeleton} />
              )}
            </div>
          )}

          {/* Main Sections Skeletons */}
          <div className={styles.proofSectionSkeleton}>
            {/* Stamp / Section Title */}
            <div className={`${styles.sectionHeaderSkeleton} ${styles.pulse}`} />
            
            {/* Rough: just blocks. Refined: layout lines. Detailed: full cards with evidence capsules */}
            <div className={styles.cardGridSkeleton}>
              <div className={`${styles.workCardSkeleton} ${styles.pulse}`}>
                <div className={styles.workThumbSkeleton} />
                <div className={styles.workBodySkeleton}>
                  <div className={styles.cardTitleSkeleton} />
                  <div className={styles.cardDetailSkeleton} />
                  {loadingState === 'detailed' && (
                    <div className={styles.evidencePillSkeleton} />
                  )}
                </div>
              </div>

              {(loadingState === 'refined' || loadingState === 'detailed') && (
                <div className={`${styles.workCardSkeleton} ${styles.pulse}`}>
                  <div className={styles.workThumbSkeleton} />
                  <div className={styles.workBodySkeleton}>
                    <div className={styles.cardTitleSkeleton} />
                    <div className={styles.cardDetailSkeleton} style={{ width: '60%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {(loadingState === 'refined' || loadingState === 'detailed') && (
            <div className={styles.proofSectionSkeleton}>
              <div className={`${styles.sectionHeaderSkeleton} ${styles.pulse}`} style={{ width: '120px' }} />
              <div className={styles.trainedListSkeleton}>
                <div className={styles.trainedRowSkeleton}>
                  <div className={styles.trainedTextSkeleton}>
                    <div className={styles.cardTitleSkeleton} style={{ width: '70%' }} />
                    <div className={styles.cardDetailSkeleton} style={{ width: '40%' }} />
                  </div>
                  {loadingState === 'detailed' && <div className={styles.whenLabelSkeleton} />}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Psychological Status Tip during progressive load */}
        <div className={styles.loadingTip}>
          {loadingState === 'rough' && <span>⚡ Connecting to Case registry...</span>}
          {loadingState === 'refined' && <span>🔒 Verifying cryptographic signatures...</span>}
          {loadingState === 'detailed' && <span>📄 Retrieving certified evidence...</span>}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.shareBar}>
        <div className={styles.handleTag}>
          <span className={styles.handleText}>
            {getDisplayDomain()}/<b>@{handle}</b>
          </span>
        </div>
        <div className={styles.shareActions}>
          <button className={styles.btnGhost} onClick={handleShare}>
            Share
          </button>
          <Link href="/signup" className={styles.btnInstall}>
            Build yours free →
          </Link>
        </div>
      </div>

      <div className={styles.frame}>
        {/* Hero */}
        <header className={styles.hero}>
          <div className={styles.avatarWrap}>
            {profile.avatar_url ? (
              <img
                src={getMediaUrl(profile.avatar_url)}
                alt={profile.display_name}
                className={styles.avatar}
                width={76}
                height={76}
              />
            ) : (
              <div className={styles.avatarFallback}>{initials}</div>
            )}
          </div>
          <div className={styles.heroText}>
            <h1 className={styles.name}>{profile.display_name}</h1>
            {profile.role_line && (
              <p className={styles.roleLine}>{profile.role_line}</p>
            )}
            {profile.tagline && (
              <p className={styles.tagline}>{profile.tagline}</p>
            )}
            {profile.socials?.length > 0 && (() => {
              const cv = profile.contact_visibility
              const visibleSocials = profile.socials.filter((s: SocialLink) => {
                const p = s.platform.toLowerCase()
                if (p === 'whatsapp') return cv?.whatsapp !== false
                if (p === 'email')    return cv?.email !== false
                if (p === 'phone')    return cv?.phone !== false
                return true
              })
              return visibleSocials.length > 0 ? (
                <div className={styles.socialRow}>
                  {visibleSocials.map((s: SocialLink) => (
                    <a
                      key={s.platform}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialPill}
                      onClick={() => logAnalyticsEvent(profile.id, 'social_click', { referrerHost: s.platform })}
                    >
                      {s.platform}
                    </a>
                  ))}
                </div>
              ) : null
            })()}
          </div>
        </header>

        {/* Showcase Images Gallery */}
        {profile.showcase_images && profile.showcase_images.length > 0 && (
          <ShowcaseGallery images={profile.showcase_images} name={profile.display_name} />
        )}

        {/* Claim section */}
        {profile.claim_text && (
          <ClaimSection text={profile.claim_text} />
        )}

        {/* DID section */}
        {byPillar.did.length > 0 && (
          <ProofSection
            pillar="did"
            heading="What I've done"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
              {byPillar.did.map(item => (
                <ProofIsland
                  key={item.id}
                  id={item.id}
                  pillar="did"
                  title={item.title}
                  detail={item.detail}
                  whenLabel={item.when_label}
                  evidence={item.evidence}
                  profileId={profile.id}
                />
              ))}
            </div>
          </ProofSection>
        )}

        {/* TRAINED section */}
        {byPillar.trained.length > 0 && (
          <ProofSection pillar="trained" heading="How I learned it">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
              {byPillar.trained.map(item => (
                <ProofIsland
                  key={item.id}
                  id={item.id}
                  pillar="trained"
                  title={item.title}
                  detail={item.detail}
                  whenLabel={item.when_label}
                  evidence={item.evidence}
                  profileId={profile.id}
                />
              ))}
            </div>
          </ProofSection>
        )}

        {/* VOUCHED section */}
        {byPillar.vouched.length > 0 && (
          <ProofSection pillar="vouched" heading="Who'll speak for me">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
              {byPillar.vouched.map(item => (
                <ProofIsland
                  key={item.id}
                  id={item.id}
                  pillar="vouched"
                  title={item.title}
                  detail={item.detail}
                  whenLabel={item.when_label}
                  evidence={item.evidence}
                  profileId={profile.id}
                />
              ))}
            </div>
          </ProofSection>
        )}

        {/* AIMING section */}
        {byPillar.aiming.length > 0 && (
          <ProofSection pillar="aiming" heading="What I'm looking for">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
              {byPillar.aiming.map(item => (
                <ProofIsland
                  key={item.id}
                  id={item.id}
                  pillar="aiming"
                  title={item.title}
                  detail={item.detail}
                  whenLabel={item.when_label}
                  evidence={item.evidence}
                  profileId={profile.id}
                />
              ))}
            </div>
          </ProofSection>
        )}

        {/* Physical Attributes Section */}
        {profile.physical_attributes && 
         (profile.physical_attributes.height || 
          profile.physical_attributes.build || 
          profile.physical_attributes.bio || 
          profile.physical_attributes.photo_url) && (
          <section className={styles.physicalSection}>
            <div className={styles.physicalHead}>
              <span className="stamp stamp--vouched">Physical Attributes</span>
              <h2 className={styles.physicalHeading}>Appearance Details</h2>
            </div>
            
            <div className={styles.physicalGrid}>
              <div className={styles.physicalTextDetails}>
                {profile.physical_attributes.height && (
                  <div className={styles.physicalField}>
                    <span className={styles.physicalLabel}>Height</span>
                    <span className={styles.physicalValue}>{profile.physical_attributes.height}</span>
                  </div>
                )}
                {profile.physical_attributes.build && (
                  <div className={styles.physicalField}>
                    <span className={styles.physicalLabel}>Build</span>
                    <span className={styles.physicalValue}>{profile.physical_attributes.build}</span>
                  </div>
                )}
                {profile.physical_attributes.bio && (
                  <div className={styles.physicalBioField}>
                    <span className={styles.physicalLabel}>Additional Notes</span>
                    <p className={styles.physicalBioText}>{profile.physical_attributes.bio}</p>
                  </div>
                )}
              </div>
              
              {profile.physical_attributes.photo_url && (
                <div className={styles.physicalPhotoContainer}>
                  <img
                    src={getMediaUrl(profile.physical_attributes.photo_url)}
                    alt={`${profile.display_name} appearance`}
                    className={styles.physicalPhoto}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <span className={styles.footerWordmark}>Case</span>
          {profile.plan === 'free' ? (
            <Link href="/signup" className={styles.footerCta}>
              Build your own, free →
            </Link>
          ) : (
            <span className={styles.footerEmpty} />
          )}
        </footer>
      </div>
    </div>
  )
}

/* ---- Claim section ---- */
function ClaimSection({ text }: { text: string }) {
  return (
    <section className={styles.claimSection}>
      <span className={styles.claimQuote}>&ldquo;</span>
      <p className={styles.claimText}>{text}</p>
      <p className={styles.claimMeta}>This is what they say they can do. Everything below is the proof.</p>
    </section>
  )
}

/* ---- Section wrapper ---- */
const PILLAR_LABELS: Record<string, string> = {
  did: 'did',
  trained: 'trained',
  vouched: 'recommended',
  aiming: 'aiming',
}

/* ---- Section wrapper ---- */
function ProofSection({ pillar, heading, subtext, children }: {
  pillar: string; heading: string; subtext?: string; children: React.ReactNode
}) {
  return (
    <section className={styles.proofSection}>
      <div className={styles.sectionHead}>
        <span className={`stamp stamp--${pillar}`}>{PILLAR_LABELS[pillar] || pillar}</span>
        <h2 className={styles.sectionHeading}>{heading}</h2>
      </div>
      {subtext && <p className={styles.sectionSub}>{subtext}</p>}
      {children}
    </section>
  )
}

interface ProofIslandProps {
  id: string
  pillar: string
  title: string
  detail?: string | null
  whenLabel?: string | null
  evidence?: PublicEvidence[] | null
  profileId: string
}

function ProofIsland({ id, pillar, title, detail, whenLabel, evidence, profileId }: ProofIslandProps) {
  const hasEvidence = (evidence?.length ?? 0) > 0

  const borderStyles: Record<string, React.CSSProperties> = {
    did: { borderLeft: '4px solid var(--ink)' },
    trained: { borderLeft: '4px solid var(--brass)' },
    vouched: { borderLeft: '4px solid var(--verified)' },
    aiming: { borderLeft: '4px solid var(--aim)' },
  }

  return (
    <div className={styles.proofIsland} style={borderStyles[pillar]}>
      <div className={styles.islandHeader}>
        <div className={styles.islandTitleRow}>
          <h3 className={styles.islandTitle}>
            {pillar === 'vouched' ? <span className={styles.quoteMark}>“</span> : null}
            {title}
            {pillar === 'vouched' ? <span className={styles.quoteMark}>”</span> : null}
          </h3>
          {whenLabel && <span className={styles.islandWhen}>{whenLabel}</span>}
        </div>
        {detail && (
          <p className={pillar === 'vouched' ? styles.islandQuoteWho : styles.islandDetail}>
            {pillar === 'vouched' ? `— ${detail}` : detail}
          </p>
        )}
      </div>

      {hasEvidence && (
        <div className={styles.islandEvidenceStack}>
          {evidence!.map((e) => {
            const mediaUrl = getMediaUrl(e.storage_key)
            if (e.type === 'img') {
              return (
                <div key={e.id} className={styles.islandMediaWrap}>
                  <img
                    src={mediaUrl}
                    alt={e.caption || 'Evidence Image'}
                    className={styles.islandFullImg}
                    loading="lazy"
                  />
                  {e.caption && <p className={styles.islandCaption}>{e.caption}</p>}
                </div>
              )
            } else if (e.type === 'vid') {
              return (
                <div key={e.id} className={styles.islandMediaWrap}>
                  <video
                    src={mediaUrl}
                    className={styles.islandFullVideo}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                  />
                  {e.caption && <p className={styles.islandCaption}>{e.caption}</p>}
                </div>
              )
            } else {
              // PDF/Doc
              return (
                <a
                  key={e.id}
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.islandDocLink}
                  onClick={() => logAnalyticsEvent(profileId, 'evidence_tap', { proofItemId: id })}
                >
                  <span className={styles.islandDocIcon}>📄</span>
                  <div className={styles.islandDocInfo}>
                    <span className={styles.islandDocLabel}>Document Proof (PDF)</span>
                    <span className={styles.islandDocName}>{e.caption || 'View Certificate / Document'}</span>
                  </div>
                  <span className={styles.islandDocAction}>Open Document →</span>
                </a>
              )
            }
          })}
        </div>
      )}
    </div>
  )
}

function ShowcaseGallery({ images, name }: { images: string[]; name: string }) {
  const [activeImg, setActiveImg] = useState<string | null>(null)

  return (
    <>
      <div className={styles.showcaseGallery}>
        {images.map((imgUrl, idx) => (
          <div
            key={idx}
            className={styles.showcaseItem}
            onClick={() => setActiveImg(imgUrl)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setActiveImg(imgUrl) }}
          >
            <img
              src={getMediaUrl(imgUrl)}
              alt={`${name} Showcase ${idx + 1}`}
              className={styles.showcaseImg}
            />
          </div>
        ))}
      </div>

      {activeImg && (
        <div className={styles.modalOverlay} onClick={() => setActiveImg(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setActiveImg(null)} aria-label="Close preview">
              ✕
            </button>
            <div className={styles.modalBody}>
              <img src={getMediaUrl(activeImg)} alt="Showcase full size" className={styles.modalImg} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
