'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../nanny-dashboard.module.css'

export default function CopilotClient({ org, initialInbox }: { org: any, initialInbox: any[] }) {
  const router = useRouter()
  const [inbox, setInbox] = useState(initialInbox)
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pushStatus, setPushStatus] = useState<string>('')

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    // Optimistic update
    setInbox(prev => prev.filter(item => item.id !== id))
    
    // Server call
    try {
      await fetch(`/api/nanny/action-inbox/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const newMessages = [...messages, { role: 'user', content: userMsg }]
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id, messages: newMessages })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message?.content || data.error || 'Sorry, an error occurred.' }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to connect to AI.' }])
    } finally {
      setLoading(false)
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
          org_id: org.id,
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

      <div className={styles.formGrid}>
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

        {/* Chat */}
        <div className={styles.formSection} style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
          <div className={styles.formSectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💬</span> Agency Assistant
          </div>
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--paper)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: 14, marginTop: 'auto', marginBottom: 'auto' }}>
                Ask me anything about your agency data, workers, or clients!
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? 'var(--aim)' : 'var(--card)', color: msg.role === 'user' ? '#fff' : 'var(--ink)', padding: '10px 14px', borderRadius: 'var(--radius-md)', maxWidth: '80%', fontSize: 14, boxShadow: 'var(--shadow-sm)' }}>
                  {msg.content}
                </div>
              ))
            )}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--card)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 14, color: 'var(--ink-muted)' }}>
                Thinking...
              </div>
            )}
          </div>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
            <input 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)}
              className={styles.input}
              placeholder="Type your message..."
              style={{ flex: 1 }}
              disabled={loading}
            />
            <button type="submit" className="btn btn--dark" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
