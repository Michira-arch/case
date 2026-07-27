'use client'

import React from 'react'
import styles from '@/app/dashboard/agency/nanny/nanny-dashboard.module.css'
import type { CredentialStatus } from '@/lib/nanny-types'

interface CredentialBadgeProps {
  status: CredentialStatus | 'missing' | 'expiring_soon' | 'ok' | 'pending_review'
  label?: string
}

const CONFIG: Record<string, { icon: string; label: string; cls: string }> = {
  approved:     { icon: '✓', label: 'Approved',  cls: styles.credOk },
  ok:           { icon: '✓', label: 'OK',         cls: styles.credOk },
  missing:      { icon: '!', label: 'Missing',    cls: styles.credMissing },
  expired:      { icon: '✕', label: 'Expired',    cls: styles.credExpired },
  expiring_soon:{ icon: '⚠', label: 'Expiring',  cls: styles.credExpiring },
  pending:      { icon: '…', label: 'Pending',    cls: styles.credPending },
  pending_review:{ icon: '…', label: 'Review',   cls: styles.credPending },
  revoked:      { icon: '✕', label: 'Revoked',    cls: styles.credRevoked },
  rejected:     { icon: '✕', label: 'Rejected',   cls: styles.credRejected },
}

export default function CredentialBadge({ status, label }: CredentialBadgeProps) {
  const cfg = CONFIG[status] ?? { icon: '?', label: status, cls: '' }
  return (
    <span className={`${styles.credBadge} ${cfg.cls}`}>
      <span aria-hidden="true">{cfg.icon}</span>
      {label ?? cfg.label}
    </span>
  )
}
