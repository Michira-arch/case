'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../../nanny-dashboard.module.css'

interface CredentialActionsProps {
  credentialId: string
}

export default function CredentialActions({ credentialId }: CredentialActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setLoading(decision === 'approved' ? 'approve' : 'reject')
    setError(null)
    try {
      const res = await fetch('/api/nanny/credential/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential_id: credentialId,
          decision,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to update credential')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {error && (
        <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 4 }}>{error}</div>
      )}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          className="btn btn--sm"
          disabled={loading !== null}
          onClick={() => handleDecision('approved')}
          style={{
            background: 'var(--verified-bg)',
            color: 'var(--verified)',
            border: '1px solid var(--verified)',
          }}
        >
          {loading === 'approve' ? '…' : 'Approve'}
        </button>
        <button
          type="button"
          className="btn btn--sm"
          disabled={loading !== null}
          onClick={() => handleDecision('rejected')}
          style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
          }}
        >
          {loading === 'reject' ? '…' : 'Reject'}
        </button>
      </div>
    </div>
  )
}
