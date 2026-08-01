'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../nanny-dashboard.module.css'

export default function CopilotClient({ org, initialInbox }: { org: any, initialInbox: any[] }) {
  const router = useRouter()
  const [inbox, setInbox] = useState(initialInbox)
  const [loading, setLoading] = useState(false)
  const [pushStatus, setPushStatus] = useState<string>('')

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    // Optimistic update
    setInbox(prev => prev.filter(item => item.id !== id))

    // Server call
    try {
      const res = await fetch(`/api/nanny/action-inbox/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Action failed')
        router.refresh() // restore the item from the server
        return
      }
      router.refresh()
    } catch (e) {
      console.error(e)
      router.refresh()
    }
  }


  const enablePush = async () => {
    try {
      setPushStatus('Requesting...')
      const registration = await navigator.serviceWorker.register('/sw.js')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushStatus('Permission denied.')
        return
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setPushStatus('Push notifications are not configured (Missing VAPID key).')
        return
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      })

      await fetch('/api/webhooks/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: org.id,
          subscription
        })
      })
      setPushStatus('Subscribed successfully!')
    } catch (e: any) {
      console.error(e)
      setPushStatus('Failed to subscribe: ' + e.message)
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>✨ AI Copilot</h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>Manage AI actions, set cron jobs, and chat with your agency assistant.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={enablePush} className="btn btn--outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             🔔 Enable Push Notifications
          </button>
          <Link href="/dashboard/agency/nanny/copilot/cron" className="btn btn--dark" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             ⏱️ Manage AI Cron Jobs
          </Link>
        </div>
      </div>
      {pushStatus && <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--aim)' }}>{pushStatus}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Action Inbox */}
        <div className={styles.formSection} style={{ border: '1px solid var(--aim)', background: 'rgba(56, 189, 248, 0.05)' }}>
          <div className={styles.formSectionTitle} style={{ color: 'var(--aim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📥</span> Action Inbox
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginBottom: 16 }}>
            Review tasks suggested by AI.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inbox.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-muted)', fontSize: 14 }}>
                No pending actions. You're all caught up!
              </div>
            ) : (
              inbox.map(item => (
                <div key={item.id} style={{ background: 'var(--card)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--paper)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 12 }}>{item.description}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleAction(item.id, 'approve')} className="btn btn--sm" style={{ background: 'var(--aim)', color: '#fff', border: 'none' }}>
                      Approve
                    </button>
                    <button onClick={() => handleAction(item.id, 'reject')} className="btn btn--sm btn--outline">
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Chat removed: Now a global widget */}
      </div>
    </div>
  )
}
