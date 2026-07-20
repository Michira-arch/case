'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import styles from './card-builder.module.css'

export default function CardBuilderPage() {
  const [name, setName] = useState('')
  const [profession, setProfession] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [bio, setBio] = useState('')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [originUrl, setOriginUrl] = useState('https://caseshow.info')
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin)
    }
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const initials = name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'C'

  // Construct Scan landing page URL with secondary contacts
  const queryParams = new URLSearchParams()
  if (name) queryParams.set('n', name)
  if (profession) queryParams.set('p', profession)
  if (whatsapp) queryParams.set('w', whatsapp.replace(/\D/g, ''))
  if (phone) queryParams.set('ph', phone.replace(/\D/g, ''))
  if (email) queryParams.set('e', email)
  if (website) queryParams.set('s', website)
  if (bio) queryParams.set('b', bio)
  
  const scanUrl = `${originUrl}/c?${queryParams.toString()}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanUrl)}`

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      if (cardRef.current) {
        const canvas = await html2canvas(cardRef.current, {
          scale: 3, // 3x scale for print quality (high-res PNG)
          useCORS: true,
          backgroundColor: '#FCFBF9',
          logging: false,
        })
        
        const dataUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = `case-card-${name ? name.toLowerCase().replace(/\s+/g, '-') : 'business-card'}.png`
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
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.wordmark}>Case</Link>
          <div className={styles.navActions}>
            <Link href="/" className="btn btn--outline btn--sm">Back to Home</Link>
            <Link href="/signup" className="btn btn--brass btn--sm">Sign up free</Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Free Business Card Maker</h1>
          <p className={styles.sub}>
            Create your premium business card in 1 minute. No signup required. 
            The QR code points directly to a mobile-friendly scan page for your contacts.
          </p>
        </div>

        <div className={styles.builderGrid}>
          {/* Left panel: Form */}
          <div className={styles.formPanel}>
            <h2 className={styles.panelTitle}>1. Fill in your details</h2>
            
            <div className="field">
              <label className="label">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Joy Kimani"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">Profession / Role</label>
              <input
                type="text"
                placeholder="e.g. Professional Tailor & Designer"
                value={profession}
                onChange={e => setProfession(e.target.value)}
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">WhatsApp Number (with Country Code)</label>
              <input
                type="text"
                placeholder="e.g. 254712345678"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">Phone Number (Secondary Contact)</label>
              <input
                type="text"
                placeholder="e.g. 254700000000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">Email Address (Secondary Contact)</label>
              <input
                type="email"
                placeholder="e.g. joy@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">Social Media Page / Website Link</label>
              <input
                type="text"
                placeholder="e.g. instagram.com/joydesigns"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className="input"
              />
            </div>

            <div className="field">
              <label className="label">Short Slogan / Bio (Optional)</label>
              <textarea
                placeholder="e.g. Bespoke tailoring and wedding garments with 5+ years experience."
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="input textarea"
                maxLength={100}
              />
            </div>

            <div className="field">
              <label className="label">Profile Image (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
              <p className={styles.fileHint}>Processed entirely on your device.</p>
            </div>
          </div>

          {/* Right panel: Preview */}
          <div className={styles.previewPanel}>
            <h2 className={styles.panelTitle}>2. Card Preview</h2>

            <div className={styles.cardContainer}>
              <div ref={cardRef} className={`${styles.card} printableCard`}>
                <div className={styles.cardStripe} />
                
                {/* Left Column */}
                <div className={styles.leftCol}>
                  <div className={styles.branding}>
                    {imageSrc ? (
                      <img src={imageSrc} alt="" className={styles.avatar} />
                    ) : (
                      <div className={styles.avatarFallback}>{initials}</div>
                    )}
                    <div>
                      <span className={styles.brandTitle}>CASE</span>
                      <span className={styles.brandSubtitle}>QR Bearer</span>
                    </div>
                  </div>

                  <div className={styles.personalInfo}>
                    <h4 className={styles.name}>{name || 'Your Name'}</h4>
                    <p className={styles.role}>{profession || 'Your Profession'}</p>
                    
                    <div className={styles.contactsList}>
                      {whatsapp && (
                        <span className={styles.contactItem}>
                          <span className={styles.contactLabel}>WhatsApp:</span>
                          <span className={styles.contactVal}>{whatsapp}</span>
                        </span>
                      )}
                      {phone && (
                        <span className={styles.contactItem}>
                          <span className={styles.contactLabel}>Phone:</span>
                          <span className={styles.contactVal}>{phone}</span>
                        </span>
                      )}
                      {email && (
                        <span className={styles.contactItem}>
                          <span className={styles.contactLabel}>Email:</span>
                          <span className={styles.contactVal}>{email}</span>
                        </span>
                      )}
                      {website && (
                        <span className={styles.contactItem}>
                          <span className={styles.contactLabel}>Web:</span>
                          <span className={styles.contactVal}>{website}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className={styles.tagline}>
                    {bio ? `"${bio}"` : '"Bespoke work, backed by proof."'}
                  </p>
                </div>

                {/* Right Column */}
                <div className={styles.rightCol}>
                  <span className={styles.handleBadge}>SCAN VIA CASE</span>
                  
                  <div className={styles.qrBox}>
                    <img src={qrUrl} alt="QR Code" className={styles.qrCode} />
                  </div>

                  <div className={styles.qrFooter}>
                    <span className={styles.qrLabel}>SCAN TO CONNECT</span>
                    <span className={styles.qrDesc}>Instant verification</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button onClick={handlePrint} className="btn btn--outline btn--full">
                🖨️ Print / Save as PDF
              </button>
              <button onClick={handleDownload} disabled={downloading} className="btn btn--brass btn--full">
                {downloading ? 'Exporting Image…' : '💾 Download PNG'}
              </button>
            </div>
          </div>
        </div>

        {/* Marketing CTA Box */}
        <div className={styles.ctaBox}>
          <div className={styles.ctaContent}>
            <h3>Need a complete online portfolio?</h3>
            <p>
              A business card shows your contacts. A full **Case Profile** proves you can actually do the job. 
              Upload project photos, attach certificates, showcase skills videos, and get vouched by real clients. 
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/signup" className="btn btn--brass btn--lg">
              Create your full Case — Free
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <span className={styles.wordmark}>Case</span>
            <p className={styles.footerSub}>Instant business cards and verification sheets.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
