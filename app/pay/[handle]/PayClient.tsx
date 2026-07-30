'use client'

import { useState, useEffect } from 'react'
import styles from './pay.module.css'

export default function PayClient({
  handle,
  initialAmount,
  isLocked,
  isKenya = true,
  subaccount
}: {
  handle: string
  initialAmount: string
  isLocked: boolean
  isKenya?: boolean
  subaccount?: string
}) {
  const [amount, setAmount] = useState(initialAmount)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chargeStatus, setChargeStatus] = useState<'idle' | 'loading' | 'stk_pushed' | 'success' | 'error'>('idle')
  const [chargeMessage, setChargeMessage] = useState('')

  useEffect(() => {
    const savedEmail = localStorage.getItem('paywall_email')
    if (savedEmail) setEmail(savedEmail)
    const savedPhone = localStorage.getItem('mpesa_phone')
    if (savedPhone) setPhone(savedPhone)
  }, [])

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!amount || parseFloat(amount) < 10) {
      setError('Please enter a valid amount (minimum KES 10).')
      return
    }
    if (!email) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/paystack/paywall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          amount: parseFloat(amount),
          email
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

  const handleMpesaDirect = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!amount || parseFloat(amount) < 10) {
      setChargeStatus('error')
      setChargeMessage('Please enter a valid amount (minimum KES 10).')
      return
    }
    if (!email) {
      setChargeStatus('error')
      setChargeMessage('Please enter your email address.')
      return
    }
    if (!phone || phone.length < 9) {
      setChargeStatus('error')
      setChargeMessage('Please enter a valid M-Pesa phone number.')
      return
    }

    setChargeStatus('loading')
    setChargeMessage('')

    try {
      const reference = `PAY-${handle}-${Date.now()}`

      const res = await fetch('/api/paystack/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amountKes: amount,
          phone,
          reference,
          subaccount
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate STK push')
      }

      setChargeStatus('stk_pushed')
      setChargeMessage('Check your phone! An M-Pesa PIN prompt has been sent to ' + phone)
      
      // Auto-refresh after 15s to check for success (or they can manually refresh)
      setTimeout(() => {
        window.location.reload()
      }, 15000)

    } catch (err: any) {
      console.error(err)
      setChargeStatus('error')
      setChargeMessage(err.message || 'Something went wrong.')
    }
  }

  return (
    <form className={styles.form}>
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
          onChange={e => {
            setEmail(e.target.value)
            localStorage.setItem('paywall_email', e.target.value)
          }}
          disabled={loading}
          placeholder="email@example.com"
        />
        <p className={styles.hint}>Your receipt will be sent here.</p>
      </div>

      {isKenya && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#0f172a' }}>Pay with M-Pesa</h4>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>Enter your M-Pesa number to receive a payment prompt instantly.</p>
          
          <div className={styles.field}>
            <input 
              type="tel" 
              placeholder="e.g. 0712345678"
              className={styles.input}
              value={phone}
              onChange={e => {
                setPhone(e.target.value)
                localStorage.setItem('mpesa_phone', e.target.value)
              }}
              disabled={chargeStatus === 'loading' || chargeStatus === 'stk_pushed'}
            />
          </div>

          {chargeStatus === 'error' && (
            <p style={{ fontSize: '0.875rem', color: '#ef4444', marginTop: '0.5rem' }}>{chargeMessage}</p>
          )}
          {chargeStatus === 'stk_pushed' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: '#15803d', background: '#f0fdf4', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid #15803d', borderTopColor: 'transparent', borderRadius: '50%' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{chargeMessage}</p>
            </div>
          )}

          <button 
            type="button" 
            onClick={handleMpesaDirect}
            className={styles.payBtn} 
            style={{ marginTop: '1rem', background: '#16a34a' }}
            disabled={chargeStatus === 'loading' || chargeStatus === 'stk_pushed'}
          >
            {chargeStatus === 'loading' ? 'Sending Prompt...' : `Pay KES ${amount || '0'}`}
          </button>
        </div>
      )}

      {isKenya && (
        <div style={{ margin: '2rem 0', position: 'relative', textAlign: 'center' }}>
          <hr style={{ borderColor: '#e2e8f0', margin: 0 }} />
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '0 8px', fontSize: '0.875rem', color: '#94a3b8' }}>
            Or use another method
          </span>
        </div>
      )}

      <button 
        type="button" 
        onClick={handlePay}
        className={styles.payBtn} 
        disabled={loading || chargeStatus === 'loading' || chargeStatus === 'stk_pushed'}
        style={isKenya ? { background: '#fff', color: '#334155', border: '1px solid #cbd5e1' } : {}}
      >
        {loading ? 'Processing...' : (isKenya ? 'Pay with Card / Other' : `Pay KES ${amount || '0'} Now`)}
      </button>
    </form>
  )
}
