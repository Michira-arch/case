'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadAvatar, uploadEvidence } from '@/lib/r2'
import styles from './QuickActionDrawer.module.css'

export interface QuickActionDrawerProps {
  type: 'avatar' | 'claim' | 'basics' | 'proof'
  profileId: string
  currentValue?: string
  currentRoleLine?: string
  currentTagline?: string
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
  onClose,
  onSaved,
}: QuickActionDrawerProps) {
  const why = WHY_CONTENT[type]

  // ---- avatar state ----
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)

  // ---- claim state ----
  const [claimText, setClaimText] = useState(currentValue)

  // ---- basics state ----
  const [displayName, setDisplayName] = useState(currentValue)
  const [roleLine, setRoleLine] = useState(currentRoleLine)
  const [tagline, setTagline] = useState(currentTagline)

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
    const url = URL.createObjectURL(file)
    setAvatarPreviewUrl(url)
    setError(null)
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
        if (!avatarFile) {
          setError('Please select an image file.')
          setSaving(false)
          return
        }
        const storageKey = await uploadAvatar(avatarFile, profileId)
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
        const updates = {
          display_name: displayName.trim(),
          role_line: roleLine.trim() || null,
          tagline: tagline.trim() || null,
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
    type === 'avatar' ? !avatarFile :
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
                {(avatarPreviewUrl || currentValue) && (
                  <div className={styles.avatarPreviewWrap}>
                    <img
                      src={avatarPreviewUrl ?? `/api/proxy-avatar?key=${encodeURIComponent(currentValue)}`}
                      alt="Current avatar"
                      className={styles.avatarPreview}
                    />
                    <span className={styles.avatarPreviewLabel}>
                      {avatarPreviewUrl ? 'New photo (not yet saved)' : 'Current photo'}
                    </span>
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
                    {avatarFile ? avatarFile.name : 'Click or drag & drop a photo'}
                  </span>
                  <span className={styles.dropZoneHint}>JPG, PNG, WebP — max 5 MB</span>
                </div>
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
                    placeholder="e.g., Completed haircut for client, Certified JavaScript Developer"
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
                    <option value="vouched">Vouch-based proof (vouched)</option>
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
