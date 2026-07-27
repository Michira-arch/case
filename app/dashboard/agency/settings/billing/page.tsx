'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateReference, PRICING, openPaystackCheckout } from '@/lib/paystack'

export default function AgencyBillingPage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'confirming' | 'success' | 'error'>('idle')
  const [selectedPlan, setSelectedPlan] = useState<'agency_monthly' | 'agency_yearly'>('agency_monthly')
  const [subaccountError, setSubaccountError] = useState<string | null>(null)

  // Subaccount form state
  const [submittingSubaccount, setSubmittingSubaccount] = useState(false)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

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
      setProfile(profile)

      if (profile) {
        const { data: orgData } = await supabase
          .from('nanny_orgs')
          .select('*')
          .eq('owner_profile_id', profile.id)
          .single()
        
        setOrg(orgData)
      }
      setLoading(false)
    }

    load()
  }, [])

  const handleCheckout = () => {
    if (!user || !profile || !org) return

    setPaymentStatus('idle')
    const plan = PRICING[selectedPlan]
    const ref = generateReference(profile.id)

    openPaystackCheckout({
      email: user.email,
      amountKes: plan.amount_kes,
      reference: ref,
      profileId: profile.id,
      planPeriod: selectedPlan,
      onSuccess: async (reference) => {
        setPaymentStatus('confirming')
        
        // Let webhook handle updating the actual nanny_orgs billing_status
        // For UI purposes, we can poll or just assume success after a delay
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

  const handleCreateSubaccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return

    setSubmittingSubaccount(true)
    setSubaccountError(null)

    try {
      const res = await fetch('/api/billing/subaccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: org.id,
          business_name: org.name,
          settlement_bank: bankName,
          account_number: accountNumber
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create subaccount')
      }

      setOrg({ ...org, paystack_subaccount_code: data.subaccount_code })
    } catch (err: any) {
      setSubaccountError(err.message)
    } finally {
      setSubmittingSubaccount(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!org) return <div>No agency found for your profile. Please create one first.</div>

  const isFree = org.billing_plan === 'free' || !org.billing_plan

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <h1>Agency Billing & Payments</h1>

      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '40px' }}>
        <h2>Platform Subscription</h2>
        <p>Current Plan: <b>{org.billing_plan || 'Free'}</b></p>
        <p>Status: <b>{org.billing_status || 'Inactive'}</b></p>
        {org.next_billing_date && (
          <p>Next Billing Date: {new Date(org.next_billing_date).toLocaleDateString()}</p>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
          <div 
            onClick={() => setSelectedPlan('agency_monthly')}
            style={{ border: selectedPlan === 'agency_monthly' ? '2px solid blue' : '1px solid #ccc', padding: '15px', borderRadius: '8px', cursor: 'pointer', flex: 1 }}
          >
            <h3>Monthly Plan</h3>
            <p>1,000 KES / mo</p>
          </div>
          <div 
            onClick={() => setSelectedPlan('agency_yearly')}
            style={{ border: selectedPlan === 'agency_yearly' ? '2px solid blue' : '1px solid #ccc', padding: '15px', borderRadius: '8px', cursor: 'pointer', flex: 1 }}
          >
            <h3>Yearly Plan</h3>
            <p>10,000 KES / yr</p>
            <small>Save 17%</small>
          </div>
        </div>

        <button 
          onClick={handleCheckout} 
          style={{ marginTop: '20px', padding: '10px 20px', background: 'blue', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isFree ? 'Subscribe Now' : 'Renew Subscription'}
        </button>

        {paymentStatus === 'confirming' && <p style={{ color: 'orange' }}>Confirming payment...</p>}
        {paymentStatus === 'success' && <p style={{ color: 'green' }}>Payment successful! Your subscription is active.</p>}
      </div>

      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
        <h2>Client Payments (Settlement Account)</h2>
        <p>Set up a Paystack Subaccount so clients can pay you directly. The platform automatically takes its commission, and the rest is settled to your bank account.</p>
        
        {org.paystack_subaccount_code ? (
          <div style={{ background: '#eef', padding: '15px', borderRadius: '8px' }}>
            <p><b>Subaccount is active!</b></p>
            <p>Subaccount Code: {org.paystack_subaccount_code}</p>
          </div>
        ) : (
          <form onSubmit={handleCreateSubaccount} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
            {subaccountError && <p style={{ color: 'red' }}>{subaccountError}</p>}
            
            <label>
              Bank Code (e.g. 044 for Access Bank in Nigeria, or specific code for Kenya)
              <input 
                type="text" 
                value={bankName} 
                onChange={(e) => setBankName(e.target.value)} 
                required 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </label>
            
            <label>
              Account Number
              <input 
                type="text" 
                value={accountNumber} 
                onChange={(e) => setAccountNumber(e.target.value)} 
                required 
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </label>

            <button 
              type="submit" 
              disabled={submittingSubaccount}
              style={{ padding: '10px', background: 'green', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              {submittingSubaccount ? 'Creating...' : 'Create Subaccount'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
