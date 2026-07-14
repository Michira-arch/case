'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadAvatar, getMediaUrl } from '@/lib/r2'
import Link from 'next/link'
import type { ContactVisibility } from '@/lib/types'
import styles from './settings.module.css'

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [roleLine, setRoleLine]       = useState('')
  const [tagline, setTagline]         = useState('')
  const [category, setCategory]       = useState('')
  const [locationArea, setLocationArea] = useState('')
  const [avatarUrl, setAvatarUrl]     = useState('')
  const [showcaseImages, setShowcaseImages] = useState<string[]>([])
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingShowcase, setUploadingShowcase] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [height, setHeight] = useState('')
  const [build, setBuild] = useState('')
  const [physicalBio, setPhysicalBio] = useState('')
  const [physicalPhotoUrl, setPhysicalPhotoUrl] = useState('')
  const [uploadingPhysicalPhoto, setUploadingPhysicalPhoto] = useState(false)
  const [isPublic, setIsPublic]       = useState(true)
  const [discoverable, setDiscoverable] = useState(true)
  const [contactVisibility, setContactVisibility] = useState<ContactVisibility>({ phone: true, email: true, whatsapp: true, location: true })
  const [claimText, setClaimText]     = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at')
        .limit(1)
        .single()

      if (data) {
        setProfile(data)
        setDisplayName(data.display_name || '')
        setRoleLine(data.role_line || '')
        setTagline(data.tagline || '')
        setCategory(data.category || '')
        setLocationArea(data.location_area || '')
        setAvatarUrl(data.avatar_url || '')
        setShowcaseImages(data.showcase_images || [])
        const phys = data.physical_attributes || {}
        setHeight(phys.height || '')
        setBuild(phys.build || '')
        setPhysicalBio(phys.bio || '')
        setPhysicalPhotoUrl(phys.photo_url || '')
        setIsPublic(data.is_public)
        setDiscoverable(data.discoverable)
        setContactVisibility(data.contact_visibility || { phone: true, email: true, whatsapp: true, location: true })
        setClaimText(data.claim_text || '')

        // Fetch subscription to verify tier
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('profile_id', data.id)
          .single()
        setSubscription(sub)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setSaved(false)

    await supabase.from('profiles').update({
      display_name:  displayName,
      role_line:     roleLine,
      tagline,
      category,
      location_area: locationArea,
      avatar_url:    avatarUrl,
      showcase_images: showcaseImages,
      physical_attributes: {
        height,
        build,
        bio: physicalBio,
        photo_url: physicalPhotoUrl,
      },
      is_public:     isPublic,
      discoverable,
      contact_visibility: contactVisibility,
      claim_text:    claimText,
    }).eq('id', profile.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingAvatar(true)
    try {
      const storageKey = await uploadAvatar(file, profile.id)
      setAvatarUrl(storageKey)
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl('')
  }

  const handlePhysicalPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingPhysicalPhoto(true)
    try {
      const storageKey = await uploadAvatar(file, profile.id)
      setPhysicalPhotoUrl(storageKey)
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploadingPhysicalPhoto(false)
    }
  }

  const handleRemovePhysicalPhoto = () => {
    setPhysicalPhotoUrl('')
  }

  const isPlus = subscription?.plan === 'plus'
  const maxShowcase = isPlus ? 3 : 1

  const handleShowcaseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !profile) return

    const remainingSlots = maxShowcase - showcaseImages.length
    if (remainingSlots <= 0) {
      alert(`Free accounts can only feature 1 profile image. Upgrade to Case+ to add up to 3!`)
      return
    }

    const filesToUpload = files.slice(0, remainingSlots)

    setUploadingShowcase(true)
    try {
      const uploadedKeys: string[] = []
      for (const file of filesToUpload) {
        const storageKey = await uploadAvatar(file, profile.id)
        uploadedKeys.push(storageKey)
      }
      setShowcaseImages(prev => [...prev, ...uploadedKeys])
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploadingShowcase(false)
    }
  }

  const handleRemoveShowcase = (index: number) => {
    setShowcaseImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <div className={styles.page}><div className="spinner" style={{ margin: '100px auto' }} /></div>

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Settings</h1>

        {saved && <div className={styles.savedBanner}>✓ Saved</div>}

        {profile && (
          <div className={styles.handleInfo}>
            <span className={styles.handleLabel}>Your Case URL</span>
            <a href={`/@${profile.handle}`} target="_blank" className={styles.handleValue}>
              case.app/@{profile.handle}
            </a>
          </div>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>

          <div className={styles.avatarUploadField}>
            <label className="label">Profile photo</label>
            <div className={styles.avatarRow}>
              <div className={styles.avatarPreviewWrap}>
                {avatarUrl ? (
                  <img src={getMediaUrl(avatarUrl)} alt="Avatar" className={styles.avatarPreview} />
                ) : (
                  <div className={styles.avatarPreviewFallback}>
                    {displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className={styles.avatarUploadActions}>
                <input
                  type="file"
                  id="avatarFile"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="avatarFile" className="btn btn--outline btn--sm" style={{ cursor: 'pointer' }}>
                  {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
                </label>
                {avatarUrl && (
                  <button type="button" onClick={handleRemoveAvatar} className={styles.removeAvatarBtn}>
                    Remove
                  </button>
                )}
            </div>
          </div>
        </div>

        <div className={styles.showcaseField}>
            <label className="label">
              Showcase photos <span className={styles.optional}>({showcaseImages.length}/{maxShowcase})</span>
            </label>
            <p className={styles.hint} style={{ marginTop: 2, marginBottom: 8, fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Feature images of yourself or your workshop to show clients your physical impression.
            </p>
            <div className={styles.showcaseGrid}>
              {showcaseImages.map((imgKey, i) => (
                <div key={imgKey} className={styles.showcaseThumbWrap}>
                  <img src={getMediaUrl(imgKey)} alt="Showcase" className={styles.showcaseThumb} />
                  <button type="button" onClick={() => handleRemoveShowcase(i)} className={styles.removeShowcaseBtn} aria-label="Remove photo">
                    ✕
                  </button>
                </div>
              ))}
              {showcaseImages.length < maxShowcase && (
                <div className={styles.addShowcaseWrap}>
                  <input
                    type="file"
                    id="showcaseFile"
                    accept="image/*"
                    multiple={maxShowcase > 1}
                    onChange={handleShowcaseUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="showcaseFile" className={styles.addShowcaseLabel}>
                    {uploadingShowcase ? 'Uploading…' : '+ Add photo'}
                  </label>
                </div>
              )}
            </div>
            {!isPlus && (
              <p className={styles.premiumHint} style={{ marginTop: 8, fontSize: 12, color: 'var(--brass)', fontWeight: 500 }}>
                ⭐ Upgrade to Case+ to showcase up to 3 photos!
              </p>
            )}
          </div>

          <div className="field">
            <label className="label">Display name</label>
            <input type="text" className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Role / tagline line <span className={styles.optional}>(optional)</span></label>
            <input type="text" className="input" placeholder="Freelance hairstylist & braider · Nairobi" value={roleLine} onChange={e => setRoleLine(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Bio <span className={styles.optional}>(optional)</span></label>
            <textarea className="input textarea" placeholder="A short intro paragraph…" value={tagline} onChange={e => setTagline(e.target.value)} rows={3} />
          </div>
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <label className="label">Your claim <span className={styles.optional}>(optional)</span></label>
              <span className={`${styles.charCounter} ${claimText.length > 450 ? styles.charCounterWarn : ''}`}>
                {claimText.length}/500
              </span>
            </div>
            <textarea
              className="input textarea"
              placeholder="I've been doing natural hair care in Nairobi for 5 years. I specialise in protective styles that actually protect. Everything below proves it."
              value={claimText}
              onChange={e => setClaimText(e.target.value.slice(0, 500))}
              rows={4}
            />
            <p className={styles.hint} style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-soft)' }}>
              In your own words — what do you want people to know about you, and believe? All your proof below backs this up.
            </p>
          </div>
          <div className="field">
            <label className="label">Category <span className={styles.optional}>(for Case Search)</span></label>
            <input type="text" className="input" placeholder="hairstylist · electrician · nurse" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Location area</label>
            <input type="text" className="input" placeholder="Westlands, Nairobi" value={locationArea} onChange={e => setLocationArea(e.target.value)} />
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
              💡 Use your neighbourhood or area — not your home address. This is publicly visible.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Physical Attributes <span className={styles.optional}>(Optional)</span></h2>
          <p className={styles.hint} style={{ marginTop: 2, marginBottom: 12, fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Mainly for roles where physical representation is relevant.
          </p>

          <div className="field">
            <label className="label">Height</label>
            <input type="text" className="input" placeholder="e.g. 5'11 / 180cm" value={height} onChange={e => setHeight(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Build</label>
            <input type="text" className="input" placeholder="e.g. Athletic / Medium" value={build} onChange={e => setBuild(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Physical Bio / Appearance details</label>
            <textarea className="input textarea" placeholder="Add any details about hair, scars, tattoos, or other features of your choice…" value={physicalBio} onChange={e => setPhysicalBio(e.target.value)} rows={3} />
          </div>

          <div className={styles.avatarUploadField} style={{ marginTop: 16 }}>
            <label className="label">Appearance photo <span className={styles.optional}>(1 photo max)</span></label>
            <div className={styles.avatarRow}>
              <div className={styles.avatarPreviewWrap} style={{ borderRadius: 'var(--radius)' }}>
                {physicalPhotoUrl ? (
                  <img src={getMediaUrl(physicalPhotoUrl)} alt="Physical aspect" className={styles.avatarPreview} />
                ) : (
                  <span style={{ fontSize: 24 }}>👤</span>
                )}
              </div>
              <div className={styles.avatarUploadActions}>
                <input
                  type="file"
                  id="physicalPhotoFile"
                  accept="image/*"
                  onChange={handlePhysicalPhotoChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="physicalPhotoFile" className="btn btn--outline btn--sm" style={{ cursor: 'pointer' }}>
                  {uploadingPhysicalPhoto ? 'Uploading…' : 'Upload photo'}
                </label>
                {physicalPhotoUrl && (
                  <button type="button" onClick={handleRemovePhysicalPhoto} className={styles.removeAvatarBtn}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact &amp; Visibility</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16, lineHeight: 1.5 }}>
            Your Case is visible to anyone with your link. Choose carefully what contact information to include.
          </p>

          <div className={styles.publicInfoBox}>
            <span className={styles.publicInfoIcon}>⚠️</span>
            <div>
              <strong>Public information</strong><br />
              Everything on your public profile is visible to anyone who visits your link — including search engines.
            </div>
          </div>

          {profile?.socials?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--ink)' }}>Your social links</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {profile.socials.map((s: { platform: string; url: string }) => (
                  <span
                    key={s.platform}
                    style={{
                      fontSize: 12.5,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink-soft)',
                    }}
                  >
                    {s.platform}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 6 }}>
                Your social links are always shown when added — only add accounts you&apos;re comfortable being public.
              </p>
            </div>
          )}

          <Toggle
            id="cv_location"
            label="Show location area"
            desc="Shows your neighbourhood (e.g. Westlands, Nairobi). Never add a home address to the location field."
            checked={contactVisibility.location ?? true}
            onChange={v => setContactVisibility(prev => ({ ...prev, location: v }))}
          />
          <Toggle
            id="cv_whatsapp"
            label="Show WhatsApp link"
            desc="Lets visitors message you directly on WhatsApp."
            checked={contactVisibility.whatsapp ?? true}
            onChange={v => setContactVisibility(prev => ({ ...prev, whatsapp: v }))}
          />
          <Toggle
            id="cv_email"
            label="Show email address"
            desc="Your email address will be visible to anyone who visits your profile."
            checked={contactVisibility.email ?? true}
            onChange={v => setContactVisibility(prev => ({ ...prev, email: v }))}
          />
          <Toggle
            id="cv_phone"
            label="Show phone number"
            desc="Your phone number will be visible to anyone who visits your profile."
            checked={contactVisibility.phone ?? true}
            onChange={v => setContactVisibility(prev => ({ ...prev, phone: v }))}
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Privacy</h2>

          <Toggle
            id="is_public"
            label="Public profile"
            desc="When off, your Case URL shows a 'not found' page to visitors. Your data isn't deleted."
            checked={isPublic}
            onChange={setIsPublic}
          />

          <Toggle
            id="discoverable"
            label="Appear in Case Search"
            desc="When off, you won't appear in the Case Search directory. You can still share your link."
            checked={discoverable}
            onChange={setDiscoverable}
          />
        </section>

        <div className={styles.saveRow}>
          <button className="btn btn--dark" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        <section className={`${styles.section} ${styles.dangerSection}`}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.dangerActions}>
            <button className="btn btn--outline" onClick={handleSignOut}>
              Sign out
            </button>
            <Link href="/dashboard/billing" className="btn btn--outline">
              Manage billing →
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

function Toggle({ id, label, desc, checked, onChange }: {
  id: string; label: string; desc: string;
  checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className={styles.toggle}>
      <div className={styles.toggleText}>
        <label htmlFor={id} className={styles.toggleLabel}>{label}</label>
        <p className={styles.toggleDesc}>{desc}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        className={`${styles.toggleBtn} ${checked ? styles.toggleBtnOn : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  )
}
