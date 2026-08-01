'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import styles from '@/app/dashboard/agency/nanny/nanny-dashboard.module.css'
import type { NannyWorker } from '@/lib/nanny-types'

const STEPS = [
  { id: 1, name: 'Service' },
  { id: 2, name: 'Schedule' },
  { id: 3, name: 'Contact' },
  { id: 4, name: 'Confirm' },
]

export interface BookingFormData {
  service_code: string
  service_name: string
  date: string
  start_time: string
  end_time: string
  address: string
  notes: string
  client_name: string
  client_email: string
  client_phone: string
}

interface ServiceType {
  id: string
  code: string
  name: string
  description: string | null
  pricing_model: string
  duration_unit: string
  base_rate: number | null
  min_hours: number | null
}

interface BookingWizardProps {
  services: ServiceType[]
  workers?: NannyWorker[]
  orgSlug: string
  orgName: string
}

const SERVICE_ICONS: Record<string, string> = {
  elderly:   '🩺',
  patient:   '🏥',
  dementia:  '🧠',
  companion: '🤝',
  caregiving:'❤️',
  nanny:     '👶',
  maternity: '🤱',
  live_in:   '🏠',
  cleaning:  '🧹',
  deep_clean:'✨',
  default:   '🌿',
}

function getIcon(code: string) {
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (code.includes(key)) return icon
  }
  return SERVICE_ICONS.default
}

function formatRate(svc: ServiceType) {
  if (!svc.base_rate) return 'Quoted on request'
  const unit = svc.pricing_model === 'hourly' ? '/hr' : ` / ${svc.duration_unit}`
  return `KES ${svc.base_rate.toLocaleString()}${unit}`
}

export default function BookingWizard({
  services,
  workers = [],
  orgSlug,
  orgName,
}: BookingWizardProps) {
  const searchParams = useSearchParams()
  const worker_id = searchParams.get('worker_id')
  const selectedWorker = worker_id ? workers.find((w) => w.id === worker_id) : null

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [minDate, setMinDate] = useState('2020-01-01')

  // Compute the real minimum date only on the client to avoid server/client hydration mismatch
  useEffect(() => {
    setMinDate(new Date().toISOString().split('T')[0])
  }, [])
  const [result, setResult] = useState<{
    reference: string
    token: string | null
  } | null>(null)

  const [form, setForm] = useState<BookingFormData>({
    service_code: '',
    service_name: '',
    date: '',
    start_time: '',
    end_time: '',
    address: '',
    notes: '',
    client_name: '',
    client_email: '',
    client_phone: '',
  })

  const set = (k: keyof BookingFormData, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const next = () => setStep((s) => s + 1)
  const back = () => setStep((s) => s - 1)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const start = `${form.date}T${form.start_time}:00`
      const end   = `${form.date}T${form.end_time}:00`

      const res = await fetch('/api/nanny/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_slug: orgSlug,
          client_name: form.client_name,
          client_email: form.client_email,
          client_phone: form.client_phone,
          service_code: form.service_code,
          start,
          end_time: end,
          address: form.address,
          notes: form.notes,
          worker_id,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Booking failed')
      setResult({ reference: json.reference, token: json.anon_token })
      setStep(5)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Render step content ────────────────────────────────
  return (
    <div className={styles.wizardWrap}>
      {/* Progress bar */}
      {step < 5 && (
        <div className={styles.wizardProgress}>
          {STEPS.map((s) => (
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
      )}

      {/* ── Step 1: Service selection ── */}
      {step === 1 && (
        <div className={styles.wizardCard}>
          {selectedWorker && (
            <div
              style={{
                background: 'var(--paper-light)',
                padding: '16px 24px',
                borderBottom: '1px solid var(--line-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {selectedWorker.profile?.avatar_url ? (
                <img
                  src={selectedWorker.profile.avatar_url}
                  alt={selectedWorker.profile.display_name}
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                  }}
                >
                  {selectedWorker.profile?.display_name?.charAt(0)}
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Booking</div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  {selectedWorker.profile?.display_name}
                </div>
              </div>
            </div>
          )}
          <div className={styles.wizardCardHead}>
            <h2 className={styles.wizardCardTitle}>What service do you need?</h2>
            <p className={styles.wizardCardSub}>
              Choose from the services offered by {orgName}.
            </p>
          </div>
          <div className={styles.wizardCardBody}>
            {services.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔍</div>
                <p className={styles.emptyText}>
                  No services are currently available. Please contact the agency.
                </p>
              </div>
            ) : (
              services.map((svc) => (
                <div
                  key={svc.id}
                  className={`${styles.serviceOption} ${
                    form.service_code === svc.code
                      ? styles.serviceOptionSelected
                      : ''
                  }`}
                  onClick={() => {
                    set('service_code', svc.code)
                    set('service_name', svc.name)
                  }}
                  role="radio"
                  aria-checked={form.service_code === svc.code}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      set('service_code', svc.code)
                      set('service_name', svc.name)
                    }
                  }}
                >
                  <div className={styles.serviceOptionIcon}>
                    {getIcon(svc.code)}
                  </div>
                  <div>
                    <div className={styles.serviceOptionName}>{svc.name}</div>
                    {svc.description && (
                      <div className={styles.serviceOptionDesc}>
                        {svc.description}
                      </div>
                    )}
                    <div className={styles.serviceOptionRate}>
                      {formatRate(svc)}
                      {svc.min_hours && ` · min ${svc.min_hours}h`}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: '2px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                          form.service_code === svc.code
                            ? 'var(--ink)'
                            : 'transparent',
                        borderColor:
                          form.service_code === svc.code
                            ? 'var(--ink)'
                            : 'var(--line)',
                      }}
                    >
                      {form.service_code === svc.code && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--paper)',
                          }}
                        />
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className={styles.wizardCardFoot}>
            <span />
            <button
              className="btn btn--dark"
              disabled={!form.service_code}
              onClick={next}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Schedule ── */}
      {step === 2 && (
        <div className={styles.wizardCard}>
          <div className={styles.wizardCardHead}>
            <h2 className={styles.wizardCardTitle}>When do you need us?</h2>
            <p className={styles.wizardCardSub}>
              Pick a date and time window for your{' '}
              <strong>{form.service_name}</strong> booking.
            </p>
          </div>
          <div className={styles.wizardCardBody}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="date">
                Date *
              </label>
              <input
                id="date"
                type="date"
                className={styles.input}
                value={form.date}
                min={minDate}
                onChange={(e) => set('date', e.target.value)}
                required
              />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="start">
                  Start Time *
                </label>
                <input
                  id="start"
                  type="time"
                  className={styles.input}
                  value={form.start_time}
                  onChange={(e) => set('start_time', e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="end">
                  End Time *
                </label>
                <input
                  id="end"
                  type="time"
                  className={styles.input}
                  value={form.end_time}
                  onChange={(e) => set('end_time', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="address">
                Service Address *
              </label>
              <input
                id="address"
                className={styles.input}
                value={form.address}
                placeholder="Full address where service will take place"
                onChange={(e) => set('address', e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="notes">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                className={`${styles.input} ${styles.textarea}`}
                value={form.notes}
                placeholder="Special instructions, access codes, pet info…"
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.wizardCardFoot}>
            <button className="btn btn--outline" onClick={back}>
              ← Back
            </button>
            <button
              className="btn btn--dark"
              disabled={!form.date || !form.start_time || !form.end_time || !form.address}
              onClick={next}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Contact ── */}
      {step === 3 && (
        <div className={styles.wizardCard}>
          <div className={styles.wizardCardHead}>
            <h2 className={styles.wizardCardTitle}>Your contact details</h2>
            <p className={styles.wizardCardSub}>
              No account needed. We'll send your booking confirmation to your email.
            </p>
          </div>
          <div className={styles.wizardCardBody}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cname">
                Full Name *
              </label>
              <input
                id="cname"
                className={styles.input}
                value={form.client_name}
                placeholder="Jane Mwangi"
                onChange={(e) => set('client_name', e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cemail">
                Email *
              </label>
              <input
                id="cemail"
                type="email"
                className={styles.input}
                value={form.client_email}
                placeholder="jane@example.com"
                onChange={(e) => set('client_email', e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="cphone">
                Phone Number *
              </label>
              <input
                id="cphone"
                type="tel"
                className={styles.input}
                value={form.client_phone}
                placeholder="+254 700 123456"
                onChange={(e) => set('client_phone', e.target.value)}
                required
              />
            </div>
          </div>
          <div className={styles.wizardCardFoot}>
            <button className="btn btn--outline" onClick={back}>
              ← Back
            </button>
            <button
              className="btn btn--dark"
              disabled={
                !form.client_name || !form.client_email || !form.client_phone
              }
              onClick={next}
            >
              Review Booking →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Confirm ── */}
      {step === 4 && (
        <div className={styles.wizardCard}>
          <div className={styles.wizardCardHead}>
            <h2 className={styles.wizardCardTitle}>Review your booking</h2>
            <p className={styles.wizardCardSub}>
              Please check the details before confirming.
            </p>
          </div>
          <div className={styles.wizardCardBody}>
            {error && (
              <div className={`${styles.notice} ${styles.noticeDanger}`}>
                ⚠ {error}
              </div>
            )}
            <div
              style={{
                background: 'var(--paper-light)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
              }}
            >
              {[
                { label: 'Service', value: form.service_name },
                {
                  label: 'Date',
                  value: new Date(form.date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }),
                },
                {
                  label: 'Time',
                  value: `${form.start_time} – ${form.end_time}`,
                },
                { label: 'Address', value: form.address },
                { label: 'Name', value: form.client_name },
                { label: 'Email', value: form.client_email },
                { label: 'Phone', value: form.client_phone },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    gap: 12,
                    paddingBottom: 12,
                    marginBottom: 12,
                    borderBottom: '1px solid var(--line-soft)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--ink-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      minWidth: 72,
                      paddingTop: 2,
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                    {value}
                  </span>
                </div>
              ))}
              {form.notes && (
                <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                  <strong>Notes:</strong> {form.notes}
                </div>
              )}
            </div>

            <p
              style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 16 }}
            >
              By confirming, you agree to the agency's terms. A confirmation will
              be sent to <strong>{form.client_email}</strong>.
            </p>
          </div>
          <div className={styles.wizardCardFoot}>
            <button className="btn btn--outline" onClick={back}>
              ← Edit
            </button>
            <button
              className="btn btn--brass btn--lg"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Booking…' : 'Confirm Booking ✓'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Success ── */}
      {step === 5 && result && (
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
            <div style={{ fontSize: 56 }}>🎊</div>
            <h2 className={styles.wizardCardTitle}>Booking confirmed!</h2>
            <p style={{ fontSize: 15, color: 'var(--ink-muted)', maxWidth: 380 }}>
              Your booking reference is{' '}
              <strong
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ink)',
                }}
              >
                {result.reference}
              </strong>
              . A confirmation email has been sent to{' '}
              <strong>{form.client_email}</strong>.
            </p>
            {result.token && (
              <a
                href={`/booking/${result.token}`}
                className="btn btn--outline btn--lg"
              >
                Track your booking →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
