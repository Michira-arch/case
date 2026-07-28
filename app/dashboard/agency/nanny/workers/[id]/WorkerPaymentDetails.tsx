'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../../nanny-dashboard.module.css'

interface Props {
  workerId: string
  currentDetails: string | null
}

export default function WorkerPaymentDetails({ workerId, currentDetails }: Props) {
  const router = useRouter()
  const [details, setDetails] = useState(currentDetails || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/nanny/worker/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: workerId, payment_details: details }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to update payment details')
      setSuccess(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={styles.formSection}
      style={{ margin: 0, padding: '20px', minWidth: 250, flex: '1 1 300px' }}
    >
      <div className={styles.formSectionTitle} style={{ fontSize: 14, marginBottom: 12 }}>
        Payment Details (M-Pesa/Bank)
      </div>
      {error && (
        <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ fontSize: 12, color: 'var(--verified)', marginBottom: 8 }}>
          Saved successfully.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="e.g. M-Pesa: 0712345678, Name: John Doe"
          className={styles.input}
          style={{ minHeight: 80, resize: 'vertical' }}
        />
        <button
          onClick={handleSave}
          disabled={loading || details === currentDetails}
          className="btn btn--dark"
          style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: 13 }}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
