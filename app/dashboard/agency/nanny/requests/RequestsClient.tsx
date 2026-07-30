'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../nanny-dashboard.module.css'

interface Profile {
  id: string
  full_name?: string
  display_name?: string
  email?: string
  avatar_url?: string
}

interface JoinRequest {
  id: string
  org_id: string
  profile_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  profiles?: Profile
}

interface Props {
  requests: JoinRequest[]
}

export default function RequestsClient({ requests }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const router = useRouter()

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    setLoadingId(requestId)
    try {
      const res = await fetch('/api/agency/approve-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to process request')
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingId(null)
    }
  }

  const filtered = requests.filter(r => tab === 'all' || r.status === tab)

  return (
    <>
      <div className={styles.tabs} style={{ marginBottom: 20 }}>
        {['pending', 'approved', 'rejected', 'all'].map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t as any)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📩</div>
          <div className={styles.emptyTitle}>No requests found</div>
          <p className={styles.emptyText}>There are no {tab === 'all' ? '' : tab} join requests.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(req => {
            const name = req.profiles?.full_name || req.profiles?.display_name || 'Unknown User'
            const email = req.profiles?.email || 'No email provided'
            
            return (
              <div
                key={req.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {req.profiles?.avatar_url ? (
                    <img
                      src={req.profiles.avatar_url}
                      alt={name}
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', background: 'var(--paper-light)' }}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      👤
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{name}</h3>
                    <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: 13 }}>{email}</p>
                    <p suppressHydrationWarning style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-lighter)' }}>
                      Requested on {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {req.status === 'pending' ? (
                    <>
                      <button
                        className="btn btn--outline"
                        disabled={loadingId === req.id}
                        onClick={() => handleAction(req.id, 'reject')}
                        style={{ padding: '6px 12px', fontSize: 13, borderColor: '#f87171', color: '#991b1b' }}
                      >
                        {loadingId === req.id ? '...' : 'Reject'}
                      </button>
                      <button
                        className="btn btn--dark"
                        disabled={loadingId === req.id}
                        onClick={() => handleAction(req.id, 'approve')}
                        style={{ padding: '6px 12px', fontSize: 13 }}
                      >
                        {loadingId === req.id ? '...' : 'Approve'}
                      </button>
                    </>
                  ) : (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 12,
                        fontWeight: 500,
                        background: req.status === 'approved' ? 'var(--verified-bg)' : '#fee2e2',
                        color: req.status === 'approved' ? 'var(--verified)' : '#991b1b',
                        border: `1px solid ${req.status === 'approved' ? 'var(--verified)' : '#f87171'}`
                      }}
                    >
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
