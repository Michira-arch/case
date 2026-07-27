'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateReference, openPaystackCheckout } from '@/lib/paystack'

export default function ClientBillingPage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [clientRecord, setClientRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'confirming' | 'success'>('idle')

  useEffect(() => {
    // Inject Paystack script
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.body.appendChild(script)

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (profile) {
        // Assuming client is linked via profile_id in nanny_clients
        const { data: clientData } = await supabase
          .from('nanny_clients')
          .select('*')
          .eq('profile_id', profile.id)
          .single()
        
        setClientRecord(clientData)
      }
      setLoading(false)
    }

    load()
  }, [])

  const handleSavePaymentMethod = () => {
    if (!user || !clientRecord) return
    
    // We do a small test charge to save authorization (e.g. 50 KES)
    const amountKes = 50
    const ref = generateReference(clientRecord.id)

    setPaymentStatus('idle')

    openPaystackCheckout({
      email: user.email,
      amountKes,
      reference: ref,
      profileId: clientRecord.profile_id,
      planPeriod: 'auth_charge', // Just an indicator for the webhook
      onSuccess: async (reference) => {
        setPaymentStatus('confirming')
        
        // Let webhook capture the `authorization_code` from the transaction 
        // and save it into nanny_clients (paystack_auth_code)
        setTimeout(() => {
          setPaymentStatus('success')
        }, 3000)
      },
      onClose: () => {
        if (paymentStatus !== 'success') {
          setPaymentStatus('idle')
        }
      }
    })
  }

  if (loading) return <div>Loading...</div>
  if (!clientRecord) return <div>No client profile found.</div>

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <h1>Client Billing & Payments</h1>

      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '40px' }}>
        <h2>Payment Methods</h2>
        <p>Provide a payment method to allow automatic billing for your subscriptions or invoices.</p>
        
        {clientRecord.paystack_auth_code ? (
          <div style={{ background: '#eef', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <p>✅ You have a saved payment method. Future bills will be processed automatically.</p>
          </div>
        ) : (
          <p>You have not saved a payment method yet.</p>
        )}

        <button 
          onClick={handleSavePaymentMethod} 
          style={{ padding: '10px 20px', background: 'blue', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {clientRecord.paystack_auth_code ? 'Update Payment Method' : 'Add Payment Method'}
        </button>

        {paymentStatus === 'confirming' && <p style={{ color: 'orange', marginTop: '10px' }}>Authorizing card...</p>}
        {paymentStatus === 'success' && <p style={{ color: 'green', marginTop: '10px' }}>Payment method saved successfully!</p>}
      </div>
    </div>
  )
}
