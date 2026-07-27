'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../../nanny-dashboard.module.css'
import type { WorkerState } from '@/lib/nanny-types'

const STATES: { key: WorkerState; label: string; color: string }[] = [
  { key: 'applicant', label: 'Applicant', color: 'var(--aim)' },
  { key: 'vetted',    label: 'Vetted',    color: 'var(--brass)' },
  { key: 'active',    label: 'Active',    color: 'var(--verified)' },
  { key: 'on_break',  label: 'On Break',  color: 'var(--ink-muted)' },
  { key: 'suspended', label: 'Suspended', color: 'var(--danger)' },
  { key: 'inactive',  label: 'Inactive',  color: 'var(--ink-muted)' },
]

interface Props {
  workerId: string
  currentState: WorkerState
}

export default function WorkerStateControl({ workerId, currentState }: Props) {
  const router = useRouter()
  const [state, setState] = useState<WorkerState>(currentState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (newState: WorkerState) => {
    if (newState === state) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/nanny/workers/${workerId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to update state')
      setState(newState)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const current = STATES.find((s) => s.key === state)

  return (
    <div
      className={styles.formSection}
      style={{ margin: 0, padding: '20px', minWidth: 180 }}
    >
      <div className={styles.formSectionTitle} style={{ fontSize: 14, marginBottom: 12 }}>
        Worker State
      </div>
      {error && (
        <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STATES.map((s) => (
          <button
            key={s.key}
            disabled={loading}
            onClick={() => handleChange(s.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              border: '1.5px solid',
              borderColor: state === s.key ? s.color : 'var(--line)',
              borderRadius: 'var(--radius)',
              background:
                state === s.key ? `${s.color}15` : 'transparent',
              color: state === s.key ? s.color : 'var(--ink-muted)',
              fontWeight: state === s.key ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              textAlign: 'left',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: state === s.key ? s.color : 'var(--line)',
                flexShrink: 0,
              }}
            />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
