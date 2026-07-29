'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../../nanny-dashboard.module.css'

type Mode = 'shadow' | 'invite' | 'search'

const ROLE_OPTIONS = [
  { value: 'caregiver',        label: 'Elderly & Home Caregiver (Primary)' },
  { value: 'senior_caregiver', label: 'Senior Care Specialist' },
  { value: 'patient_care',     label: 'Patient & Recovery Caregiver' },
  { value: 'nanny',           label: 'Childcare Nanny' },
  { value: 'maternity_nurse', label: 'Maternity Nurse' },
  { value: 'cleaner',         label: 'Domestic Cleaner' },
  { value: 'live_in',         label: 'Live-in Carer' },
  { value: 'all',             label: 'Multi-Role Caregiver' },
]

export default function NewWorkerPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('shadow')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [inviteResult, setInviteResult] = useState<{ worker_id: string, claim_url: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const [form, setForm] = useState({
    shadow_name: '',
    shadow_email: '',
    shadow_phone: '',
    role_type: 'caregiver',
    hourly_rate: '',
    invite_handle: '',
  })

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (mode === 'search' && searchQuery.length > 2) {
      const fetchUsers = async () => {
        setSearching(true)
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
          const data = await res.json()
          if (data.users) setSearchResults(data.users)
        } catch (e) {
          console.error(e)
        } finally {
          setSearching(false)
        }
      }
      
      const timer = setTimeout(fetchUsers, 300)
      return () => clearTimeout(timer)
    } else {
      setSearchResults([])
    }
  }, [searchQuery, mode])

  const handleInviteUser = async (handle: string) => {
    set('invite_handle', handle)
    setMode('invite')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInviteResult(null)
    
    try {
      const body =
        mode === 'shadow'
          ? {
              mode: 'shadow',
              shadow_name: form.shadow_name,
              shadow_email: form.shadow_email,
              shadow_phone: form.shadow_phone,
              role_type: form.role_type,
              hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : undefined,
            }
          : {
              mode: 'invite',
              invite_handle: form.invite_handle,
              role_type: form.role_type,
            }

      const res = await fetch('/api/nanny/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to add worker')
      
      if (mode === 'invite' && json.claim_url) {
        setInviteResult({ worker_id: json.worker_id, claim_url: json.claim_url })
      } else {
        router.push(`/dashboard/agency/nanny/workers/${json.worker_id}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (inviteResult?.claim_url) {
      navigator.clipboard.writeText(inviteResult.claim_url)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ marginBottom: 32 }}>
        <a
          href="/dashboard/agency/nanny/workers"
          style={{ fontSize: 13, color: 'var(--ink-muted)', textDecoration: 'none' }}
        >
          ← Back to Workers
        </a>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--ink)',
            marginTop: 16,
          }}
        >
          Add Worker
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginTop: 4 }}>
          Add a worker directly (shadow), search users, or send an invitation link.
        </p>
      </div>

      <div className={styles.tabs} style={{ marginBottom: 28 }}>
        {(['shadow', 'search', 'invite'] as Mode[]).map((m) => (
          <button
            key={m}
            className={`${styles.tab} ${mode === m ? styles.tabActive : ''}`}
            onClick={() => { setMode(m); setInviteResult(null); }}
            type="button"
          >
            {m === 'shadow' ? '👤 Shadow Worker' : m === 'search' ? '🔍 Search Users' : '✉ Invite via Link'}
          </button>
        ))}
      </div>
      
      {mode === 'search' ? (
        <div className={styles.formSection} style={{ margin: 0 }}>
          <div className={styles.field}>
            <label className={styles.label}>Search Users by Username (Handle)</label>
            <input
              type="text"
              className={styles.input}
              value={searchQuery}
              placeholder="e.g. sarahkamau"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div style={{ marginTop: 16 }}>
            {searching && <p style={{ color: 'var(--ink-muted)' }}>Searching...</p>}
            {searchResults.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, border: '1px solid var(--border)', borderRadius: 6 }}>
                {searchResults.map((u) => (
                  <li key={u.id} style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ display: 'block' }}>{u.full_name || 'No Name'}</strong>
                      <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>@{u.handle}</span>
                    </div>
                    <button 
                      className="btn btn--outline" 
                      onClick={() => handleInviteUser(u.handle)}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                    >
                      Invite
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              searchQuery.length > 2 && !searching && <p style={{ color: 'var(--ink-muted)' }}>No users found.</p>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className={styles.formSection} style={{ margin: 0 }}>
            {error && (
              <div className={`${styles.notice} ${styles.noticeDanger}`}>
                ⚠ {error}
              </div>
            )}

            {inviteResult ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <h3 style={{ marginBottom: 12, color: 'var(--ink)' }}>Invitation Link Ready!</h3>
                <p style={{ marginBottom: 16, color: 'var(--ink-muted)' }}>
                  Share this link with <strong>@{form.invite_handle}</strong> so they can claim their profile.
                </p>
                
                <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 16, wordBreak: 'break-all', fontSize: 13 }}>
                  {inviteResult.claim_url}
                </div>
                
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button type="button" className="btn btn--outline" onClick={handleCopyLink}>
                    Copy Link
                  </button>
                  <button 
                    type="button" 
                    className="btn btn--dark" 
                    onClick={() => router.push(`/dashboard/agency/nanny/workers/${inviteResult.worker_id}`)}
                  >
                    View Worker Profile
                  </button>
                </div>
              </div>
            ) : mode === 'shadow' ? (
              <>
                <div
                  className={`${styles.notice} ${styles.noticeWarning}`}
                  style={{ marginBottom: 20 }}
                >
                  💡 A shadow worker is added by you on their behalf. They can
                  claim their profile later using an invite link.
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Full Name *</label>
                  <input
                    className={styles.input}
                    value={form.shadow_name}
                    placeholder="Sarah Kamau"
                    onChange={(e) => set('shadow_name', e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Email</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={form.shadow_email}
                      placeholder="sarah@example.com"
                      onChange={(e) => set('shadow_email', e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Phone</label>
                    <input
                      type="tel"
                      className={styles.input}
                      value={form.shadow_phone}
                      placeholder="+254 700 000000"
                      onChange={(e) => set('shadow_phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Role *</label>
                    <select
                      className={`${styles.input} ${styles.select}`}
                      value={form.role_type}
                      onChange={(e) => set('role_type', e.target.value)}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Hourly Rate (KES)</label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      className={styles.input}
                      value={form.hourly_rate}
                      placeholder="e.g. 500"
                      onChange={(e) => set('hourly_rate', e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  className={`${styles.notice} ${styles.noticeVerified}`}
                  style={{ marginBottom: 20 }}
                >
                  📨 We'll generate an invitation link for them to create
                  their Case profile and join your agency. Share it with them manually.
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Worker's Username (Handle) *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={form.invite_handle}
                    placeholder="e.g. sarahkamau"
                    onChange={(e) => set('invite_handle', e.target.value)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Role *</label>
                  <select
                    className={`${styles.input} ${styles.select}`}
                    value={form.role_type}
                    onChange={(e) => set('role_type', e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {!inviteResult && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <a
                  href="/dashboard/agency/nanny/workers"
                  className="btn btn--outline"
                >
                  Cancel
                </a>
                <button
                  type="submit"
                  className="btn btn--dark"
                  disabled={loading}
                >
                  {loading
                    ? 'Adding…'
                    : mode === 'shadow'
                    ? 'Add Shadow Worker'
                    : 'Generate Invite Link'}
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
