'use client'

import { useState } from 'react'
import styles from './pay.module.css'

export default function PayClient({
  handle,
  initialAmount,
  isLocked,
  isAgency
}: {
  handle: string
  initialAmount: string
  isLocked: boolean
  isAgency?: boolean
}) {
  const [amount, setAmount] = useState(initialAmount)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/paystack/paywall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          amount: parseFloat(amount),
          email,
          isAgency
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url
      } else {
        throw new Error('Invalid response from payment provider')
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handlePay} className={styles.form}>
      {error && <div className={styles.errorAlert}>{error}</div>}
      
      <div className={styles.field}>
        <label className={styles.label}>Amount (KES)</label>
        <div className={styles.amountInputWrapper}>
          <span className={styles.currencyCode}>KES</span>
          <input 
            type="number" 
            min="10"
            step="1"
            required
            className={`${styles.input} ${styles.amountInput}`}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={isLocked || loading}
            placeholder="0.00"
          />
        </div>
        {isLocked && <p className={styles.lockedHint}>Amount is fixed by the seller.</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Your Email Address</label>
        <input 
          type="email" 
          required
          className={styles.input}
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
          placeholder="email@example.com"
        />
        <p className={styles.hint}>Your receipt will be sent here.</p>
      </div>

      <button type="submit" className={styles.payBtn} disabled={loading || !amount || !email}>
        {loading ? 'Processing...' : `Pay KES ${amount || '0'}`}
      </button>
    </form>
  )
}
