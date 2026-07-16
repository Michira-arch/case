'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { getMediaUrl } from '@/lib/r2'
import { getDisplayDomain } from '@/lib/domain'
import styles from './BusinessCardModal.module.css'

interface BusinessCardModalProps {
  profile: Profile
  onClose: () => void
}

export default function BusinessCardModal({ profile, onClose }: BusinessCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const initials = profile.display_name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'C'

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://caseshow.info')
  const profileUrl = `${appUrl}/@${profile.handle}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`

  // Print Card
  const handlePrint = () => {
    window.print()
  }

  // Dynamic Image Download using html2canvas
  const handleDownload = async () => {
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      if (cardRef.current) {
        // Temporarily scale up the card for higher resolution output
        const canvas = await html2canvas(cardRef.current, {
          scale: 3, // 3x scale for print quality (high-res PNG)
          useCORS: true,
          backgroundColor: '#FCFBF9',
          logging: false,
        })
        
        const dataUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = `case-card-${profile.handle}.png`
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      console.error('Failed to export business card image:', err)
      alert('Could not generate image. Please use "Print / Save to PDF" instead.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div>
            <h3>Your Case Business Card</h3>
            <p className={styles.modalSub}>Print this card, save it as a PDF, or download a high-res PNG to share.</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        {/* Printable Card Container */}
        <div className={styles.cardContainer}>
          <div ref={cardRef} className={`${styles.card} printableCard`}>
            {/* Elegant side border in Case Brass */}
            <div className={styles.cardStripe} />

            {/* Left Column: Profile & Copy */}
            <div className={styles.leftCol}>
              <div className={styles.branding}>
                {profile.avatar_url ? (
                  <img
                    src={`/api/proxy-avatar?key=${encodeURIComponent(profile.avatar_url)}`}
                    alt=""
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarFallback}>{initials}</div>
                )}
                <div>
                  <span className={styles.brandTitle}>CASE</span>
                  <span className={styles.brandSubtitle}>Verified Dossier</span>
                </div>
              </div>

              <div className={styles.personalInfo}>
                <h4 className={styles.name}>{profile.display_name}</h4>
                <p className={styles.role}>{profile.role_line || 'Case Member'}</p>
              </div>

              <p className={styles.tagline}>
                {profile.tagline ? `"${profile.tagline.slice(0, 85)}${profile.tagline.length > 85 ? '...' : ''}"` : 'State your claim. Present your evidence.'}
              </p>
            </div>

            {/* Right Column: Connection / QR */}
            <div className={styles.rightCol}>
              <span className={styles.handleBadge}>{getDisplayDomain().toUpperCase()}/@{profile.handle.toUpperCase()}</span>
              
              <div className={styles.qrBox}>
                <img src={qrUrl} alt="QR Code" className={styles.qrCode} />
              </div>

              <div className={styles.qrFooter}>
                <span className={styles.qrLabel}>SCAN FOR EVIDENCE</span>
                <span className={styles.qrDesc}>Authentic proof-of-work</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className={styles.modalActions}>
          <button onClick={handlePrint} className="btn btn--outline">
            🖨️ Print / Save to PDF
          </button>
          <button onClick={handleDownload} disabled={downloading} className="btn btn--brass">
            {downloading ? 'Generating PNG…' : '💾 Download high-res PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}
