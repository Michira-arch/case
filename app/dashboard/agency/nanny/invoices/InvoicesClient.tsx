'use client'

import { useState } from 'react'
import styles from '../nanny-dashboard.module.css'
import type { NannyInvoice, InvoiceState } from '@/lib/nanny-types'
import { formatCurrency } from '@/lib/nanny-utils'

const TABS: { key: InvoiceState | 'all'; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'draft',    label: 'Draft' },
  { key: 'sent',     label: 'Sent' },
  { key: 'paid',     label: 'Paid' },
  { key: 'overdue',  label: 'Overdue' },
  { key: 'disputed', label: 'Disputed' },
]

const BADGE_CLASSES: Record<string, string> = {
  draft:    styles.badgeDraft,
  sent:     styles.badgeSent,
  viewed:   styles.badgeViewed,
  paid:     styles.badgePaid,
  overdue:  styles.badgeOverdue,
  voided:   styles.badgeVoided,
  disputed: styles.badgeDisputed,
}

interface Props {
  invoices: NannyInvoice[]
  currency: string
}

export default function InvoicesClient({ invoices, currency }: Props) {
  const [tab, setTab] = useState<InvoiceState | 'all'>('all')

  const filtered =
    tab === 'all' ? invoices : invoices.filter((i) => i.invoice_state === tab)

  const totalValue = filtered.reduce((s, i) => s + i.total, 0)

  return (
    <>
      {/* Summary */}
      <div className={styles.statsGrid} style={{ marginBottom: 24 }}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Invoices</div>
          <div className={styles.statValue}>{filtered.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Value</div>
          <div className={styles.statValue} style={{ fontSize: 22 }}>
            {formatCurrency(totalValue, currency)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Paid</div>
          <div className={styles.statValue} style={{ fontSize: 22, color: 'var(--verified)' }}>
            {formatCurrency(
              filtered
                .filter((i) => i.invoice_state === 'paid')
                .reduce((s, i) => s + i.total, 0),
              currency
            )}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Outstanding</div>
          <div className={styles.statValue} style={{ fontSize: 22, color: 'var(--danger)' }}>
            {formatCurrency(
              filtered
                .filter((i) =>
                  ['sent', 'viewed', 'overdue', 'disputed'].includes(i.invoice_state)
                )
                .reduce((s, i) => s + i.total, 0),
              currency
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((t) => {
          const count =
            t.key === 'all'
              ? invoices.length
              : invoices.filter((i) => i.invoice_state === t.key).length
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

      {/* Table */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💰</div>
          <div className={styles.emptyTitle}>No invoices</div>
          <p className={styles.emptyText}>
            {tab === 'all'
              ? 'No invoices have been created yet.'
              : `No ${tab} invoices.`}
          </p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Total</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12.5,
                        color: 'var(--brass)',
                      }}
                    >
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {inv.client?.client_name ?? '—'}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                    {new Date(inv.issued_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                    {new Date(inv.due_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(inv.total, inv.currency)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        BADGE_CLASSES[inv.invoice_state] ?? styles.badgeDraft
                      }`}
                    >
                      {inv.invoice_state}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn--outline btn--sm"
                      style={{ fontSize: 11, padding: '4px 8px' }}
                      onClick={(e) => {
                        e.preventDefault();
                        const url = `${window.location.origin}/invoice/${inv.id}`;
                        navigator.clipboard.writeText(url);
                        const btn = e.currentTarget;
                        btn.innerText = 'Copied!';
                        setTimeout(() => { btn.innerText = 'Copy Link'; }, 2000);
                      }}
                    >
                      Copy Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
