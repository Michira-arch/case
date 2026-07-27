'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../../nanny-dashboard.module.css'

type Mode = 'shadow' | 'invite'

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

  const [form, setForm] = useState({
    shadow_name: '',
    shadow_email: '',
    shadow_phone: '',
    role_type: 'caregiver',
    hourly_rate: '',
    // Invite mode
    invite_email: '',
  })

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
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
              invite_email: form.invite_email,
              role_type: form.role_type,
            }

      const res = await fetch('/api/nanny/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to add worker')
      router.push(`/dashboard/agency/nanny/workers/${json.worker_id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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
          Add a worker directly (shadow) or send them an invitation link.
        </p>
      </div>

      {/* Mode toggle */}
      <div className={styles.tabs} style={{ marginBottom: 28 }}>
        {(['shadow', 'invite'] as Mode[]).map((m) => (
          <button
            key={m}
            className={`${styles.tab} ${mode === m ? styles.tabActive : ''}`}
            onClick={() => setMode(m)}
            type="button"
          >
            {m === 'shadow' ? '👤 Shadow Worker' : '✉ Send Invite'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formSection} style={{ margin: 0 }}>
          {error && (
            <div className={`${styles.notice} ${styles.noticeDanger}`}>
              ⚠ {error}
            </div>
          )}

          {mode === 'shadow' ? (
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
                📨 We'll send an invitation email with a link for them to create
                their Case profile and join your agency.
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Worker's Email *</label>
                <input
                  type="email"
                  className={styles.input}
                  value={form.invite_email}
                  placeholder="worker@example.com"
                  onChange={(e) => set('invite_email', e.target.value)}
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
                : 'Send Invitation'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
