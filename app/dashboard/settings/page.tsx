'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadAvatar, getMediaUrl } from '@/lib/r2'
import Link from 'next/link'
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
  const [isPublic, setIsPublic]       = useState(true)
  const [discoverable, setDiscoverable] = useState(true)

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
        setIsPublic(data.is_public)
        setDiscoverable(data.discoverable)

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
      is_public:     isPublic,
      discoverable,
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
            <label className="label">Category <span className={styles.optional}>(for Case Search)</span></label>
            <input type="text" className="input" placeholder="hairstylist · electrician · nurse" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Location area</label>
            <input type="text" className="input" placeholder="Westlands, Nairobi" value={locationArea} onChange={e => setLocationArea(e.target.value)} />
          </div>
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
