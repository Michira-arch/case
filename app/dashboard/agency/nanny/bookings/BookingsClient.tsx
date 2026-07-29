'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../nanny-dashboard.module.css'
import type { NannyBooking, BookingState } from '@/lib/nanny-types'
import BookingCard from '@/components/agency/BookingCard'

const TABS: { key: BookingState | 'all'; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'open',        label: 'Open' },
  { key: 'confirmed',   label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'cancelled',   label: 'Cancelled' },
]

interface Props {
  bookings: NannyBooking[]
}

export default function BookingsClient({ bookings }: Props) {
  const [tab, setTab] = useState<BookingState | 'all'>('all')

  const STATE_ORDER: Record<string, number> = {
    open: 1,
    scheduled: 2,
    matched: 3,
    confirmed: 4,
    in_progress: 5,
    completed: 6,
    closed: 7,
    cancelled: 8,
  }

  const filtered = (tab === 'all' ? bookings : bookings.filter((b) => b.booking_state === tab))
    .sort((a, b) => {
      const stateDiff = (STATE_ORDER[a.booking_state] ?? 99) - (STATE_ORDER[b.booking_state] ?? 99)
      if (stateDiff !== 0) return stateDiff
      return new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime()
    })

  return (
    <>
      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((t) => {
          const count =
            t.key === 'all'
              ? bookings.length
              : bookings.filter((b) => b.booking_state === t.key).length
          return (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {count > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    background: tab === t.key ? 'var(--brass)' : 'var(--line)',
                    color: tab === t.key ? '#2A1D0C' : 'var(--ink-muted)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <div className={styles.emptyTitle}>No bookings</div>
          <p className={styles.emptyText}>
            {tab === 'all'
              ? 'No bookings have been created yet.'
              : `No bookings with status "${tab}" found.`}
          </p>
        </div>
      ) : (
        filtered.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            href={`/dashboard/agency/nanny/bookings/${booking.id}`}
          />
        ))
      )}
    </>
  )
}
