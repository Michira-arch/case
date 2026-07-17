'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadAvatar, uploadEvidence } from '@/lib/r2'
import type { ContactVisibility, SocialLink } from '@/lib/types'
import styles from './QuickActionDrawer.module.css'

export interface QuickActionDrawerProps {
  type: 'avatar' | 'claim' | 'basics' | 'proof'
  profileId: string
  currentValue?: string
  currentRoleLine?: string
  currentTagline?: string
  currentSocials?: SocialLink[]
  currentContactVisibility?: ContactVisibility | null
  onClose: () => void
  onSaved: (newValue: any) => void
}

const CLAIM_MAX = 500

const WHY_CONTENT = {
  avatar: {
    title: 'Your face builds trust',
    text: 'Profiles with a clear, friendly photo receive 4× more engagement. People make decisions based on recognising and trusting a face before they read a single word.',
  },
  claim: {
    title: 'State your capabilities',
    text: "Your claim is where you declare what you can do, or the skill/knowledge you posit that you possess. Without it, visitors won't understand what you are trying to prove. Your proof items below will serve as evidence backing this up.",
  },
  basics: {
    title: 'Tell them who you are',
    text: 'Your name, role, and tagline are the first three things a visitor reads. They decide in under 3 seconds if this profile is worth their time. Make it sharp and honest.',
  },
  proof: {
    title: 'Prove your work',
    text: 'An unbacked claim is just a promise. Adding a photo, invoice, or PDF of your work transforms it into certified proof that cannot be disputed by potential clients.',
  },
}

const DRAWER_TITLES = {
  avatar: 'Profile Photo',
  claim: 'Opening Claim',
  basics: 'Profile Basics',
  proof: 'Quick Proof & Evidence',
}

export default function QuickActionDrawer({
  type,
  profileId,
  currentValue = '',
  currentRoleLine = '',
  currentTagline = '',
  currentSocials = [],
  currentContactVisibility = null,
  onClose,
  onSaved,
}: QuickActionDrawerProps) {
  const why = WHY_CONTENT[type]

  // ---- avatar state ----
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [croppingImageSrc, setCroppingImageSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const cropImgRef = useRef<HTMLImageElement>(null)

  // ---- claim state ----
  const [claimText, setClaimText] = useState(currentValue)

  // ---- basics state ----
  const [displayName, setDisplayName] = useState(currentValue)
  const [roleLine, setRoleLine] = useState(currentRoleLine)
  const [tagline, setTagline] = useState(currentTagline)

  const [email, setEmail] = useState(() => {
    return (currentSocials || []).find(s => s.platform.toLowerCase() === 'email')?.url.replace('mailto:', '') || ''
  })
  const [phone, setPhone] = useState(() => {
    return (currentSocials || []).find(s => s.platform.toLowerCase() === 'phone')?.url.replace('tel:', '') || ''
  })
  const [whatsapp, setWhatsapp] = useState(() => {
    return (currentSocials || []).find(s => s.platform.toLowerCase() === 'whatsapp')?.url.replace('https://wa.me/', '') || ''
  })

  const [emailVisible, setEmailVisible] = useState(currentContactVisibility?.email !== false)
  const [phoneVisible, setPhoneVisible] = useState(currentContactVisibility?.phone !== false)
  const [whatsappVisible, setWhatsappVisible] = useState(currentContactVisibility?.whatsapp !== false)

  // ---- proof state ----
  const [proofTitle, setProofTitle] = useState('')
  const [proofPillar, setProofPillar] = useState<'did' | 'trained' | 'vouched' | 'aiming'>('did')
  const [proofFile, setProofFile] = useState<File | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setError(null)
    
    // Read the file as a data URL for cropping
    const reader = new FileReader()
    reader.onload = () => {
      setCroppingImageSrc(reader.result as string)
      setZoom(1)
      setOffsetX(0)
      setOffsetY(0)
    }
    reader.readAsDataURL(file)
  }

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file)
    setError(null)
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    try {
      if (type === 'avatar') {
        let fileToUpload = avatarFile

        if (croppingImageSrc && cropImgRef.current) {
          const croppedBlob = await new Promise<Blob | null>((resolve) => {
            const canvas = document.createElement('canvas')
            canvas.width = 400
            canvas.height = 400
            const ctx = canvas.getContext('2d')
            if (!ctx || !cropImgRef.current) {
              resolve(null)
              return
            }
            const img = cropImgRef.current
            const imgWidth = img.naturalWidth
            const imgHeight = img.naturalHeight
            const size = Math.min(imgWidth, imgHeight)

            // Zoom determines size of the crop box inside source coordinates
            const cropSize = size / zoom

            // Horizontal & vertical offsets in source coordinates
            const xMaxOffset = (imgWidth - cropSize) / 2
            const yMaxOffset = (imgHeight - cropSize) / 2

            // Sliders represent pixel values on 250px UI scale, convert back to source scale
            const uiToSourceRatio = imgWidth / 250
            const xOffset = offsetX * uiToSourceRatio
            const yOffset = offsetY * uiToSourceRatio

            // Clamp sx and sy so they do not go outside source boundary
            const sx = Math.max(0, Math.min(imgWidth - cropSize, (imgWidth - cropSize) / 2 + xOffset))
            const sy = Math.max(0, Math.min(imgHeight - cropSize, (imgHeight - cropSize) / 2 + yOffset))

            ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, 400, 400)
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
          })

          if (croppedBlob) {
            fileToUpload = new File([croppedBlob], 'avatar-cropped.jpg', { type: 'image/jpeg' })
          }
        }

        if (!fileToUpload) {
          setError('Please select an image file.')
          setSaving(false)
          return
        }
        const storageKey = await uploadAvatar(fileToUpload, profileId)
        onSaved(storageKey)
      } else if (type === 'claim') {
        const supabase = createClient()
        const { error: dbError } = await supabase
          .from('profiles')
          .update({ claim_text: claimText.trim() || null })
          .eq('id', profileId)
        if (dbError) throw dbError
        onSaved(claimText.trim())
      } else if (type === 'basics') {
        const supabase = createClient()
        
        // Filter out existing Email, Phone, WhatsApp entries from currentSocials
        const otherSocials = (currentSocials || []).filter(
          s => !['email', 'phone', 'whatsapp'].includes(s.platform.toLowerCase())
        )

        // Build new contact entries
        const newContacts = []
        if (email.trim()) {
          newContacts.push({ platform: 'Email', url: `mailto:${email.trim()}` })
        }
        if (phone.trim()) {
          newContacts.push({ platform: 'Phone', url: `tel:${phone.trim()}` })
        }
        if (whatsapp.trim()) {
          const cleanWa = whatsapp.trim().replace('+', '').replace('https://wa.me/', '')
          newContacts.push({ platform: 'WhatsApp', url: `https://wa.me/${cleanWa}` })
        }

        const updatedSocials = [...otherSocials, ...newContacts]

        const nextCv = {
          ...currentContactVisibility,
          phone: phoneVisible,
          email: emailVisible,
          whatsapp: whatsappVisible,
        }

        const updates = {
          display_name: displayName.trim(),
          role_line: roleLine.trim() || null,
          tagline: tagline.trim() || null,
          socials: updatedSocials,
          contact_visibility: nextCv,
        }

        const { error: dbError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', profileId)

        if (dbError) throw dbError
        onSaved(updates)
      } else if (type === 'proof') {
        if (!proofTitle.trim()) {
          setError('Please enter a title for the proof item.')
          setSaving(false)
          return
        }
        if (!proofFile) {
          setError('Please select an evidence file.')
          setSaving(false)
          return
        }

        const proofItemId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)

        // Upload evidence file to R2
        const uploadResult = await uploadEvidence({
          file: proofFile,
          profileId,
          proofItemId,
        })

        const supabase = createClient()

        // Insert proof item
        const { data: proofItem, error: proofError } = await supabase
          .from('proof_items')
          .insert({
            id: proofItemId,
            profile_id: profileId,
            pillar: proofPillar,
            title: proofTitle.trim(),
            visible: true,
            sort_order: 0,
            source: 'owner',
          })
          .select()
          .single()

        if (proofError) throw proofError

        // Insert evidence record
        const { data: evidenceRec, error: evidenceError } = await supabase
          .from('evidence')
          .insert({
            proof_item_id: proofItemId,
            type: uploadResult.type,
            storage_key: uploadResult.storageKey,
            bytes_original: uploadResult.bytesOriginal,
            bytes_compressed: uploadResult.bytesCompressed,
          })
          .select()
          .single()

        if (evidenceError) throw evidenceError

        // Return the combined proof item with its evidence
        onSaved({
          ...proofItem,
          evidence: [evidenceRec],
        })
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isSaveDisabled = saving || (
    type === 'avatar' ? !croppingImageSrc :
    type === 'claim' ? claimText.trim().length === 0 || claimText.length > CLAIM_MAX :
    type === 'proof' ? !proofTitle.trim() || !proofFile :
    displayName.trim().length === 0
  )

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={DRAWER_TITLES[type]}
      >
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>{DRAWER_TITLES[type]}</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* The Why */}
          <div className={styles.why}>
            <p className={styles.whyTitle}>{why.title}</p>
            <p className={styles.whyText}>{why.text}</p>
          </div>

          {/* Form */}
          <div className={styles.form}>
            {type === 'avatar' && (
              <>
                {croppingImageSrc ? (
                  <div className={styles.cropWrapper}>
                    <span className={styles.cropTitle}>Position and Zoom Your Photo</span>
                    <div className={styles.cropContainer}>
                      <img
                        ref={cropImgRef}
                        src={croppingImageSrc}
                        alt="Crop Preview"
                        style={{
                          transform: `scale(${zoom}) translate(${offsetX}px, ${offsetY}px)`,
                          transformOrigin: 'center center',
                        }}
                        className={styles.cropImg}
                      />
                      <div className={styles.cropCircleOverlay} />
                    </div>

                    <div className={styles.cropControls}>
                      <div className={styles.cropSliderField}>
                        <div className={styles.cropSliderHeader}>
                          <span className={styles.cropSliderLabel}>Zoom</span>
                          <span className={styles.cropSliderVal}>{Math.round(zoom * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="3"
                          step="0.05"
                          value={zoom}
                          onChange={(e) => setZoom(parseFloat(e.target.value))}
                          className={styles.cropSlider}
                        />
                      </div>

                      <div className={styles.cropSliderField}>
                        <div className={styles.cropSliderHeader}>
                          <span className={styles.cropSliderLabel}>Horizontal Offset</span>
                          <span className={styles.cropSliderVal}>{offsetX}px</span>
                        </div>
                        <input
                          type="range"
                          min="-150"
                          max="150"
                          step="1"
                          value={offsetX}
                          onChange={(e) => setOffsetX(parseInt(e.target.value))}
                          className={styles.cropSlider}
                        />
                      </div>

                      <div className={styles.cropSliderField}>
                        <div className={styles.cropSliderHeader}>
                          <span className={styles.cropSliderLabel}>Vertical Offset</span>
                          <span className={styles.cropSliderVal}>{offsetY}px</span>
                        </div>
                        <input
                          type="range"
                          min="-150"
                          max="150"
                          step="1"
                          value={offsetY}
                          onChange={(e) => setOffsetY(parseInt(e.target.value))}
                          className={styles.cropSlider}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.changePhotoBtn}
                      onClick={() => setCroppingImageSrc(null)}
                    >
                      Choose different photo
                    </button>
                  </div>
                ) : (
                  <>
                    {currentValue && (
                      <div className={styles.avatarPreviewWrap}>
                        <img
                          src={`/api/proxy-avatar?key=${encodeURIComponent(currentValue)}`}
                          alt="Current avatar"
                          className={styles.avatarPreview}
                        />
                        <span className={styles.avatarPreviewLabel}>Current photo</span>
                      </div>
                    )}
                    <div className={styles.dropZone}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        aria-label="Upload avatar image"
                      />
                      <span className={styles.dropZoneText}>
                        Click or drag & drop a photo to upload
                      </span>
                      <span className={styles.dropZoneHint}>JPG, PNG, WebP — max 5 MB</span>
                    </div>
                  </>
                )}
              </>
            )}

            {type === 'claim' && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="claim-input">
                  Stated Capability / Skill Claim
                </label>
                <textarea
                  id="claim-input"
                  className={`${styles.input} ${styles.textarea}`}
                  value={claimText}
                  onChange={e => setClaimText(e.target.value)}
                  maxLength={CLAIM_MAX}
                  placeholder="e.g., I build responsive, accessible web applications in React. I specialize in state management and web performance. Everything below proves it."
                  rows={5}
                />
                <span
                  className={`${styles.charCounter} ${claimText.length > CLAIM_MAX * 0.9 ? styles.charCounterWarn : ''}`}
                >
                  {claimText.length}/{CLAIM_MAX}
                </span>
              </div>
            )}

            {type === 'basics' && (
              <>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="basics-name">
                    Display Name
                  </label>
                  <input
                    id="basics-name"
                    type="text"
                    className={styles.input}
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="basics-role">
                    Role / Title
                  </label>
                  <input
                    id="basics-role"
                    type="text"
                    className={styles.input}
                    value={roleLine}
                    onChange={e => setRoleLine(e.target.value)}
                    placeholder="e.g. Senior UX Designer"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="basics-tagline">
                    Tagline
                  </label>
                  <input
                    id="basics-tagline"
                    type="text"
                    className={styles.input}
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="One-liner bio — your story in a sentence"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="basics-email">
                    Preferred Email Address
                  </label>
                  <input
                    id="basics-email"
                    type="email"
                    className={styles.input}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. name@domain.com"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-soft)', marginTop: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={emailVisible}
                      onChange={e => setEmailVisible(e.target.checked)}
                    />
                    Show email publicly on profile
                  </label>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="basics-phone">
                    Primary Phone Number
                  </label>
                  <input
                    id="basics-phone"
                    type="tel"
                    className={styles.input}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +254 700 000000"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-soft)', marginTop: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={phoneVisible}
                      onChange={e => setPhoneVisible(e.target.checked)}
                    />
                    Show phone number publicly on profile
                  </label>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="basics-whatsapp">
                    WhatsApp Number
                  </label>
                  <input
                    id="basics-whatsapp"
                    type="tel"
                    className={styles.input}
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    placeholder="e.g. +254 700 000000"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-soft)', marginTop: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={whatsappVisible}
                      onChange={e => setWhatsappVisible(e.target.checked)}
                    />
                    Show WhatsApp link publicly on profile
                  </label>
                </div>
              </>
            )}

            {type === 'proof' && (
              <>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="proof-title">
                    Title / What did you do or learn?
                  </label>
                  <input
                    id="proof-title"
                    type="text"
                    className={styles.input}
                    value={proofTitle}
                    onChange={e => setProofTitle(e.target.value)}
                    placeholder="e.g., Catered corporate event, Certified First Aid Provider"
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="proof-pillar">
                    Pillar category
                  </label>
                  <select
                    id="proof-pillar"
                    className={styles.input}
                    value={proofPillar}
                    onChange={e => setProofPillar(e.target.value as any)}
                  >
                    <option value="did">Work I completed (did)</option>
                    <option value="trained">Training or certificate (trained)</option>
                    <option value="vouched">Recommendation (recommended)</option>
                    <option value="aiming">Future goal (aiming)</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Attach Evidence (Photo or PDF)
                  </label>
                  <div className={styles.dropZone}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleProofFileChange}
                      aria-label="Upload evidence file"
                    />
                    <span className={styles.dropZoneText}>
                      {proofFile ? proofFile.name : 'Click to select a photo or PDF'}
                    </span>
                    <span className={styles.dropZoneHint}>
                      WebP, JPG, PNG, PDF — max 5 MB
                    </span>
                  </div>
                </div>
              </>
            )}

            {error && <p className={styles.errorMsg}>{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  )
}
