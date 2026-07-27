import React from 'react'
import Link from 'next/link'
import styles from '@/app/dashboard/agency/nanny/nanny-dashboard.module.css'
import type { NannyWorker } from '@/lib/nanny-types'
import { getWorkerStateColor } from '@/lib/nanny-utils'
import ComplianceRing from './ComplianceRing'

interface WorkerCardProps {
  worker: NannyWorker
  href?: string
  complianceOk?: number
  complianceTotal?: number
}

const STATE_LABELS: Record<string, string> = {
  active: 'Active',
  vetted: 'Vetted',
  applicant: 'Applicant',
  on_break: 'On Break',
  suspended: 'Suspended',
  inactive: 'Inactive',
}

const BADGE_CLASSES: Record<string, string> = {
  active: styles.badgeActive,
  vetted: styles.badgeVetted,
  applicant: styles.badgeApplicant,
  on_break: styles.badgeOnBreak,
  suspended: styles.badgeSuspended,
  inactive: styles.badgeInactive,
}

const ROLE_LABELS: Record<string, string> = {
  nanny: 'Nanny',
  cleaner: 'Cleaner',
  maternity_nurse: 'Maternity Nurse',
  live_in: 'Live-in Carer',
  both: 'Nanny & Cleaner',
}

function StarRating({ value }: { value: number }) {
  const stars = Math.round(value * 2) / 2
  const full = Math.floor(stars)
  const half = stars % 1 !== 0
  return (
    <span className={styles.ratingStars} aria-label={`${value.toFixed(1)} stars`}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)))}
    </span>
  )
}

export default function WorkerCard({
  worker,
  href,
  complianceOk,
  complianceTotal,
}: WorkerCardProps) {
  const name =
    worker.profile?.display_name ?? worker.shadow_name ?? 'Unknown Worker'
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const badgeClass = BADGE_CLASSES[worker.worker_state] ?? styles.badgeInactive

  const inner = (
    <>
      <div className={styles.workerCardHead}>
        {worker.profile?.avatar_url ? (
          <img
            src={worker.profile.avatar_url}
            alt={name}
            className={styles.avatar}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>{initials}</div>
        )}

        <div className={styles.workerInfo}>
          <div className={styles.workerName}>{name}</div>
          <div className={styles.workerRole}>
            {ROLE_LABELS[worker.role_type] ?? worker.role_type}
          </div>
          <div className={styles.workerMeta} style={{ marginTop: 8 }}>
            <span className={`${styles.badge} ${badgeClass}`}>
              {STATE_LABELS[worker.worker_state] ?? worker.worker_state}
            </span>
            {worker.avg_rating != null && worker.avg_rating > 0 && (
              <span className={styles.rating}>
                <StarRating value={worker.avg_rating} />
                <span>{worker.avg_rating.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>

        {complianceTotal !== undefined && (
          <ComplianceRing
            ok={complianceOk ?? 0}
            total={complianceTotal}
            size={48}
            strokeWidth={4}
            showLabel={false}
          />
        )}
      </div>

      {worker.profile?.location_area && (
        <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
          📍 {worker.profile.location_area}
        </div>
      )}

      {worker.total_assignments > 0 && (
        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
          {worker.total_assignments} assignment
          {worker.total_assignments !== 1 ? 's' : ''}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={styles.workerCard}>
        {inner}
      </Link>
    )
  }

  return <div className={styles.workerCard}>{inner}</div>
}
