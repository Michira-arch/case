'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { openPaystackCheckout } from '@/lib/paystack'
import { NannyOrg } from '@/lib/nanny-types'
import { CheckCircle2, AlertCircle, CreditCard, CalendarDays, Loader2 } from 'lucide-react'

export default function AgencyBillingPage() {
  const [org, setOrg] = useState<NannyOrg | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchOrg()
  }, [])

  async function fetchOrg() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
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

  const handleSubscribe = async (planType: 'agency_monthly' | 'agency_yearly', amountKes: number) => {
    if (!org) return
    setProcessing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('No user email')

      // Create a checkout session referencing the org and plan
      openPaystackCheckout({
        email: user.email,
        amountKes: amountKes,
        reference: `SUB-${org.id}-${Date.now()}`,
        planPeriod: planType,
        isSubscription: true,
        onSuccess: async (ref) => {
          // Tell our backend to verify and start the subscription
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
            await fetchOrg()
            router.refresh()
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
      await fetchOrg()
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessing(false)
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500 mt-2">Manage your agency's subscription to the platform.</p>
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
                    {org.billing_status.toUpperCase()}
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
            <h2 className="text-lg font-semibold">Payment Method</h2>
            {org.paystack_auth_code ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Card on File (Active)</span>
                <span className="text-xs text-gray-500 ml-auto">Used for automatic renewals</span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No payment method on file. Subscribe to a plan to add one.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-b from-blue-50 to-white border border-blue-100 rounded-xl p-6 shadow-sm">
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
                <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
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
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
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
