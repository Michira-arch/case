'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { openPaystackCheckout } from '@/lib/paystack'
import { NannyOrg } from '@/lib/nanny-types'
import { CheckCircle2, AlertCircle, CreditCard, CalendarDays, Loader2, Landmark } from 'lucide-react'

export default function AgencyBillingPage() {
  const [org, setOrg] = useState<NannyOrg | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const supabase = createClient()
  
  // Subaccount state
  const [submittingSubaccount, setSubmittingSubaccount] = useState(false)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [banks, setBanks] = useState<any[]>([])
  const [subaccountError, setSubaccountError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrg()
    fetchBanks()
  }, [])

  async function fetchOrg() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single()
      
    if (!profile) {
      setLoading(false)
      return
    }

    const { data: orgData } = await supabase
      .from('nanny_orgs')
      .select('*')
      .eq('owner_profile_id', profile.id)
      .single()
    
    if (orgData) {
      setOrg(orgData)
    }
    setLoading(false)
  }

  async function fetchBanks() {
    try {
      const banksRes = await fetch('/api/paystack/banks')
      const banksData = await banksRes.json()
      if (banksData.data) {
        setBanks(banksData.data)
      }
    } catch (err) {
      console.error('Error fetching banks', err)
    }
  }

  const handleSubscribe = async (planType: 'agency_monthly' | 'agency_yearly', amountKes: number) => {
    if (!org) return
    setProcessing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('No user email')

      openPaystackCheckout({
        email: user.email,
        amountKes: amountKes,
        reference: `SUB-${org.id}-${Date.now()}`,
        planPeriod: planType,
        isSubscription: true,
        onSuccess: async (ref) => {
          const res = await fetch('/api/billing/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: ref, orgId: org.id, plan: planType }),
          })

          if (!res.ok) {
            const err = await res.json()
            alert(`Subscription failed: ${err.error}`)
          } else {
            alert('Subscription successful!')
            fetchOrg()
          }
          setProcessing(false)
        },
        onClose: () => {
          setProcessing(false)
        },
      })
    } catch (error: any) {
      console.error(error)
      alert(error.message)
      setProcessing(false)
    }
  }

  const handleStartTrial = async () => {
    setProcessing(true)
    try {
      const res = await fetch('/api/billing/start-trial', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start trial')
      }
      alert('14-day free trial started successfully!')
      fetchOrg()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessing(false)
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
      alert('Settlement account linked successfully!')
    } catch (err: any) {
      setSubaccountError(err.message)
    } finally {
      setSubmittingSubaccount(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="animate-spin text-gray-400 w-8 h-8" />
    </div>
  )

  if (!org) return <div>Agency not found.</div>

  const isPro = org.billing_plan !== 'free' && org.billing_status === 'active'

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-8 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Billing & Settlement</h1>
        <p className="text-gray-500 mt-2">Manage your platform subscription and client payment settlements.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {org.billing_plan === 'free' ? 'Free Plan' : org.billing_plan.replace('_', ' ')}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${isPro ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {isPro ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {org.billing_status?.toUpperCase() || 'INACTIVE'}
                  </span>
                  {org.next_billing_date && (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <CalendarDays className="w-4 h-4" />
                      Renews: {new Date(org.next_billing_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Platform Payment Method</h2>
            {org.paystack_auth_code ? (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
                <CreditCard className="w-5 h-5 text-green-600" />
                <div>
                  <span className="block text-sm font-medium text-gray-900">Card on File (Active)</span>
                  <span className="block text-xs text-gray-500">Used for automatic renewals</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border">No payment method on file. Subscribe to a plan to add one.</p>
            )}
          </div>

          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Client Payments (Settlement)</h2>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Set up a Paystack Subaccount so clients can pay you directly. The platform automatically takes its commission, and the rest is settled directly to your bank account.
            </p>
            
            {org.paystack_subaccount_code ? (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-700 font-semibold flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5" /> Settlement Account Active
                </p>
                <p className="text-sm text-green-800">
                  Subaccount Code: <code className="bg-white px-2 py-0.5 rounded font-mono border border-green-200">{org.paystack_subaccount_code}</code>
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateSubaccount} className="space-y-4">
                {subaccountError && (
                  <div className="bg-red-50 text-red-700 p-3 rounded text-sm border border-red-200">
                    {subaccountError}
                  </div>
                )}
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Bank / Provider</label>
                    <select 
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      required
                    >
                      <option value="">Select a Bank...</option>
                      {banks.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Account / Phone Number</label>
                    <input 
                      type="text" 
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={bankName === 'MPESA' ? '07XXXXXXXX' : 'e.g. 0123456789'}
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submittingSubaccount}
                  className="bg-gray-900 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {submittingSubaccount ? 'Creating...' : 'Create Settlement Account'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-b from-blue-50 to-white border border-blue-100 rounded-xl p-6 shadow-sm sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Upgrade to Pro</h3>
            <p className="text-sm text-gray-600 mb-6">Unlock all premium agency features, advanced matchmaking, and remove platform limits.</p>
            
            <div className="space-y-4">
              {org.billing_plan === 'free' && org.billing_status !== 'trial' && (
                <button 
                  onClick={handleStartTrial}
                  disabled={processing}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-sm font-medium"
                >
                  Start 14-Day Free Trial
                </button>
              )}

              <button 
                onClick={() => handleSubscribe('agency_monthly', 1000)}
                disabled={processing || isPro}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Monthly</div>
                  <div className="text-sm text-gray-500">1,000 KES / mo</div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isPro && org.billing_plan === 'agency_monthly' ? 'border-blue-600' : 'border-gray-300'}`}>
                  {isPro && org.billing_plan === 'agency_monthly' && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                </div>
              </button>

              <button 
                onClick={() => handleSubscribe('agency_yearly', 10000)}
                disabled={processing || isPro}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900 group-hover:text-gray-900">Yearly <span className="text-xs ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Save 17%</span></div>
                  <div className="text-sm text-gray-500">10,000 KES / yr</div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isPro && org.billing_plan === 'agency_yearly' ? 'border-blue-600' : 'border-gray-300'}`}>
                  {isPro && org.billing_plan === 'agency_yearly' && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                </div>
              </button>
            </div>
            {isPro && (
              <p className="text-xs text-center text-green-600 mt-4 font-medium">
                You are currently subscribed to a Pro plan.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
