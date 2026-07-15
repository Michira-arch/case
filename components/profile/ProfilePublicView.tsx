'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PublicProfile, PublicProofItem, PublicEvidence, SocialLink } from '@/lib/types'
import { getMediaUrl } from '@/lib/r2'
import { logAnalyticsEvent } from '@/lib/analytics'
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
  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://case.app')
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
              case.app/<b>@{handle}</b>
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
            case.app/<b>@{handle}</b>
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
            subtext="Tap any evidence tag to see what's behind the claim."
          >
            <div className={styles.cardGrid}>
              {byPillar.did.map(item => (
                <WorkCard key={item.id} item={item} profileId={profile.id} />
              ))}
            </div>
          </ProofSection>
        )}

        {/* TRAINED section */}
        {byPillar.trained.length > 0 && (
          <ProofSection pillar="trained" heading="How I learned it">
            <div className={styles.trainedList}>
              {byPillar.trained.map(item => (
                <TrainedRow key={item.id} item={item} profileId={profile.id} />
              ))}
            </div>
          </ProofSection>
        )}

        {/* VOUCHED section */}
        {byPillar.vouched.length > 0 && (
          <ProofSection pillar="vouched" heading="Who'll speak for me">
            <div className={styles.quoteGrid}>
              {byPillar.vouched.map(item => (
                <QuoteCard key={item.id} item={item} profileId={profile.id} />
              ))}
            </div>
          </ProofSection>
        )}

        {/* AIMING section */}
        {byPillar.aiming.length > 0 && (
          <ProofSection pillar="aiming" heading="What I'm looking for">
            <div className={styles.aimBody}>
              {byPillar.aiming.map(item => (
                <div key={item.id}>
                  <p className={styles.aimText}>{item.detail || item.title}</p>
                  {item.title !== item.detail && (
                    <div className={styles.chipRow}>
                      <span className={styles.chip}>{item.title}</span>
                    </div>
                  )}
                </div>
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
function ProofSection({ pillar, heading, subtext, children }: {
  pillar: string; heading: string; subtext?: string; children: React.ReactNode
}) {
  return (
    <section className={styles.proofSection}>
      <div className={styles.sectionHead}>
        <span className={`stamp stamp--${pillar}`}>{pillar}</span>
        <h2 className={styles.sectionHeading}>{heading}</h2>
      </div>
      {subtext && <p className={styles.sectionSub}>{subtext}</p>}
      {children}
    </section>
  )
}

/* ---- Work card (did pillar) ---- */
function WorkCard({ item, profileId }: { item: PublicProofItem; profileId: string }) {
  const hasEvidence = (item.evidence?.length ?? 0) > 0

  return (
    <div className={styles.workCard}>
      {/* Thumb — shows first image or gradient placeholder */}
      <div className={styles.workThumb}>
        {item.evidence?.[0]?.type === 'img' ? (
          <img
            src={getMediaUrl(item.evidence[0].storage_key)}
            alt={item.evidence[0].caption || item.title}
            className={styles.workThumbImg}
          />
        ) : null}
      </div>
      <div className={styles.workBody}>
        <h3 className={styles.workTitle}>{item.title}</h3>
        {item.detail && <p className={styles.workDetail}>{item.detail}</p>}
        {hasEvidence && (
          <EvidencePanel evidence={item.evidence!} proofItemId={item.id} profileId={profileId} />
        )}
      </div>
    </div>
  )
}

/* ---- Trained row ---- */
function TrainedRow({ item, profileId }: { item: PublicProofItem; profileId: string }) {
  const hasEvidence = (item.evidence?.length ?? 0) > 0

  return (
    <div className={styles.trainedRow}>
      <div className={styles.trainedTop}>
        <div>
          <h3 className={styles.trainedTitle}>{item.title}</h3>
          {item.detail && <p className={styles.trainedDetail}>{item.detail}</p>}
        </div>
        {item.when_label && (
          <span className={styles.whenLabel}>{item.when_label}</span>
        )}
      </div>
      {hasEvidence && <EvidencePanel evidence={item.evidence!} proofItemId={item.id} profileId={profileId} />}
    </div>
  )
}

/* ---- Quote card (vouched) ---- */
function QuoteCard({ item, profileId }: { item: PublicProofItem; profileId: string }) {
  const hasEvidence = (item.evidence?.length ?? 0) > 0

  return (
    <div className={styles.quoteCard}>
      <p className={styles.quoteText}>{item.title}</p>
      <p className={styles.quoteWho}>{item.detail}</p>
      {hasEvidence && <EvidencePanel evidence={item.evidence!} proofItemId={item.id} profileId={profileId} />}
    </div>
  )
}

/* ---- Evidence panel ---- */
function EvidencePanel({ evidence, proofItemId, profileId }: { evidence: PublicEvidence[]; proofItemId: string; profileId: string }) {
  const [previewingEv, setPreviewingEv] = useState<PublicEvidence | null>(null)

  return (
    <>
      <div className={styles.evidencePanelInline}>
        {evidence.map(e => {
          const isMedia = e.type === 'img' || e.type === 'vid'
          const mediaUrl = getMediaUrl(e.storage_key)

          if (isMedia) {
            return (
              <div
                key={e.id}
                className={styles.evMediaCard}
                onClick={() => {
                  setPreviewingEv(e)
                  logAnalyticsEvent(profileId, 'evidence_tap', { proofItemId })
                }}
                role="button"
                tabIndex={0}
                onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { setPreviewingEv(e); logAnalyticsEvent(profileId, 'evidence_tap', { proofItemId }) } }}
              >
                {e.type === 'img' ? (
                  <img src={mediaUrl} alt={e.caption || 'Evidence'} className={styles.evInlineImg} />
                ) : (
                  <div className={styles.evVideoContainer}>
                    <video src={mediaUrl} className={styles.evInlineVideo} muted playsInline />
                    <div className={styles.playOverlay}>▶</div>
                  </div>
                )}
                {e.caption && <div className={styles.evInlineCaption}>{e.caption}</div>}
              </div>
            )
          } else {
            // PDF Document
            return (
              <div
                key={e.id}
                className={styles.evDocCard}
                onClick={() => {
                  setPreviewingEv(e)
                  logAnalyticsEvent(profileId, 'evidence_tap', { proofItemId })
                }}
                role="button"
                tabIndex={0}
                onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { setPreviewingEv(e); logAnalyticsEvent(profileId, 'evidence_tap', { proofItemId }) } }}
              >
                <div className={styles.docIconWrap}>📄</div>
                <div className={styles.docInfo}>
                  <span className={styles.docLabel}>Document Proof (PDF)</span>
                  <span className={styles.docName}>{e.caption || 'View Certificate / Document'}</span>
                </div>
                <span className={styles.docActionBadge}>View →</span>
              </div>
            )
          }
        })}
      </div>

      {previewingEv && (
        <EvidencePreviewModal
          evidence={previewingEv}
          onClose={() => setPreviewingEv(null)}
        />
      )}
    </>
  )
}

function EvidencePreviewModal({ evidence, onClose }: { evidence: PublicEvidence; onClose: () => void }) {
  const mediaUrl = getMediaUrl(evidence.storage_key)

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close preview">
          ✕
        </button>
        
        <div className={styles.modalBody}>
          {evidence.type === 'img' && (
            <img src={mediaUrl} alt={evidence.caption || 'Evidence'} className={styles.modalImg} />
          )}
          {evidence.type === 'vid' && (
            <video src={mediaUrl} controls autoPlay className={styles.modalVideo} />
          )}
          {evidence.type === 'pdf' && (
            <div className={styles.pdfViewer}>
              <iframe src={mediaUrl} className={styles.pdfIframe} title="PDF Preview" />
              <div className={styles.pdfFallback}>
                <p style={{ marginBottom: 12 }}>Previewing Document</p>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--brass"
                  style={{ display: 'inline-flex', padding: '8px 16px', fontSize: 13 }}
                >
                  Open PDF in new tab
                </a>
              </div>
            </div>
          )}
        </div>
        
        {evidence.caption && (
          <div className={styles.modalCaption}>{evidence.caption}</div>
        )}
      </div>
    </div>
  )
}

function EvidenceIcon({ type, storageKey }: { type: string; storageKey: string }) {
  if (type === 'img') {
    return (
      <img
        src={getMediaUrl(storageKey)}
        alt=""
        className={styles.evThumb}
      />
    )
  }
  return (
    <div className={`${styles.evIcon} ${styles[`evIcon--${type}`]}`}>
      {type.toUpperCase()}
    </div>
  )
}

function PaperclipIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M13.5 6.5l-6 6a2.5 2.5 0 003.5 3.5l6-6a4.5 4.5 0 00-6.5-6.5l-6 6a6.5 6.5 0 009 9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
