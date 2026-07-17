'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [scrolled, setScrolled] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)

    // Log profile view to Firebase Analytics and Supabase
    logAnalyticsEvent(profile.id, 'profile_view', { referrerHost: document.referrer ? new URL(document.referrer).hostname : '' })

    const t1 = setTimeout(() => setLoadingState('refined'), 1000)
    const t2 = setTimeout(() => setLoadingState('detailed'), 2000)
    const t3 = setTimeout(() => setLoadingState('done'), 3000)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])
  const appUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? window.location.origin
    : 'https://caseshow.info'
  const profileUrl = `${appUrl}/@${handle}`

  const initials = profile.display_name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'C'

  const getCardContacts = () => {
    const socials = profile.socials || []
    const phone = socials.find(s => s.platform.toLowerCase() === 'phone')?.url.replace('tel:', '') || ''
    const whatsapp = socials.find(s => s.platform.toLowerCase() === 'whatsapp')?.url.replace('https://wa.me/', '') || ''
    const email = socials.find(s => s.platform.toLowerCase() === 'email')?.url.replace('mailto:', '') || profile.email || ''

    const list = []
    if (phone) {
      list.push({ label: '📞', val: phone })
    }
    
    if (whatsapp && whatsapp !== phone) {
      list.push({ label: '💬', val: whatsapp })
    }

    if (list.length < 2 && email) {
      list.push({ label: '✉️', val: email })
    }

    if (list.length === 0 && email) {
      list.push({ label: '✉️', val: email })
    }

    return list
  }
  const cardContacts = getCardContacts()

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      if (cardRef.current) {
        const canvas = await html2canvas(cardRef.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#FCFBF9',
          logging: false,
        })
        
        const dataUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = `case-card-${handle}.png`
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      console.error('Failed to export business card image:', err)
      alert('Could not download business card. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

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
      {/* Floating Download Business Card Button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={scrolled ? styles.downloadFloatingBtnCollapsed : styles.downloadFloatingBtn}
        title="Download Business Card"
      >
        {downloading ? (
          <span className={styles.spinner} />
        ) : scrolled ? (
          <span style={{ fontSize: '18px' }}>📥</span>
        ) : (
          <>
            <span style={{ marginRight: '6px' }}>💳</span>
            <span>Download Business Card</span>
          </>
        )}
      </button>

      {/* Hidden card for PDF/Image capture */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div
          ref={cardRef}
          style={{
            width: '480px',
            height: '274px',
            background: '#FCFBF9',
            border: '1.5px solid #DCD5C2',
            borderRadius: '8px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            padding: '24px',
            fontFamily: 'var(--font-sans)',
            boxSizing: 'border-box',
          }}
        >
          {/* Accent Stripe */}
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: 'var(--brass)' }} />

          {/* Left Column */}
          <div style={{ width: '62%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {profile.avatar_url ? (
                <img
                  src={`/api/proxy-avatar?key=${encodeURIComponent(profile.avatar_url)}`}
                  alt=""
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #DCD5C2' }}
                />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--brass-bg)', color: 'var(--brass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '15px', border: '1px solid #DCD5C2' }}>
                  {initials}
                </div>
              )}
              <div>
                <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: '14px', color: 'var(--brass)', letterSpacing: '-0.01em' }}>CASE</span>
                <span style={{ display: 'block', fontSize: '8px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Verified Dossier</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '21px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 }}>
                {profile.display_name}
              </h4>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-soft)', margin: 0 }}>
                {profile.role_line || 'Case Member'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                {cardContacts.map((c, idx) => (
                  <span key={idx} style={{ fontSize: '10.5px', color: 'var(--ink-soft)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ opacity: 0.85 }}>{c.label}</span>
                    <span style={{ fontWeight: 500 }}>{c.val}</span>
                  </span>
                ))}
              </div>
            </div>

            <p style={{ fontSize: '11px', lineHeight: 1.4, color: 'var(--ink-muted)', fontStyle: 'italic', margin: 0 }}>
              {profile.tagline ? `"${profile.tagline.slice(0, 85)}${profile.tagline.length > 85 ? '...' : ''}"` : 'State your claim. Present your evidence.'}
            </p>
          </div>

          {/* Right Column */}
          <div style={{ width: '38%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', borderLeft: '1px dashed #DCD5C2', paddingLeft: '16px' }}>
            <span style={{ background: 'var(--ink)', color: 'var(--paper-light)', fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              {getDisplayDomain().toUpperCase()}/@{profile.handle.toUpperCase()}
            </span>

            <div style={{ background: '#fff', padding: '5px', borderRadius: '6px', border: '1px solid #DCD5C2', boxShadow: '0 2px 8px rgba(32,40,31,0.04)' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`}
                alt="QR Code"
                style={{ width: '64px', height: '64px', display: 'block' }}
              />
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ display: 'block', fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)' }}>SCAN FOR EVIDENCE</span>
              <span style={{ display: 'block', fontSize: '7px', color: 'var(--ink-muted)' }}>Authentic proof-of-work</span>
            </div>
          </div>
        </div>
      </div>
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
