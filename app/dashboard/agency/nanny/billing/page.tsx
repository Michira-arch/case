'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateReference, PRICING, openPaystackCheckout } from '@/lib/paystack'
import styles from '../nanny-dashboard.module.css'

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

  const handleStartTrial = async () => {
    if (!org) return
    setPaymentStatus('confirming')
    try {
      const res = await fetch('/api/billing/start-trial', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to start trial')
      setPaymentStatus('success')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      setPaymentStatus('error')
    }
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
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Billing & Subscription</h1>
          <p className={styles.pageSubtitle}>Manage your agency subscription and payment settlement accounts.</p>
        </div>
      </div>

      <div className={styles.content}>
        {isFree && (
          <div style={{ 
            background: 'linear-gradient(135deg, var(--ink), #2563eb)', 
            color: 'white', 
            padding: '32px', 
            borderRadius: 'var(--radius-lg)', 
            marginBottom: '32px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 12px', color: 'white' }}>Start your 14-Day Free Trial ✨</h2>
            <p style={{ margin: 0, opacity: 0.9, maxWidth: '700px', lineHeight: 1.6, fontSize: '15px' }}>
              Experience the full power of the Case platform. We'll help you coordinate bookings, vet your workers, chase your invoices, and scale your client base in ways you wouldn't think possible. No commitment required.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Platform Subscription</h2>
            <div style={{ background: 'var(--card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--ink-muted)' }}>Current Plan</p>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '18px', textTransform: 'capitalize' }}>{org.billing_plan || 'Free'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--ink-muted)' }}>Status</p>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 600,
                    background: org.billing_status === 'active' ? 'var(--verified-bg)' : 'var(--warning-bg)',
                    color: org.billing_status === 'active' ? 'var(--verified)' : 'var(--warning)'
                  }}>
                    {org.billing_status || 'Inactive'}
                  </span>
                </div>
              </div>
              
              {org.next_billing_date && (
                <p style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '24px' }}>
                  Next Billing Date: <strong>{new Date(org.next_billing_date).toLocaleDateString()}</strong>
                </p>
              )}

              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div 
                  onClick={() => setSelectedPlan('agency_monthly')}
                  style={{ 
                    border: selectedPlan === 'agency_monthly' ? '2px solid var(--ink)' : '1px solid var(--line)', 
                    padding: '16px', 
                    borderRadius: 'var(--radius)', 
                    cursor: 'pointer', 
                    flex: 1,
                    background: selectedPlan === 'agency_monthly' ? 'var(--paper-light)' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <h3 style={{ fontSize: '15px', margin: '0 0 8px' }}>Monthly</h3>
                  <p style={{ fontSize: '14px', color: 'var(--ink-muted)', margin: 0 }}>1,000 KES / mo</p>
                </div>
                <div 
                  onClick={() => setSelectedPlan('agency_yearly')}
                  style={{ 
                    border: selectedPlan === 'agency_yearly' ? '2px solid var(--ink)' : '1px solid var(--line)', 
                    padding: '16px', 
                    borderRadius: 'var(--radius)', 
                    cursor: 'pointer', 
                    flex: 1,
                    background: selectedPlan === 'agency_yearly' ? 'var(--paper-light)' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <h3 style={{ fontSize: '15px', margin: '0 0 8px' }}>Yearly</h3>
                  <p style={{ fontSize: '14px', color: 'var(--ink-muted)', margin: 0 }}>10,000 KES / yr</p>
                  <span style={{ fontSize: '11px', background: 'var(--verified-bg)', color: 'var(--verified)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Save 17%</span>
                </div>
              </div>

              <button 
                onClick={isFree ? handleStartTrial : handleCheckout} 
                className="btn btn--dark"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isFree ? 'Start 14-Day Free Trial' : 'Renew Subscription'}
              </button>

              {paymentStatus === 'confirming' && <p style={{ color: 'var(--warning)', marginTop: '16px', fontSize: '14px', textAlign: 'center' }}>Processing...</p>}
              {paymentStatus === 'error' && <p style={{ color: 'var(--danger)', marginTop: '16px', fontSize: '14px', textAlign: 'center' }}>Failed to process. Please try again.</p>}
              {paymentStatus === 'success' && <p style={{ color: 'var(--verified)', marginTop: '16px', fontSize: '14px', textAlign: 'center', fontWeight: 600 }}>✨ Success!</p>}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Client Payments (Settlement)</h2>
            <div style={{ background: 'var(--card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', height: '100%' }}>
              <p style={{ fontSize: '14px', color: 'var(--ink-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
                Set up a Paystack Subaccount so clients can pay you directly. The platform automatically takes its commission, and the rest is settled directly to your bank account.
              </p>
              
              {org.paystack_subaccount_code ? (
                <div style={{ background: 'var(--verified-bg)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--verified)' }}>
                  <p style={{ color: 'var(--verified)', fontWeight: 600, margin: '0 0 8px' }}>✅ Settlement Account Active</p>
                  <p style={{ fontSize: '13px', color: 'var(--ink)', margin: 0 }}>Subaccount Code: <code style={{ background: 'rgba(255,255,255,0.5)', padding: '2px 6px', borderRadius: '4px' }}>{org.paystack_subaccount_code}</code></p>
                </div>
              ) : (
                <form onSubmit={handleCreateSubaccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {subaccountError && (
                    <div className={`${styles.notice} ${styles.noticeDanger}`}>
                      {subaccountError}
                    </div>
                  )}
                  
                  <div className={styles.field}>
                    <label className={styles.label}>Bank Code</label>
                    <input 
                      type="text" 
                      className={styles.input}
                      value={bankName} 
                      onChange={(e) => setBankName(e.target.value)} 
                      placeholder="e.g. 044 (Access Bank)"
                      required 
                    />
                    <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '4px' }}>Enter the 3-digit bank code provided by Paystack.</p>
                  </div>
                  
                  <div className={styles.field}>
                    <label className={styles.label}>Account Number</label>
                    <input 
                      type="text" 
                      className={styles.input}
                      value={accountNumber} 
                      onChange={(e) => setAccountNumber(e.target.value)} 
                      placeholder="10-digit account number"
                      required 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn--dark"
                    disabled={submittingSubaccount}
                    style={{ marginTop: '8px' }}
                  >
                    {submittingSubaccount ? 'Creating...' : 'Create Settlement Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
