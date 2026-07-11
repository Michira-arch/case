'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
        setIsPublic(data.is_public)
        setDiscoverable(data.discoverable)
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
      is_public:     isPublic,
      discoverable,
    }).eq('id', profile.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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
