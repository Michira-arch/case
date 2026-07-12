'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './vouch.module.css'

interface Props {
  vouchRequest: {
    id: string
    token: string
    recipient_label: string | null
    message: string | null
    profiles: {
      display_name: string
      handle: string
      role_line: string | null
    } | null
  }
}

export default function VouchForm({ vouchRequest }: Props) {
  const profile = vouchRequest.profiles
  const [quote, setQuote] = useState('')
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quote.trim() || !name.trim() || !relationship.trim()) return

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.rpc('submit_vouch', {
        p_token: vouchRequest.token,
        p_quote: quote.trim(),
        p_voucher_name: name.trim(),
        p_relationship: relationship.trim(),
        p_evidence_keys: [],
      })

      if (error) throw error
      setDone(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>Recommendation submitted!</h1>
          <p className={styles.successSub}>
            {profile?.display_name} will review your recommendation before it appears on their Case.
            Thank you for taking the time.
          </p>
          <a href={`/@${profile?.handle}`} className="btn btn--outline">
            View their Case →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.wordmark}>Case</span>
          <p className={styles.headerSub}>You've been asked for a recommendation</p>
        </div>

        {/* Who asked */}
        <div className={styles.askedBy}>
          <p className={styles.askedByName}>
            {profile?.display_name || vouchRequest.recipient_label}
          </p>
          {profile?.role_line && (
            <p className={styles.askedByRole}>{profile.role_line}</p>
          )}
        </div>

        {/* Prefilled message */}
        {vouchRequest.message && (
          <div className={styles.message}>
            <p className={styles.messageLabel}>Their ask</p>
            <p className={styles.messageText}>"{vouchRequest.message}"</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="field">
            <label className="label" htmlFor="quote">
              Your testimonial *
            </label>
            <textarea
              id="quote"
              className={`input textarea`}
              placeholder="Write a genuine quote about working with them or knowing their skills — this will appear on their public Case."
              value={quote}
              onChange={e => setQuote(e.target.value)}
              maxLength={500}
              required
              rows={4}
            />
            <p className={styles.charCount}>{quote.length}/500</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="name">Your name *</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="Faith Kamau"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="relationship">
              Your relationship to them *
            </label>
            <input
              id="relationship"
              type="text"
              className="input"
              placeholder="Client · Colleague · Supervisor · Teacher"
              value={relationship}
              onChange={e => setRelationship(e.target.value)}
              required
            />
          </div>

          <div className={styles.consentNote}>
            <p>
              By submitting, you agree that this testimonial may be displayed publicly on {profile?.display_name}'s Case profile.
              Your name and relationship will be shown alongside your quote.
            </p>
          </div>

          <button
            type="submit"
            className="btn btn--brass btn--full btn--lg"
            disabled={loading || !quote.trim() || !name.trim() || !relationship.trim()}
          >
            {loading ? 'Submitting…' : 'Submit recommendation'}
          </button>
        </form>

        <div className={styles.footer}>
          <span className={styles.wordmark} style={{ fontSize: 14 }}>Case</span>
          <span className={styles.footerSub}>The proof-of-work profile</span>
        </div>
      </div>
    </div>
  )
}
