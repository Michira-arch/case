'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PublicProfile, PublicProofItem, PublicEvidence, SocialLink } from '@/lib/types'
import { getMediaUrl } from '@/lib/r2'
import styles from './profile.module.css'

interface Props {
  profile: PublicProfile
  handle: string
}

export default function ProfilePublicView({ profile, handle }: Props) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://case.app'
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
            {profile.socials?.length > 0 && (
              <div className={styles.socialRow}>
                {profile.socials.map((s: SocialLink) => (
                  <a
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialPill}
                  >
                    {s.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Showcase Images Gallery */}
        {profile.showcase_images && profile.showcase_images.length > 0 && (
          <ShowcaseGallery images={profile.showcase_images} name={profile.display_name} />
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
                <WorkCard key={item.id} item={item} />
              ))}
            </div>
          </ProofSection>
        )}

        {/* TRAINED section */}
        {byPillar.trained.length > 0 && (
          <ProofSection pillar="trained" heading="How I learned it">
            <div className={styles.trainedList}>
              {byPillar.trained.map(item => (
                <TrainedRow key={item.id} item={item} />
              ))}
            </div>
          </ProofSection>
        )}

        {/* VOUCHED section */}
        {byPillar.vouched.length > 0 && (
          <ProofSection pillar="vouched" heading="Who'll speak for me">
            <div className={styles.quoteGrid}>
              {byPillar.vouched.map(item => (
                <QuoteCard key={item.id} item={item} />
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
function WorkCard({ item }: { item: PublicProofItem }) {
  const [open, setOpen] = useState(false)
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
        {hasEvidence ? (
          <button
            className="evidence-pill"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} evidence for ${item.title}`}
          >
            <PaperclipIcon />
            {item.evidence!.length} {item.evidence!.length === 1 ? 'file' : 'files'}
          </button>
        ) : (
          <span className="evidence-pill evidence-pill--empty">no evidence yet</span>
        )}
        {open && hasEvidence && (
          <EvidencePanel evidence={item.evidence!} />
        )}
      </div>
    </div>
  )
}

/* ---- Trained row ---- */
function TrainedRow({ item }: { item: PublicProofItem }) {
  const [open, setOpen] = useState(false)
  const hasEvidence = (item.evidence?.length ?? 0) > 0

  return (
    <div className={styles.trainedRow}>
      <div className={styles.trainedTop}>
        <div>
          <h3 className={styles.trainedTitle}>
            {item.title}
            {hasEvidence && (
              <button
                className={`evidence-pill ${styles.inlineEvidencePill}`}
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
              >
                <PaperclipIcon />
                {item.evidence!.length}
              </button>
            )}
          </h3>
          {item.detail && <p className={styles.trainedDetail}>{item.detail}</p>}
        </div>
        {item.when_label && (
          <span className={styles.whenLabel}>{item.when_label}</span>
        )}
      </div>
      {open && hasEvidence && <EvidencePanel evidence={item.evidence!} />}
    </div>
  )
}

/* ---- Quote card (vouched) ---- */
function QuoteCard({ item }: { item: PublicProofItem }) {
  const [open, setOpen] = useState(false)
  const hasEvidence = (item.evidence?.length ?? 0) > 0

  return (
    <div className={styles.quoteCard}>
      <p className={styles.quoteText}>{item.title}</p>
      <p className={styles.quoteWho}>{item.detail}</p>
      {hasEvidence && (
        <>
          <button
            className="evidence-pill"
            onClick={() => setOpen(o => !o)}
            style={{ marginTop: 8 }}
          >
            <PaperclipIcon />
            {item.evidence!.length} {item.evidence!.length === 1 ? 'file' : 'files'}
          </button>
          {open && <EvidencePanel evidence={item.evidence!} />}
        </>
      )}
    </div>
  )
}

/* ---- Evidence panel ---- */
function EvidencePanel({ evidence }: { evidence: PublicEvidence[] }) {
  const [previewingEv, setPreviewingEv] = useState<PublicEvidence | null>(null)

  return (
    <>
      <div className={styles.evidencePanel}>
        {evidence.map(e => (
          <div
            key={e.id}
            className={`${styles.evChip} ${styles.evChipInteractive}`}
            onClick={() => setPreviewingEv(e)}
            role="button"
            tabIndex={0}
            onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') setPreviewingEv(e) }}
          >
            <EvidenceIcon type={e.type} storageKey={e.storage_key} />
            <span className={styles.evCaption}>{e.caption || e.type.toUpperCase()}</span>
          </div>
        ))}
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
