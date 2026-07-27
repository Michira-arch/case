import React from 'react'
import Link from 'next/link'
import styles from '@/app/dashboard/agency/nanny/nanny-dashboard.module.css'
import type { NannyDashboardStats } from '@/lib/nanny-types'
import { formatCurrency } from '@/lib/nanny-utils'

interface NannyDashboardProps {
  stats: NannyDashboardStats
  orgId: string
}

function StatCard({
  label,
  value,
  delta,
  icon,
  iconClass,
  href,
}: {
  label: string
  value: React.ReactNode
  delta?: string
  icon: string
  iconClass: string
  href?: string
}) {
  const inner = (
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${iconClass}`} aria-hidden="true">
        {icon}
      </div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {delta && <div className={styles.statDelta}>{delta}</div>}
    </div>
  )

  return href ? (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

export default function NannyDashboard({ stats, orgId }: NannyDashboardProps) {
  const base = `/dashboard/agency/nanny`

  return (
    <div className={styles.statsGrid}>
      <StatCard
        label="Active Workers"
        value={stats.active_workers}
        icon="👥"
        iconClass={styles.statIconGreen}
        delta={`${stats.assignments_this_week} assignments this week`}
        href={`${base}/workers`}
      />
      <StatCard
        label="Open Bookings"
        value={stats.open_bookings}
        icon="📋"
        iconClass={styles.statIconAim}
        delta={`${stats.bookings_today} scheduled today`}
        href={`${base}/bookings`}
      />
      <StatCard
        label="Revenue MTD"
        value={formatCurrency(stats.revenue_mtd)}
        icon="💰"
        iconClass={styles.statIconBrass}
        href={`${base}/invoices`}
      />
      <StatCard
        label="Avg. Worker Rating"
        value={
          stats.avg_worker_rating > 0
            ? stats.avg_worker_rating.toFixed(1)
            : '—'
        }
        icon="⭐"
        iconClass={styles.statIconBrass}
        delta="of 5.0"
      />
      <StatCard
        label="Pending Credentials"
        value={stats.pending_credentials}
        icon="📄"
        iconClass={
          stats.pending_credentials > 0
            ? styles.statIconDanger
            : styles.statIconGreen
        }
        delta={
          stats.pending_credentials > 0
            ? 'Needs review'
            : 'All clear'
        }
        href={`${base}/workers`}
      />
      <StatCard
        label="Bookings Today"
        value={stats.bookings_today}
        icon="📅"
        iconClass={styles.statIconGreen}
        href={`${base}/bookings`}
      />
    </div>
  )
}
