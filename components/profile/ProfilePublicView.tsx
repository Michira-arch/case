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
  const [downloading, setDownloading] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logAnalyticsEvent(profile.id, 'profile_view', {
      referrerHost: document.referrer ? new URL(document.referrer).hostname : '',
    })

    const t1 = setTimeout(() => setLoadingState('refined'), 1000)
    const t2 = setTimeout(() => setLoadingState('detailed'), 2000)
    const t3 = setTimeout(() => setLoadingState('done'), 3000)

    // Sticky contact bar — appears when hero scrolls out of view
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0.1 }
    )
    if (heroRef.current) observer.observe(heroRef.current)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      observer.disconnect()
    }
  }, [profile.id])

  const appUrl =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? window.location.origin
      : 'https://caseshow.info'
  const profileUrl = `${appUrl}/@${handle}`

  const initials =
    profile.display_name
      ?.split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'C'

  // Resolve contact methods respecting visibility settings
  const getContactMethods = () => {
    const socials = profile.socials || []
    const cv = profile.contact_visibility
    const methods: { icon: string; label: string; href: string }[] = []

    const phone = socials.find(s => s.platform.toLowerCase() === 'phone')
    const whatsapp = socials.find(s => s.platform.toLowerCase() === 'whatsapp')
    const emailSocial = socials.find(s => s.platform.toLowerCase() === 'email')
    const email = emailSocial?.url.replace('mailto:', '') || profile.email || ''

    if (phone && cv?.phone !== false) {
      methods.push({ icon: 'Phone', label: phone.url.replace('tel:', ''), href: phone.url })
    }
    if (whatsapp && cv?.whatsapp !== false) {
      methods.push({ icon: 'WhatsApp', label: 'WhatsApp', href: whatsapp.url })
    }
    if (methods.length < 2 && email && cv?.email !== false) {
      methods.push({ icon: 'Email', label: email, href: `mailto:${email}` })
    }
    return methods
  }

  // For business card generation — public page only uses explicitly public contacts.
  // No fallback to sign-up email: if the user hasn't made any contact public, the card shows none.
  const getCardContacts = () => {
    const socials = profile.socials || []
    const cv = profile.contact_visibility
    const list: { label: string; val: string }[] = []

    const phoneSocial   = socials.find(s => s.platform.toLowerCase() === 'phone')
    const whatsappSocial = socials.find(s => s.platform.toLowerCase() === 'whatsapp')
    const emailSocial   = socials.find(s => s.platform.toLowerCase() === 'email')

    const phone   = phoneSocial?.url.replace('tel:', '') || ''
    const wa      = whatsappSocial?.url.replace('https://wa.me/', '') || ''
    const email   = emailSocial?.url.replace('mailto:', '') || ''

    if (phoneSocial && cv?.phone !== false && phone)
      list.push({ label: '📞', val: phone })

    if (whatsappSocial && cv?.whatsapp !== false && wa && wa !== phone)
      list.push({ label: '💬', val: wa })

    // Email from socials only — never fall back to profile.email on the public card
    if (emailSocial && cv?.email !== false && email)
      list.push({ label: '✉️', val: email })

    return list // May be empty — card renders without contact section if so
  }

  const cardContacts = getCardContacts()
  const contactMethods = getContactMethods()

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
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(profileUrl)
      alert('Link copied!')
    }
  }

  const byPillar = {
    did:     profile.proof_items?.filter(i => i.pillar === 'did')     ?? [],
    trained: profile.proof_items?.filter(i => i.pillar === 'trained') ?? [],
    vouched: profile.proof_items?.filter(i => i.pillar === 'vouched') ?? [],
    aiming:  profile.proof_items?.filter(i => i.pillar === 'aiming')  ?? [],
  }

  // ─── Skeleton loading screen ────────────────────────────────
  if (loadingState !== 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.shareBar}>
          <div className={styles.handleTag}>
            <span className={styles.handleText}>
              {getDisplayDomain()}/<b>@{handle}</b>
            </span>
          </div>
          <div className={styles.shareActions}>
            <button className={styles.btnGhost} disabled>Share</button>
            <button className={styles.btnInstall} disabled>Build yours free →</button>
          </div>
        </div>

        <div className={`${styles.frame} ${styles.skeletonFrame}`}>
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

          {(loadingState === 'refined' || loadingState === 'detailed') && (
            <div className={`${styles.claimSkeleton} ${styles.pulse}`}>
              <div className={styles.claimLineSkeleton} />
              <div className={styles.claimLineSkeleton} style={{ width: '80%' }} />
              {loadingState === 'detailed' && <div className={styles.claimMetaSkeleton} />}
            </div>
          )}

          <div className={styles.proofSectionSkeleton}>
            <div className={`${styles.sectionHeaderSkeleton} ${styles.pulse}`} />
            <div className={styles.cardGridSkeleton}>
              <div className={`${styles.workCardSkeleton} ${styles.pulse}`}>
                <div className={styles.workThumbSkeleton} />
                <div className={styles.workBodySkeleton}>
                  <div className={styles.cardTitleSkeleton} />
                  <div className={styles.cardDetailSkeleton} />
                  {loadingState === 'detailed' && <div className={styles.evidencePillSkeleton} />}
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

        <div className={styles.loadingTip}>
          {loadingState === 'rough'    && <span>⚡ Connecting to Case registry...</span>}
          {loadingState === 'refined'  && <span>🔒 Verifying cryptographic signatures...</span>}
          {loadingState === 'detailed' && <span>📄 Retrieving certified evidence...</span>}
        </div>
      </div>
    )
  }

  // ─── Main render ────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Hidden business card for image capture */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div
          ref={cardRef}
          style={{
            width: '480px', height: '274px', background: '#FCFBF9',
            border: '1.5px solid #DCD5C2', borderRadius: '8px',
            position: 'relative', overflow: 'hidden',
            display: 'flex', padding: '24px',
            fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: 'var(--brass)' }} />
          <div style={{ width: '62%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {profile.avatar_url ? (
                <img src={`/api/proxy-avatar?key=${encodeURIComponent(profile.avatar_url)}`} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #DCD5C2' }} />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--brass-bg)', color: 'var(--brass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '15px', border: '1px solid #DCD5C2' }}>{initials}</div>
              )}
              <div>
                <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: '14px', color: 'var(--brass)', letterSpacing: '-0.01em' }}>CASE</span>
                <span style={{ display: 'block', fontSize: '8px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Verified Dossier</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '21px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 }}>{profile.display_name}</h4>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-soft)', margin: 0 }}>{profile.role_line || 'Case Member'}</p>
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
          <div style={{ width: '38%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', borderLeft: '1px dashed #DCD5C2', paddingLeft: '16px' }}>
            <span style={{ background: 'var(--ink)', color: 'var(--paper-light)', fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              {getDisplayDomain().toUpperCase()}/@{profile.handle.toUpperCase()}
            </span>
            <div style={{ background: '#fff', padding: '5px', borderRadius: '6px', border: '1px solid #DCD5C2', boxShadow: '0 2px 8px rgba(32,40,31,0.04)' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`} alt="QR Code" style={{ width: '64px', height: '64px', display: 'block' }} />
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ display: 'block', fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)' }}>SCAN FOR EVIDENCE</span>
              <span style={{ display: 'block', fontSize: '7px', color: 'var(--ink-muted)' }}>Authentic proof-of-work</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top identity bar ─────────────────────────────────── */}
      <div className={styles.shareBar}>
        <div className={styles.handleTag}>
          <span className={styles.handleText}>
            {getDisplayDomain()}/<b>@{handle}</b>
          </span>
        </div>
        <div className={styles.shareActions}>
          <button className={styles.btnGhost} onClick={handleShare}>Share</button>
          <Link href="/signup" className={styles.btnInstall}>Build yours free →</Link>
        </div>
      </div>

      {/* ── Sticky contact bar ───────────────────────────────── */}
      <div className={`${styles.stickyBar} ${stickyVisible ? styles.stickyBarVisible : ''}`}>
        <span className={styles.stickyName}>{profile.display_name}</span>
        <div className={styles.stickyActions}>
          {contactMethods.map((m, idx) => (
            <a key={idx} href={m.href} className={styles.stickyContactBtn} target={m.icon === 'Email' ? '_self' : '_blank'} rel="noopener noreferrer">
              {m.icon === 'Phone'    && <PhoneIcon />}
              {m.icon === 'WhatsApp' && <WhatsAppIcon />}
              {m.icon === 'Email'    && <EmailIcon />}
              <span>{m.label}</span>
            </a>
          ))}
          <button onClick={handleDownload} disabled={downloading} className={styles.stickyCardBtn} title="Download Business Card">
            {downloading ? <span className={styles.spinnerSm} /> : <CardIcon />}
          </button>
        </div>
      </div>

      {/* ── Main content frame ───────────────────────────────── */}
      <div className={styles.frame}>

        {/* ── HERO ──────────────────────────────────────────── */}
        <header ref={heroRef} className={styles.pHero}>
          {/* Mobile: magazine / Desktop: side-by-side */}
          <div className={styles.pHeroInner}>
            <div className={styles.pAvatarWrap}>
              {profile.avatar_url ? (
                <img
                  src={getMediaUrl(profile.avatar_url)}
                  alt={profile.display_name}
                  className={styles.pAvatar}
                />
              ) : (
                <div className={styles.pAvatarFallback}>{initials}</div>
              )}
              {/* Verified badge on avatar */}
              <div className={styles.pVerifiedBadge}>✓</div>
            </div>

            <div className={styles.pHeroText}>
              <h1 className={styles.pName}>{profile.display_name}</h1>
              {profile.role_line && (
                <p className={styles.pRole}>{profile.role_line}</p>
              )}
              {(profile.category || (profile.tags && profile.tags.length > 0)) && (
                <div className={styles.pTagsRow}>
                  {profile.category && (
                    <span className={styles.pCategoryPill}>{profile.category}</span>
                  )}
                  {profile.tags?.map(tag => (
                    <span key={tag} className={styles.pTagPill}>{tag}</span>
                  ))}
                </div>
              )}
              <div className={styles.pTrustRow}>
                {profile.location_area && profile.contact_visibility?.location !== false && (
                  <span className={styles.pTrustItem}>
                    <LocIcon />
                    {profile.location_area}
                  </span>
                )}
                {byPillar.vouched.length > 0 && (
                  <span className={styles.pTrustItem}>
                    <span className={styles.pTrustDot} />
                    <strong>{byPillar.vouched.length}</strong>&nbsp;{byPillar.vouched.length === 1 ? 'Recommendation' : 'Recommendations'}
                  </span>
                )}
                {profile.plan === 'plus' && (
                  <span className={styles.pPlusBadge}>Plus</span>
                )}
              </div>
            </div>
          </div>

          {/* Socials inside hero, below the grid */}
          {(() => {
            const cv = profile.contact_visibility
            const visible = (profile.socials || []).filter((s: SocialLink) => {
              const p = s.platform.toLowerCase()
              if (p === 'whatsapp') return cv?.whatsapp !== false
              if (p === 'email')    return cv?.email !== false
              if (p === 'phone')    return cv?.phone !== false
              return true
            })
            if (!visible.length) return null
            return (
              <div className={styles.pSocialsRow}>
                {visible.map((s: SocialLink) => (
                  <a
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.pSocialPill}
                    onClick={() => logAnalyticsEvent(profile.id, 'social_click', { referrerHost: s.platform })}
                  >
                    {s.platform}
                  </a>
                ))}
              </div>
            )
          })()}

          {/* Download business card — in hero, always visible */}
          <div className={styles.pHeroCardBtn}>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={styles.pDownloadCardBtn}
            >
              {downloading ? (
                <span className={styles.spinnerSm} />
              ) : (
                <CardIcon />
              )}
              <span>{downloading ? 'Exporting...' : 'Download Business Card'}</span>
            </button>
            {cardContacts.length === 0 && (
              <p className={styles.pCardBtnNote}>
                No public contacts — card will show profile info only
              </p>
            )}
          </div>
        </header>

        {/* ── CLAIM ─────────────────────────────────────────── */}
        {profile.claim_text && (
          <section className={styles.pClaimSection}>
            <span className={styles.pClaimMark}>&ldquo;</span>
            <blockquote className={styles.pClaimText}>{profile.claim_text}</blockquote>
            {profile.tagline && (
              <p className={styles.pTagline}>{profile.tagline}</p>
            )}
            <p className={styles.pClaimCaption}>Their claim — the proof is below.</p>
          </section>
        )}

        {/* ── SHOWCASE GALLERY ──────────────────────────────── */}
        {profile.showcase_images && profile.showcase_images.length > 0 && (
          <ShowcaseGallery images={profile.showcase_images} name={profile.display_name} />
        )}

        {/* ── WHAT I'VE DONE ────────────────────────────────── */}
        {byPillar.did.length > 0 && (
          <section className={styles.pSection}>
            <SectionLabel pillar="did" text="What I've done" />
            <div className={styles.pIslandList}>
              {byPillar.did.map(item => (
                <ProofIsland key={item.id} item={item} profileId={profile.id} />
              ))}
            </div>
          </section>
        )}

        {/* ── HOW I LEARNED IT ──────────────────────────────── */}
        {byPillar.trained.length > 0 && (
          <section className={styles.pSection}>
            <SectionLabel pillar="trained" text="How I learned it" />
            <div className={styles.pIslandList}>
              {byPillar.trained.map(item => (
                <ProofIsland key={item.id} item={item} profileId={profile.id} />
              ))}
            </div>
          </section>
        )}

        {/* ── WHAT I'M LOOKING FOR ──────────────────────────── */}
        {byPillar.aiming.length > 0 && (
          <section className={styles.pSection}>
            <SectionLabel pillar="aiming" text="What I'm looking for" />
            <div className={styles.pIslandList}>
              {byPillar.aiming.map(item => (
                <ProofIsland key={item.id} item={item} profileId={profile.id} />
              ))}
            </div>
          </section>
        )}

        {/* ── APPEARANCE & DEMEANOR ─────────────────────────── */}
        {profile.physical_attributes &&
          (profile.physical_attributes.height ||
           profile.physical_attributes.build  ||
           profile.physical_attributes.bio    ||
           profile.physical_attributes.photo_url) && (
          <section className={styles.pSection}>
            <SectionLabel pillar="physical" text="Appearance & on-site demeanor" />
            <div className={styles.pPhysicalCard}>
              <div className={styles.pPhysicalBody}>
                {profile.physical_attributes.height && (
                  <div className={styles.pPhysicalField}>
                    <span className={styles.pPhysicalLabel}>Height</span>
                    <span className={styles.pPhysicalValue}>{profile.physical_attributes.height}</span>
                  </div>
                )}
                {profile.physical_attributes.build && (
                  <div className={styles.pPhysicalField}>
                    <span className={styles.pPhysicalLabel}>Build</span>
                    <span className={styles.pPhysicalValue}>{profile.physical_attributes.build}</span>
                  </div>
                )}
                {profile.physical_attributes.bio && (
                  <p className={styles.pPhysicalBio}>{profile.physical_attributes.bio}</p>
                )}
              </div>
              {profile.physical_attributes.photo_url && (
                <div className={styles.pPhysicalPhotoWrap}>
                  <img
                    src={getMediaUrl(profile.physical_attributes.photo_url)}
                    alt={`${profile.display_name} appearance`}
                    className={styles.pPhysicalPhoto}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── RECOMMENDATIONS ───────────────────────────────── */}
        {byPillar.vouched.length > 0 && (
          <section className={styles.pSection}>
            <SectionLabel pillar="vouched" text="What people say" />
            <div className={styles.pVouchGrid}>
              {byPillar.vouched.map(item => (
                <VouchCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* ── PROMO FOOTER ──────────────────────────────────── */}
        <section className={styles.pPromo}>
          <div className={styles.pPromoText}>
            <p className={styles.pPromoHeadline}>
              Need a page like this?
            </p>
            <p className={styles.pPromoSub}>
              Build your own proof-of-work profile — free. No resume needed.
            </p>
          </div>
          <Link href="/signup" className={styles.pPromoBtn}>
            Get started free →
          </Link>
        </section>

      </div>
    </div>
  )
}

/* ─── Section label ─────────────────────────────────────────── */
function SectionLabel({ pillar, text }: { pillar: string; text: string }) {
  return (
    <div className={styles.pSectionLabel}>
      <span className={`${styles.pSectionStamp} ${styles[`pStamp_${pillar}`]}`}>
        {pillar}
      </span>
      <h2 className={styles.pSectionHeading}>{text}</h2>
    </div>
  )
}

/* ─── Proof island (inline evidence) ───────────────────────── */
function ProofIsland({ item, profileId }: { item: PublicProofItem; profileId: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const evidence = item.evidence ?? []
  const images = evidence.filter(e => e.type === 'img')
  const videos = evidence.filter(e => e.type === 'vid')
  const docs   = evidence.filter(e => e.type !== 'img' && e.type !== 'vid')

  const pillarAccent: Record<string, string> = {
    did:     'var(--ink)',
    trained: 'var(--brass)',
    vouched: 'var(--verified)',
    aiming:  'var(--aim)',
  }

  return (
    <>
      <article
        className={styles.pIsland}
        style={{ borderLeftColor: pillarAccent[item.pillar] || 'var(--line)' }}
      >
        <div className={styles.pIslandHead}>
          <h3 className={styles.pIslandTitle}>{item.title}</h3>
          {item.when_label && <span className={styles.pIslandWhen}>{item.when_label}</span>}
        </div>
        {item.detail && (
          <p className={styles.pIslandDetail}>{item.detail}</p>
        )}

        {/* Inline image grid — social media style */}
        {images.length > 0 && (
          <div className={`${styles.pEvidenceImgGrid} ${images.length === 1 ? styles.pEvidenceImgSingle : ''}`}>
            {images.map(e => (
              <button
                key={e.id}
                className={styles.pEvidenceImgBtn}
                onClick={() => {
                  setLightbox(getMediaUrl(e.storage_key))
                  logAnalyticsEvent(profileId, 'evidence_tap', { proofItemId: item.id })
                }}
                aria-label={e.caption || 'View evidence image'}
              >
                <img
                  src={getMediaUrl(e.storage_key)}
                  alt={e.caption || 'Evidence'}
                  className={styles.pEvidenceImg}
                  loading="lazy"
                />
                {e.caption && <span className={styles.pEvidenceCaption}>{e.caption}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Inline video */}
        {videos.map(e => (
          <div key={e.id} className={styles.pEvidenceVideoWrap}>
            <video
              src={getMediaUrl(e.storage_key)}
              className={styles.pEvidenceVideo}
              controls
              muted
              loop
              playsInline
            />
            {e.caption && <p className={styles.pEvidenceCaption}>{e.caption}</p>}
          </div>
        ))}

        {/* Document cards */}
        {docs.length > 0 && (
          <div className={styles.pEvidenceDocList}>
            {docs.map(e => (
              <a
                key={e.id}
                href={getMediaUrl(e.storage_key)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.pEvidenceDoc}
                onClick={() => logAnalyticsEvent(profileId, 'evidence_tap', { proofItemId: item.id })}
              >
                <span className={styles.pEvidenceDocIcon}>
                  <DocIcon />
                </span>
                <span className={styles.pEvidenceDocInfo}>
                  <span className={styles.pEvidenceDocLabel}>Document</span>
                  <span className={styles.pEvidenceDocName}>{e.caption || 'View Certificate / Document'}</span>
                </span>
                <span className={styles.pEvidenceDocArrow}>→</span>
              </a>
            ))}
          </div>
        )}
      </article>

      {/* Lightbox */}
      {lightbox && (
        <div className={styles.pLightbox} onClick={() => setLightbox(null)}>
          <button className={styles.pLightboxClose} onClick={() => setLightbox(null)} aria-label="Close">✕</button>
          <div className={styles.pLightboxContent} onClick={e => e.stopPropagation()}>
            <img src={lightbox} alt="Evidence full size" className={styles.pLightboxImg} />
          </div>
        </div>
      )}
    </>
  )
}

/* ─── Vouch card ────────────────────────────────────────────── */
function VouchCard({ item }: { item: PublicProofItem }) {
  // Parse "From Name (Title): "Quote text""
  const detailStr = item.detail || ''
  const nameMatch  = detailStr.match(/From\s+([^(:]+)/)
  const titleMatch = detailStr.match(/\(([^)]+)\)/)
  const quoteMatch = detailStr.match(/"([^"]+)"/)

  const name  = nameMatch  ? nameMatch[1].trim()  : 'Verified Recommender'
  const title = titleMatch ? titleMatch[1].trim()  : 'Professional Contact'
  const quote = quoteMatch ? quoteMatch[1]         : item.title
  const initLetter = name[0]?.toUpperCase() || 'R'

  return (
    <article className={styles.pVouchCard}>
      {/* Large watermark quote mark */}
      <span className={styles.pVouchWatermark}>&ldquo;</span>
      <p className={styles.pVouchQuote}>&ldquo;{quote}&rdquo;</p>
      <footer className={styles.pVouchFooter}>
        <div className={styles.pVouchAvatar}>{initLetter}</div>
        <div className={styles.pVouchMeta}>
          <span className={styles.pVouchName}>{name}</span>
          <span className={styles.pVouchTitle}>{title}</span>
        </div>
        <span className={styles.pVouchVerifiedBadge}>✓ Verified</span>
      </footer>
      {item.when_label && (
        <p className={styles.pVouchDate}>{item.when_label}</p>
      )}
    </article>
  )
}

/* ─── Showcase gallery ──────────────────────────────────────── */
function ShowcaseGallery({ images, name }: { images: string[]; name: string }) {
  const [activeImg, setActiveImg] = useState<string | null>(null)

  return (
    <>
      <div className={styles.pShowcaseStrip}>
        {images.map((imgUrl, idx) => (
          <button
            key={idx}
            className={styles.pShowcaseItem}
            onClick={() => setActiveImg(imgUrl)}
            aria-label={`${name} showcase image ${idx + 1}`}
          >
            <img
              src={getMediaUrl(imgUrl)}
              alt={`${name} Showcase ${idx + 1}`}
              className={styles.pShowcaseImg}
            />
          </button>
        ))}
      </div>

      {activeImg && (
        <div className={styles.pLightbox} onClick={() => setActiveImg(null)}>
          <button className={styles.pLightboxClose} onClick={() => setActiveImg(null)} aria-label="Close">✕</button>
          <div className={styles.pLightboxContent} onClick={e => e.stopPropagation()}>
            <img src={getMediaUrl(activeImg)} alt="Showcase full size" className={styles.pLightboxImg} />
          </div>
        </div>
      )}
    </>
  )
}

/* ─── Inline SVG icons ──────────────────────────────────────── */
function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function LocIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
