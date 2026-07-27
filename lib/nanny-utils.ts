/**
 * Pure formatting and status color utility functions for Nanny Agency
 * Safe to import in both Client and Server components
 */

export function formatCurrency(amount: number, currency = 'KES'): string {
  if (currency === 'KES') {
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function getComplianceColor(status: string): string {
  switch (status) {
    case 'ok': return 'var(--verified)'
    case 'expiring_soon': return 'var(--warning)'
    case 'missing':
    case 'expired':
    case 'revoked': return 'var(--danger)'
    case 'pending_review': return 'var(--aim)'
    default: return 'var(--ink-muted)'
  }
}

export function getWorkerStateColor(state: string): string {
  switch (state) {
    case 'active': return 'var(--verified)'
    case 'vetted': return 'var(--brass)'
    case 'applicant': return 'var(--aim)'
    case 'on_break': return 'var(--ink-muted)'
    case 'suspended': return 'var(--danger)'
    case 'inactive': return 'var(--ink-muted)'
    default: return 'var(--ink-muted)'
  }
}

export function getBookingStateColor(state: string): string {
  switch (state) {
    case 'open': return 'var(--aim)'
    case 'matched': return 'var(--brass)'
    case 'scheduled': return 'var(--brass)'
    case 'confirmed': return 'var(--verified)'
    case 'in_progress': return 'var(--verified)'
    case 'completed': return 'var(--ink-muted)'
    case 'cancelled': return 'var(--danger)'
    default: return 'var(--ink-muted)'
  }
}
