import React from 'react'
import Link from 'next/link'
import styles from '@/app/dashboard/agency/nanny/nanny-dashboard.module.css'
import type { NannyBooking } from '@/lib/nanny-types'

interface BookingCardProps {
  booking: NannyBooking
  href?: string
}

const STATE_LABELS: Record<string, string> = {
  open: 'Open',
  matched: 'Matched',
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  closed: 'Closed',
}

const BADGE_CLASSES: Record<string, string> = {
  open: styles.badgeOpen,
  matched: styles.badgeMatched,
  scheduled: styles.badgeScheduled,
  confirmed: styles.badgeConfirmed,
  in_progress: styles.badgeInProgress,
  completed: styles.badgeCompleted,
  cancelled: styles.badgeCancelled,
  closed: styles.badgeClosed,
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BookingCard({ booking, href }: BookingCardProps) {
  const activeAssignment = booking.assignments?.find(
    (a) => !['cancelled', 'no_show'].includes(a.assignment_state)
  )
  const workerName =
    activeAssignment?.worker?.profile?.display_name ??
    activeAssignment?.worker?.shadow_name ??
    null

  const badgeClass =
    BADGE_CLASSES[booking.booking_state] ?? styles.badgeCompleted

  const inner = (
    <>
      {/* State badge */}
      <div style={{ flexShrink: 0 }}>
        <span className={`${styles.badge} ${badgeClass}`}>
          {STATE_LABELS[booking.booking_state] ?? booking.booking_state}
        </span>
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.bookingClient}>
          {booking.client?.client_name ?? 'Unknown client'}
        </div>
        <div className={styles.bookingDate}>
          {fmt(booking.scheduled_start)} →{' '}
          {new Date(booking.scheduled_end).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        {booking.service_type && (
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
            {booking.service_type.name}
          </div>
        )}
      </div>

      {/* Worker */}
      {workerName && (
        <div className={styles.bookingWorker} style={{ flexShrink: 0 }}>
          <span style={{ fontSize: 16 }}>👤</span>
          <span>{workerName}</span>
        </div>
      )}

      {/* Reference */}
      <div className={styles.bookingRef} style={{ flexShrink: 0 }}>
        {booking.reference}
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={styles.bookingCard}>
        {inner}
      </Link>
    )
  }

  return <div className={styles.bookingCard}>{inner}</div>
}
