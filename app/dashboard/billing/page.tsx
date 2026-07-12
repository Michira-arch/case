'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import { generateReference, PRICING, openPaystackCheckout } from '@/lib/paystack'
import styles from './billing.module.css'

interface PricingPlan {
  id: '6m' | '12m'
  label: string
  amount_kes: number
  months: number
  description: string
}

export default function BillingPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'confirming' | 'success' | 'error'>('idle')
  const [selectedPlan, setSelectedPlan] = useState<'6m' | '12m'>('12m')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const [profileRes, planRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('owner_id', user.id).order('created_at').limit(1).single(),
        supabase.from('pricing_plans').select('*').order('amount_kes'),
      ])

      if (profileRes.data) {
        setProfile(profileRes.data)
        const subRes = await supabase
          .from('subscriptions')
          .select('*')
          .eq('profile_id', profileRes.data.id)
          .single()
        setSubscription(subRes.data)
      }

      setPlans(planRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleCheckout = async (planId: '6m' | '12m') => {
    if (!user || !profile) return

    const plan = plans.find(p => p.id === planId) || PRICING[planId]
    const reference = generateReference(profile.id)

    openPaystackCheckout({
      email: user.email || `${profile.handle}@case.app`,
      amountKes: plan.amount_kes,
      reference,
      profileId: profile.id,
      planPeriod: planId,
      onSuccess: (ref) => {
        setPaymentStatus('confirming')
        // Poll for subscription update (webhook may take a few seconds)
        let attempts = 0
        const poll = setInterval(async () => {
          attempts++
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('profile_id', profile.id)
            .single()

          if (sub?.plan === 'plus' || attempts > 10) {
            clearInterval(poll)
            setSubscription(sub)
            setPaymentStatus('success')
          }
        }, 2000)
      },
      onClose: () => {
        if (paymentStatus === 'idle') {
          // User closed modal without paying — that's ok
        }
      },
    })
  }

  const isPlus = subscription?.plan === 'plus'
  const expiresAt = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null

  const daysLeft = expiresAt
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

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
    <>
      <Script
        src="https://js.paystack.co/v1/inline.js"
        strategy="afterInteractive"
      />
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Billing</h1>
          <p className={styles.sub}>Manage your Case+ subscription</p>

          {/* Current plan status */}
          <div className={styles.planStatus}>
            <div className={styles.planStatusBadge}>
              <span className={`badge ${isPlus ? 'badge--brass' : 'badge--muted'}`}>
                {isPlus ? 'Case+' : 'Free plan'}
              </span>
              {isPlus && expiresAt && (
                <span className={styles.expiry}>
                  {daysLeft && daysLeft > 0
                    ? `Renews in ${daysLeft} days — ${expiresAt.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : 'Expired'
                  }
                </span>
              )}
            </div>
            {isPlus && (
              <p className={styles.plusPerks}>
                You have unlimited proof items, evidence files, vouch requests, full analytics, and no footer branding.
              </p>
            )}
          </div>

          {/* Payment status */}
          {paymentStatus === 'confirming' && (
            <div className={styles.confirmingBanner}>
              <div className="spinner" />
              <span>Confirming your payment… this takes a few seconds.</span>
            </div>
          )}
          {paymentStatus === 'success' && (
            <div className={styles.successBanner}>
              🎉 You're now on Case+! Your profile has been upgraded.
            </div>
          )}

          {/* Upgrade options */}
          {!isPlus && paymentStatus !== 'success' && (
            <>
              <h2 className={styles.upgradeTitle}>Upgrade to Case+</h2>

              <div className={styles.plansGrid}>
                {(plans.length ? plans : Object.values(PRICING).map((p) => ({ ...p, description: '' }))).map((plan: any) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlan === plan.id}
                    onSelect={() => setSelectedPlan(plan.id)}
                    onCheckout={() => handleCheckout(plan.id)}
                  />
                ))}
              </div>

              <div className={styles.perks}>
                <h3 className={styles.perksTitle}>What you get with Case+</h3>
                <ul className={styles.perksList}>
                  {[
                    'Unlimited proof items per pillar (free: 4)',
                    'Unlimited evidence files per item (free: 2)',
                    'Unlimited vouch requests open at once (free: 3)',
                    'Full analytics — referrer breakdown, device split, per-item stats',
                    'Remove "Built with Case" footer from your public profile',
                    'Priority placement in Case Search results',
                  ].map(perk => (
                    <li key={perk} className={styles.perk}>
                      <span className={styles.perkCheck}>✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.payNote}>
                <p>Payment processed securely by <b>Paystack</b> — card or M-Pesa accepted.</p>
                <p>Your subscription is per Case (profile), not per account. Renew manually — no auto-charge.</p>
              </div>
            </>
          )}

          {/* Renew (already plus) */}
          {isPlus && (
            <div className={styles.renewSection}>
              <h2 className={styles.upgradeTitle}>Renew or extend</h2>
              <p className={styles.renewNote}>Renewing early extends from your current expiry date — you won't lose any time.</p>
              <div className={styles.plansGrid}>
                {(plans.length ? plans : Object.values(PRICING).map((p) => ({ ...p, description: '' }))).map((plan: any) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlan === plan.id}
                    onSelect={() => setSelectedPlan(plan.id)}
                    onCheckout={() => handleCheckout(plan.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function PlanCard({ plan, selected, onSelect, onCheckout }: {
  plan: any; selected: boolean; onSelect: () => void; onCheckout: () => void
}) {
  const isYearly = plan.id === '12m'

  return (
    <div
      className={`${styles.planCard} ${selected ? styles.planCardSelected : ''} ${isYearly ? styles.planCardHighlight : ''}`}
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
    >
      {isYearly && (
        <div className={styles.planBestValue}>Best value</div>
      )}
      <div className={styles.planLabel}>{plan.label}</div>
      <div className={styles.planPrice}>
        <span className={styles.planAmount}>KES {plan.amount_kes}</span>
        <span className={styles.planPeriod}>/ {plan.months} months</span>
      </div>
      {isYearly && (
        <div className={styles.planSaving}>Save ~29% vs two 6-month cycles</div>
      )}
      {plan.description && (
        <p className={styles.planDesc}>{plan.description}</p>
      )}
      {selected && (
        <button
          className="btn btn--brass btn--full"
          onClick={(e) => { e.stopPropagation(); onCheckout() }}
          style={{ marginTop: 12 }}
        >
          Pay KES {plan.amount_kes} →
        </button>
      )}
    </div>
  )
}
