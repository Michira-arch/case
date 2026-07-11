'use client'

import Link from 'next/link'
import type { Profile, Subscription, AnalyticsSummary } from '@/lib/types'
import styles from './analytics.module.css'

interface Props {
  profile: Profile
  subscription: Subscription | null
  analytics: AnalyticsSummary | null
}

export default function AnalyticsDashboard({ profile, subscription, analytics }: Props) {
  const plan = subscription?.plan || 'free'
  const a = analytics

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Analytics</h1>
      <p className={styles.sub}>How your Case is performing</p>

      {/* Top stats */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Total profile views"
          value={a?.total_views ?? 0}
          sublabel="All time"
        />
        <StatCard
          label="Views this week"
          value={a?.views_7d ?? 0}
          sublabel="Last 7 days"
        />
        <StatCard
          label="Evidence taps"
          value={a?.evidence_taps ?? 0}
          sublabel="People explored your proof"
        />
        <StatCard
          label="Social link clicks"
          value={a?.social_clicks ?? 0}
          sublabel="Tap on your socials"
        />
      </div>

      {/* Sparkline */}
      {a?.sparkline && a.sparkline.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Daily views (last 7 days)</h2>
          <Sparkline data={a.sparkline} />
        </div>
      )}

      {/* Plus-only breakdown */}
      {plan === 'free' ? (
        <div className={styles.upgradePrompt}>
          <div className={styles.upgradeIcon}>↗</div>
          <h3>Unlock full analytics with Case+</h3>
          <p>See where your visitors come from (WhatsApp vs Google vs Instagram), device breakdown, and per-proof-item stats.</p>
          <Link href="/dashboard/billing" className="btn btn--brass">
            Upgrade to Case+ — KES 70
          </Link>
        </div>
      ) : (
        <>
          {a?.referrers && a.referrers.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Where visitors come from</h2>
              <div className={styles.barList}>
                {a.referrers.map((r: any) => (
                  <div key={r.host} className={styles.barItem}>
                    <span className={styles.barLabel}>{r.host || 'Direct / unknown'}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${Math.round((r.count / (a.total_views || 1)) * 100)}%`
                        }}
                      />
                    </div>
                    <span className={styles.barCount}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {a?.device_split && a.device_split.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Visitor devices</h2>
              <div className={styles.deviceGrid}>
                {a.device_split.map((d: any) => (
                  <div key={d.device} className={styles.deviceCard}>
                    <span className={styles.deviceName}>{d.device || 'Unknown'}</span>
                    <span className={styles.deviceCount}>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className={styles.privacyNote}>
        🔒 Analytics are aggregate only — no individual visitor tracking, no IP stored.
      </p>
    </div>
  )
}

function StatCard({ label, value, sublabel }: { label: string; value: number; sublabel: string }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statValue}>{value.toLocaleString()}</span>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statSub}>{sublabel}</span>
    </div>
  )
}

function Sparkline({ data }: { data: { date: string; views: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.views), 1)

  return (
    <div className={styles.sparkline}>
      {data.map((d, i) => (
        <div key={i} className={styles.sparkBar}>
          <div
            className={styles.sparkFill}
            style={{ height: `${Math.max(4, (d.views / maxVal) * 80)}px` }}
            title={`${d.date}: ${d.views} views`}
          />
          <span className={styles.sparkLabel}>
            {new Date(d.date).toLocaleDateString('en-KE', { weekday: 'short' })}
          </span>
        </div>
      ))}
    </div>
  )
}
