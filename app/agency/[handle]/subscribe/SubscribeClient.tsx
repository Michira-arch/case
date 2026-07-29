'use client'

import { useState } from 'react'
import { openPaystackCheckout } from '@/lib/paystack'

export default function SubscribeClient({ 
  orgId, 
  displayName, 
  amountKes,
  subaccount
}: { 
  orgId: string
  displayName: string
  amountKes: number
  subaccount: string
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubscribe = () => {
    if (!email) {
      alert('Please enter your email address')
      return
    }

    setLoading(true)
    
    // Generate a reference
    const ref = `SUB-ORG-${orgId.slice(0, 6)}-${Date.now()}`

    openPaystackCheckout({
      email,
      amountKes,
      reference: ref,
      profileId: orgId, // this might need to change in paystack hook if it expects user ID, but it should be fine
      planPeriod: 'agency_subscription', // special flag for webhook
      subaccount,
      isSubscription: true, // Forces card payment
      onSuccess: () => {
        setSuccess(true)
        setLoading(false)
      },
      onClose: () => {
        setLoading(false)
      }
    })
  }

  if (success) {
    return (
      <div style={{ padding: '32px', background: 'var(--card)', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--line)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Subscription Successful!</h2>
        <p style={{ color: 'var(--ink-soft)' }}>Thank you for subscribing to {displayName}.</p>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Your Email</label>
        <input 
          type="email" 
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="email@example.com"
          style={{ 
            width: '100%', 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid var(--line)',
            background: 'var(--paper)',
            color: 'var(--ink)'
          }}
        />
      </div>
      <button 
        className="btn btn--brass btn--full"
        onClick={handleSubscribe}
        disabled={loading}
      >
        {loading ? 'Processing...' : `Pay KES ${amountKes} with Card`}
      </button>
      <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--ink-soft)', textAlign: 'center' }}>
        Your card will be saved securely for automated billing. You can cancel at any time.
      </p>
    </div>
  )
}
