'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './affiliate.module.css'

interface Referral {
  id: string
  created_at: string
  referred_name: string
  referred_handle: string
  payout_status: 'unpaid' | 'paid'
  upgraded_within_30_days: boolean
  payment_date: string | null
  commission_kes: number
  status: 'earned' | 'pending'
}

interface Payout {
  id: string
  amount_kes: number
  payment_details: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  processed_at: string | null
}

export default function AffiliatePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [affiliate, setAffiliate] = useState<any>(null)
  
  // Stats & logs
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])

  // UI state
  const [joining, setJoining] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      // Get active profile
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at')

      const activeProfile = profiles?.[0]
      if (activeProfile) {
        setProfile(activeProfile)

        // Fetch affiliate profile
        const { data: aff } = await supabase
          .from('affiliates')
          .select('*')
          .eq('profile_id', activeProfile.id)
          .maybeSingle()

        if (aff) {
          setAffiliate(aff)

          // Fetch referrals and payouts in parallel
          const [refRes, payRes] = await Promise.all([
            supabase
              .from('affiliate_referrals_summary')
              .select('*')
              .eq('referrer_profile_id', activeProfile.id)
              .order('created_at', { ascending: false }),
            supabase
              .from('affiliate_payouts')
              .select('*')
              .eq('profile_id', activeProfile.id)
              .order('created_at', { ascending: false })
          ])

          setReferrals(refRes.data || [])
          setPayouts(payRes.data || [])
        }
      }
    } catch (err) {
      console.error('Failed to load affiliate details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleJoin = async () => {
    setJoining(true)
    setFormError('')
    try {
      const res = await fetch('/api/affiliate/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join')

      setFormSuccess('Welcome to the Affiliate Program! Redirecting to your dashboard...')
      setTimeout(() => {
        setAffiliate(data.affiliate)
        loadData()
      }, 1500)
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.')
    } finally {
      setJoining(false)
    }
  }

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setPayoutLoading(true)
    setFormError('')
    setFormSuccess('')

    try {
      const res = await fetch('/api/affiliate/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentDetails }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit payout')

      setFormSuccess('Payout requested successfully!')
      setPaymentDetails('')
      await loadData()
    } catch (err: any) {
      setFormError(err.message || 'Failed to request payout.')
    } finally {
      setPayoutLoading(false)
    }
  }

  const copyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://caseshow.info'
    const link = `${origin}/ref/${affiliate?.code}`
    navigator.clipboard.writeText(link)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  // Calculate Stats
  const totalReferrals = referrals.length
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length
  const earnedReferrals = referrals.filter(r => r.status === 'earned').length
  const totalEarnedKes = referrals.filter(r => r.status === 'earned').reduce((sum, r) => sum + Number(r.commission_kes), 0)
  
  // Unpaid balance is all earned commission from referrals that haven't been linked to a payout (payout_status === 'unpaid')
  const unpaidBalanceKes = referrals.filter(r => r.status === 'earned' && r.payout_status === 'unpaid').reduce((sum, r) => sum + Number(r.commission_kes), 0)
  
  const totalPaidOutKes = payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount_kes), 0)
  const pendingPayoutKes = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount_kes), 0)

  const canRequestPayout = unpaidBalanceKes >= 1000

  if (loading) {
    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  // Onboarding View (Not Joined Yet)
  if (!affiliate) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div>
            <h1 className={styles.title}>Affiliate Program</h1>
            <p className={styles.sub}>Earn commissions by referring new users to Case</p>
          </div>

          <div className={styles.joinHero}>
            <span className={styles.joinIcon} role="img" aria-label="shakehands">🤝</span>
            <h2 className={styles.joinTitle}>Partner with Case</h2>
            <p className={styles.joinText}>
              Share Case with your audience, friends, or clients. Help professionals and freelancers prove their proof-of-work with gorgeous dossier pages and get paid for it!
            </p>

            <div className={styles.termsGrid}>
              <div className={styles.termItem}>
                <span className={styles.termTitle}>Active Signup</span>
                <span className={styles.termValue}>KES 1.00</span>
                <span className={styles.termDesc}>Paid if the new user does not upgrade, after staying with us for 30 days.</span>
              </div>
              <div className={styles.termItem}>
                <span className={styles.termTitle}>Case+ Upgrade</span>
                <span className={styles.termValue}>KES 20.00</span>
                <span className={styles.termDesc}>Paid immediately if the user upgrades to Case+ within 30 days of joining.</span>
              </div>
            </div>

            {formError && <div className={styles.errorBanner}>{formError}</div>}
            {formSuccess && <div className={styles.successBanner}>{formSuccess}</div>}

            <button
              className="btn btn--brass btn--lg joinBtn"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? 'Joining program…' : 'Join Affiliate Program'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard View (Joined Affiliate)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://caseshow.info'
  const refLink = `${origin}/ref/${affiliate.code}`

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div>
          <h1 className={styles.title}>Affiliate Dashboard</h1>
          <p className={styles.sub}>Track referrals, view earnings, and request payouts</p>
        </div>

        {/* Marketing Link Section */}
        <div className={styles.refLinkSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Marketing Link</h2>
            <p className={styles.sectionSub}>Use this link to refer new users. It sets a tracking cookie and redirects to the landing page.</p>
          </div>
          <div className={styles.linkContainer}>
            <input
              type="text"
              readOnly
              className={styles.inputLink}
              value={refLink}
              onClick={copyLink}
            />
            <button
              className="btn btn--brass copyBtn"
              onClick={copyLink}
            >
              {copySuccess ? 'Copied! ✓' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Referrals</span>
            <span className={styles.statValue}>{totalReferrals}</span>
            <span className={styles.statMeta}>{pendingReferrals} pending, {earnedReferrals} earned</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Commission</span>
            <span className={styles.statValue}>KES {totalEarnedKes.toFixed(2)}</span>
            <span className={styles.statMeta}>Cumulative earnings to date</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Unpaid Balance</span>
            <span className={styles.statValue} style={{ color: 'var(--brass)' }}>KES {unpaidBalanceKes.toFixed(2)}</span>
            <span className={styles.statMeta}>Available to withdraw</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Paid Out</span>
            <span className={styles.statValue} style={{ color: 'var(--verified)' }}>KES {totalPaidOutKes.toFixed(2)}</span>
            <span className={styles.statMeta}>{pendingPayoutKes > 0 ? `KES ${pendingPayoutKes.toFixed(2)} pending` : 'All payouts processed'}</span>
          </div>
        </div>

        {/* Main Content Layout Split */}
        <div className={styles.mainSplit}>
          
          {/* Tables Section */}
          <div className={styles.tableSection}>
            
            {/* Referrals table */}
            <div className={styles.tableCard}>
              <h2 className={styles.tableTitle}>Referrals Log</h2>
              <div className={styles.tableWrapper}>
                {referrals.length === 0 ? (
                  <div className={styles.emptyState}>
                    No referrals tracked yet. Share your marketing link to get started!
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Joined</th>
                        <th>Type</th>
                        <th>Commission</th>
                        <th>Payout Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((ref) => (
                        <tr key={ref.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{ref.referred_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>@{ref.referred_handle}</div>
                          </td>
                          <td>{new Date(ref.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td>
                            {ref.status === 'pending' ? (
                              <span className={`${styles.badge} ${styles.badgePending}`}>Pending (Trial)</span>
                            ) : ref.upgraded_within_30_days ? (
                              <span className={`${styles.badge} ${styles.badgeEarned}`}>Upgrade (+Plus)</span>
                            ) : (
                              <span className={`${styles.badge} ${styles.badgePaid}`}>Free Tier</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 600 }}>KES {Number(ref.commission_kes).toFixed(2)}</td>
                          <td>
                            {ref.payout_status === 'paid' ? (
                              <span style={{ color: 'var(--verified)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                Paid ✓
                              </span>
                            ) : ref.status === 'earned' ? (
                              <span style={{ color: 'var(--brass)' }}>Ready</span>
                            ) : (
                              <span style={{ color: 'var(--ink-muted)' }}>Waiting</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Payout history table */}
            <div className={styles.tableCard}>
              <h2 className={styles.tableTitle}>Payout History</h2>
              <div className={styles.tableWrapper}>
                {payouts.length === 0 ? (
                  <div className={styles.emptyState}>
                    No payout requests submitted yet.
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Request Date</th>
                        <th>Details</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((payout) => (
                        <tr key={payout.id}>
                          <td>{new Date(payout.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{payout.payment_details}</td>
                          <td style={{ fontWeight: 600 }}>KES {Number(payout.amount_kes).toFixed(2)}</td>
                          <td>
                            {payout.status === 'pending' ? (
                              <span className={`${styles.badge} ${styles.badgePending}`}>Pending</span>
                            ) : payout.status === 'completed' ? (
                              <span className={`${styles.badge} ${styles.badgeEarned}`}>Completed</span>
                            ) : (
                              <span className={`${styles.badge} ${styles.badgeFailed}`}>Failed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar Request Payout Form */}
          <div className={styles.payoutSection}>
            <h2 className={styles.tableTitle} style={{ marginBottom: 4 }}>Withdraw Earnings</h2>
            <p className={styles.sectionSub} style={{ marginBottom: 16 }}>Request a payout once you reach the minimum balance.</p>

            <div className={styles.infoBanner}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Payout Criteria</div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12 }}>
                <li>Minimum payout: <b>KES 1,000.00</b></li>
                <li>M-Pesa payments processed weekly</li>
                <li>Paid referrals cannot be requested twice</li>
              </ul>
            </div>

            {formError && <div className={styles.errorBanner}>{formError}</div>}
            {formSuccess && <div className={styles.successBanner}>{formSuccess}</div>}

            <form onSubmit={handlePayoutRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="details">
                  M-Pesa Phone / Payout Details
                </label>
                <input
                  type="text"
                  id="details"
                  required
                  placeholder="e.g. M-Pesa 0712345678"
                  className={styles.formInput}
                  value={paymentDetails}
                  onChange={e => setPaymentDetails(e.target.value)}
                  disabled={!canRequestPayout || payoutLoading}
                />
                <p className={styles.payoutHint}>
                  Enter the phone number or payment details where you'd like to receive your shillings.
                </p>
              </div>

              <button
                type="submit"
                className="btn btn--brass btn--full btn--lg"
                disabled={!canRequestPayout || payoutLoading || !paymentDetails.trim()}
              >
                {payoutLoading ? 'Submitting…' : `Request KES ${unpaidBalanceKes.toFixed(2)}`}
              </button>

              {!canRequestPayout && (
                <p className={styles.payoutHint} style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 500 }}>
                  You need KES {(1000 - unpaidBalanceKes).toFixed(2)} more to request a payout.
                </p>
              )}
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
