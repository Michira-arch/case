'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../nanny-dashboard.module.css'

const STEPS = [
  { id: 1, name: 'Details' },
  { id: 2, name: 'Policy' },
  { id: 3, name: 'Done' },
]

interface FormData {
  name: string
  slug: string
  vertical: 'nanny' | 'cleaning' | 'both'
  tagline: string
  description: string
  contact_email: string
  contact_phone: string
  location_area: string
  matching_mode: 'shortlist' | 'auto_assign'
  platform_commission_pct: number
  auto_invoice: boolean
  require_timelog: boolean
  payout_cadence: 'daily' | 'weekly' | 'monthly'
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function NewAgencyPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    name: '',
    slug: '',
    vertical: 'nanny',
    tagline: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    location_area: '',
    matching_mode: 'shortlist',
    platform_commission_pct: 10,
    auto_invoice: true,
    require_timelog: true,
    payout_cadence: 'weekly',
  })

  const set = (k: keyof FormData, v: any) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  // Step 1 submit → step 2
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.slug) {
      setError('Agency name and slug are required.')
      return
    }
    setError(null)
    setStep(2)
  }

  // Step 2 submit → create org via API
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nanny/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create agency')
      setCreatedSlug(json.slug)
      setStep(3)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wizardWrap}>
      {/* Progress */}
      <div className={styles.wizardProgress}>
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`${styles.wizardStep} ${step > s.id ? styles.wizardStepDone : ''}`}
          >
            <div
              className={`${styles.wizardStepDot} ${
                step === s.id
                  ? styles.wizardStepDotActive
                  : step > s.id
                  ? styles.wizardStepDotDone
                  : ''
              }`}
            >
              {step > s.id ? '✓' : s.id}
            </div>
            <span
              className={`${styles.wizardStepName} ${
                step === s.id ? styles.wizardStepNameActive : ''
              }`}
            >
              {s.name}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Identity ── */}
      {step === 1 && (
        <div className={styles.wizardCard}>
          <div className={styles.wizardCardHead}>
            <h1 className={styles.wizardCardTitle}>Create your agency</h1>
            <p className={styles.wizardCardSub}>
              Set up your caregiving agency profile. You can change these details later.
            </p>
          </div>
          <form onSubmit={handleStep1}>
            <div className={styles.wizardCardBody}>
              {error && (
                <div className={`${styles.notice} ${styles.noticeDanger}`}>
                  ⚠ {error}
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="name">
                  Agency Name *
                </label>
                <input
                  id="name"
                  className={styles.input}
                  value={form.name}
                  placeholder="e.g. Sunrise Care Agency"
                  onChange={(e) => {
                    set('name', e.target.value)
                    if (!form.slug || form.slug === slugify(form.name)) {
                      set('slug', slugify(e.target.value))
                    }
                  }}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="slug">
                  Public URL Slug *
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 13,
                      color: 'var(--ink-muted)',
                      fontFamily: 'var(--font-mono)',
                      pointerEvents: 'none',
                    }}
                  >
                    case.app/agency/
                  </span>
                  <input
                    id="slug"
                    className={styles.input}
                    value={form.slug}
                    style={{ paddingLeft: 126 }}
                    placeholder="sunrise-care"
                    onChange={(e) => set('slug', slugify(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="vertical">
                  Service Vertical *
                </label>
                <select
                  id="vertical"
                  className={`${styles.input} ${styles.select}`}
                  value={form.vertical}
                  onChange={(e) => set('vertical', e.target.value)}
                >
                  <option value="nanny">Nanny / Childcare</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="tagline">
                  Tagline
                </label>
                <input
                  id="tagline"
                  className={styles.input}
                  value={form.tagline}
                  placeholder="Trusted care for every family"
                  onChange={(e) => set('tagline', e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">Contact Email</label>
                  <input
                    id="email"
                    type="email"
                    className={styles.input}
                    value={form.contact_email}
                    placeholder="hello@agency.com"
                    onChange={(e) => set('contact_email', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="phone">Contact Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    className={styles.input}
                    value={form.contact_phone}
                    placeholder="+254 700 000000"
                    onChange={(e) => set('contact_phone', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="location">Location / Area</label>
                <input
                  id="location"
                  className={styles.input}
                  value={form.location_area}
                  placeholder="e.g. Nairobi, Kenya"
                  onChange={(e) => set('location_area', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.wizardCardFoot}>
              <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                Step 1 of 2
              </span>
              <button type="submit" className="btn btn--dark">
                Next: Policy →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 2: Policy ── */}
      {step === 2 && (
        <div className={styles.wizardCard}>
          <div className={styles.wizardCardHead}>
            <h1 className={styles.wizardCardTitle}>Agency Policy</h1>
            <p className={styles.wizardCardSub}>
              Configure your matching and billing preferences. These can be changed in Settings later.
            </p>
          </div>
          <form onSubmit={handleStep2}>
            <div className={styles.wizardCardBody}>
              {error && (
                <div className={`${styles.notice} ${styles.noticeDanger}`}>
                  ⚠ {error}
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>Matching Mode</label>
                {(['shortlist', 'auto_assign'] as const).map((m) => (
                  <label
                    key={m}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      marginBottom: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="matching_mode"
                      value={m}
                      checked={form.matching_mode === m}
                      onChange={() => set('matching_mode', m)}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {m === 'shortlist' ? 'Shortlist' : 'Auto-assign'}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                        {m === 'shortlist'
                          ? 'You pick a worker from a list for each booking.'
                          : 'System automatically assigns the best-fit worker.'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="commission">
                    Platform Commission (%)
                  </label>
                  <input
                    id="commission"
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    className={styles.input}
                    value={form.platform_commission_pct}
                    onChange={(e) =>
                      set('platform_commission_pct', parseFloat(e.target.value))
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="payout">
                    Payout Cadence
                  </label>
                  <select
                    id="payout"
                    className={`${styles.input} ${styles.select}`}
                    value={form.payout_cadence}
                    onChange={(e) => set('payout_cadence', e.target.value)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {[
                {
                  key: 'auto_invoice' as const,
                  label: 'Auto-generate invoices',
                  sub: 'Create invoice automatically when assignment is completed.',
                },
                {
                  key: 'require_timelog' as const,
                  label: 'Require time logging',
                  sub: 'Workers must clock in/out for each assignment.',
                },
              ].map(({ key, label, sub }) => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    marginBottom: 14,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                      {sub}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className={styles.wizardCardFoot}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn btn--dark"
                disabled={loading}
              >
                {loading ? 'Creating…' : 'Create Agency →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 3 && (
        <div className={styles.wizardCard}>
          <div
            style={{
              padding: '48px 32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <div style={{ fontSize: 56 }}>🎉</div>
            <h1 className={styles.wizardCardTitle}>Agency created!</h1>
            <p style={{ fontSize: 15, color: 'var(--ink-muted)', maxWidth: 380 }}>
              Your agency is live. Add your first workers, configure services, and
              start taking bookings.
            </p>
            <div
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
            >
              <button
                className="btn btn--dark btn--lg"
                onClick={() => router.push('/dashboard/agency/nanny')}
              >
                Go to Dashboard →
              </button>
              {createdSlug && (
                <a
                  href={`/agency/${createdSlug}/nanny`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--outline btn--lg"
                >
                  View Public Page ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
