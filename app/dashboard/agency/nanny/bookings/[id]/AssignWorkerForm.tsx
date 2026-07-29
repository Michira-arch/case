'use client'

import { useState } from 'react'
import styles from '../../nanny-dashboard.module.css'
import { assignWorkerWithCustomPricing } from './actions'

export default function AssignWorkerForm({ bookingId, workers, defaultRate }: { bookingId: string, workers: any[], defaultRate: number }) {
  const [customPricingState, setCustomPricingState] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await assignWorkerWithCustomPricing(formData)
      if (res?.error) setError(res.error)
    } catch (err: any) {
      setError(err.message || 'Error assigning worker')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.section} style={{ marginTop: '24px' }}>
      <h2 className={styles.sectionTitle}>Worker Pool (Manual Assignment)</h2>
      {error && <div style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {workers.map((worker: any) => {
          const isCustom = customPricingState[worker.id] || false
          return (
            <form key={worker.id} onSubmit={onSubmit} style={{ background: 'var(--card)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="hidden" name="booking_id" value={bookingId} />
              <input type="hidden" name="worker_id" value={worker.id} />
              <input type="hidden" name="custom_pricing" value={isCustom ? 'true' : 'false'} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>
                    {worker.profile?.avatar_url ? <img src={worker.profile.avatar_url} style={{width:'100%', height:'100%', objectFit: 'cover'}} alt="" /> : '👤'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>
                      {worker.profile?.display_name || worker.shadow_name || 'Worker'}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--ink-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                      ⭐ {worker.avg_rating || 'New'}
                    </div>
                  </div>
                </div>
                <button disabled={isSubmitting} className="btn btn--sm btn--outline">Assign</button>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={isCustom} 
                    onChange={(e) => setCustomPricingState(prev => ({ ...prev, [worker.id]: e.target.checked }))} 
                  />
                  Use Custom Booking Pricing
                </label>
              </div>

              {isCustom && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--paper-light)', padding: 12, borderRadius: 8 }}>
                  <div>
                    <label className={styles.label}>Pricing Model</label>
                    <select name="pricing_model" className={`${styles.input} ${styles.select}`} defaultValue="hourly">
                      <option value="hourly">Hourly</option>
                      <option value="fixed">Fixed</option>
                      <option value="recurring_monthly">Recurring Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className={styles.label}>Unit Rate ($)</label>
                    <input type="number" step="0.01" name="unit_rate" className={styles.input} defaultValue={worker.hourly_rate || defaultRate} />
                  </div>
                  <div>
                    <label className={styles.label}>Agency Commission (%)</label>
                    <input type="number" step="1" name="agency_commission_pct" className={styles.input} defaultValue={10} placeholder="e.g. 15" />
                  </div>
                  
                  <details style={{ fontSize: 13 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--ink-soft)' }}>Advanced Settings</summary>
                    <div style={{ marginTop: 8 }}>
                      <label className={styles.label}>Flat Placement Fee ($)</label>
                      <input type="number" step="0.01" name="flat_placement_fee" className={styles.input} placeholder="0.00" />
                    </div>
                  </details>
                </div>
              )}
              
              {!isCustom && (
                <input type="hidden" name="rate" value={worker.hourly_rate || defaultRate} />
              )}
            </form>
          )
        })}
        {workers.length === 0 && (
          <div style={{ color: 'var(--ink-muted)', fontSize: 14 }}>No active workers found in the pool.</div>
        )}
      </div>
    </div>
  )
}
