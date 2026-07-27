'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../../nanny-dashboard.module.css'
import type { NannyClient, NannyWorker, NannyServiceType } from '@/lib/nanny-types'
import { createManualBookingAction } from './actions'

interface Props {
  orgId: string
  clients: NannyClient[]
  workers: NannyWorker[]
  serviceTypes: NannyServiceType[]
}

export default function NewBookingClient({ orgId, clients, workers, serviceTypes }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [isNewClient, setIsNewClient] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.set('org_id', orgId)
    formData.set('is_new_client', isNewClient ? 'true' : 'false')

    try {
      const res = await createManualBookingAction(formData)
      if (res.error) {
        setError(res.error)
      } else {
        router.push('/dashboard/agency/nanny/bookings')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 800 }}>
      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: 16, padding: 12, background: 'var(--danger-bg)', borderRadius: 'var(--radius)' }}>
          {error}
        </div>
      )}

      {/* Client Section */}
      <div className={styles.formSection}>
        <div className={styles.sectionHeader} style={{ marginBottom: 16 }}>
          <h2 className={styles.formSectionTitle} style={{ margin: 0 }}>Client Information</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" checked={!isNewClient} onChange={() => setIsNewClient(false)} />
              Existing Client
            </label>
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" checked={isNewClient} onChange={() => setIsNewClient(true)} />
              New Client
            </label>
          </div>
        </div>

        {isNewClient ? (
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Full Name *</label>
              <input name="new_client_name" className={styles.input} required={isNewClient} placeholder="e.g. John Doe" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email Address</label>
              <input name="new_client_email" type="email" className={styles.input} placeholder="john@example.com" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Phone Number</label>
              <input name="new_client_phone" className={styles.input} placeholder="+1 555-1234" />
            </div>
          </div>
        ) : (
          <div className={styles.field}>
            <label className={styles.label}>Select Client *</label>
            <select name="client_id" className={`${styles.input} ${styles.select}`} required={!isNewClient} defaultValue="">
              <option value="" disabled>-- Select a client --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.client_name} {c.client_email ? `(${c.client_email})` : ''}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Booking Details Section */}
      <div className={styles.formSection}>
        <h2 className={styles.formSectionTitle}>Booking Details</h2>
        
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Service Type *</label>
            <select name="service_type_id" className={`${styles.input} ${styles.select}`} required defaultValue="">
              <option value="" disabled>-- Select a service --</option>
              {serviceTypes.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Assigned Worker *</label>
            <select name="worker_id" className={`${styles.input} ${styles.select}`} required defaultValue="">
              <option value="" disabled>-- Select a worker --</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.profile?.display_name || w.shadow_name || 'Unknown Worker'}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Start Date & Time *</label>
            <input type="datetime-local" name="scheduled_start" className={styles.input} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>End Date & Time *</label>
            <input type="datetime-local" name="scheduled_end" className={styles.input} required />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Service Address *</label>
          <input name="service_address" className={styles.input} required placeholder="Full address of where the service took place" />
        </div>

        <div className={styles.field} style={{ maxWidth: '50%' }}>
          <label className={styles.label}>Amount Paid (Quoted Rate) *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 9, color: 'var(--ink-muted)' }}>$</span>
            <input name="quoted_rate" type="number" step="0.01" min="0" className={styles.input} style={{ paddingLeft: 24 }} required placeholder="0.00" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16 }}>
        <button
          type="button"
          onClick={() => router.push('/dashboard/agency/nanny/bookings')}
          className="btn btn--outline"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn--brass"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Log External Booking'}
        </button>
      </div>
    </form>
  )
}
