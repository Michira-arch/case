'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './vouch_new.module.css'

export default function NewVouchPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('Hey! Could you leave a quick recommendation on my profile for the work we did recently? It takes a minute and really helps me build credibility.')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at')
        .limit(1)
        .single()

      if (!data) {
        router.push('/onboarding')
        return
      }

      setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipient.trim() || !profile) return

    setSubmitting(true)
    setError('')

    try {
      const { data, error: rpcErr } = await supabase.rpc('create_vouch_request', {
        p_profile_id:      profile.id,
        p_recipient_label: recipient.trim(),
        p_message:         message.trim() || null,
      })

      if (rpcErr) throw rpcErr

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const link = `${appUrl}/@${profile.handle}/vouch/${data.token}`
      setGeneratedLink(link)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedLink)
    alert('Recommendation link copied!')
  }

  const handleShareWhatsApp = () => {
    const text = `Hey! Could you write a recommendation for my work? Tap this link to leave a short review on my Case: ${generatedLink}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>← Back</button>
          <h1 className={styles.title}>New recommendation request</h1>
          <p className={styles.sub}>Generate a single-use recommendation link for a client or colleague</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {generatedLink ? (
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.successTitle}>Recommendation request ready!</h2>
            <p className={styles.successSub}>
              Send this private link to <b>{recipient}</b>. They can leave a recommendation without creating an account.
            </p>

            <div className={styles.linkDisplay}>
              <input type="text" readOnly value={generatedLink} className={styles.linkInput} />
              <button onClick={handleCopy} className="btn btn--outline btn--sm">Copy</button>
            </div>

            <div className={styles.shareRow}>
              <button onClick={handleShareWhatsApp} className="btn btn--brass btn--full">
                Share via WhatsApp
              </button>
              <button onClick={() => { setGeneratedLink(''); setRecipient('') }} className="btn btn--outline btn--full">
                Create another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="field">
              <label className="label" htmlFor="recipient">Who are you asking? *</label>
              <input
                id="recipient"
                type="text"
                className="input"
                placeholder="e.g. James Mwangi (Client)"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                required
                autoFocus
              />
              <p className={styles.hint}>For your own tracking only — not visible publicly.</p>
            </div>

            <div className="field">
              <label className="label" htmlFor="message">Prefilled ask message</label>
              <textarea
                id="message"
                className="input textarea"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
              />
              <p className={styles.hint}>Shown to the recipient when they open the link.</p>
            </div>

            <div className={styles.actionRow}>
              <button type="button" className="btn btn--outline" onClick={() => router.back()}>
                Cancel
              </button>
              <button type="submit" className="btn btn--brass" disabled={submitting || !recipient.trim()}>
                {submitting ? 'Generating…' : 'Generate recommendation link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
