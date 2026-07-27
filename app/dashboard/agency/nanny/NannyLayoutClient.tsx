'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './nanny-dashboard.module.css'

const NAV_ITEMS = [
  { href: '/dashboard/agency/nanny',          label: 'Dashboard', icon: '◆' },
  { href: '/dashboard/agency/nanny/bookings', label: 'Bookings',  icon: '📋' },
  { href: '/dashboard/agency/nanny/workers',  label: 'Workers',   icon: '👥' },
  { href: '/dashboard/agency/nanny/clients',  label: 'Clients',   icon: '🏠' },
  { href: '/dashboard/agency/nanny/invoices', label: 'Invoices',  icon: '💰' },
  { href: '/dashboard/agency/nanny/billing',  label: 'Billing',   icon: '💳' },
  { href: '/dashboard/agency/nanny/settings', label: 'Settings',  icon: '⚙' },
]

export default function NannyLayoutClient({
  children,
  org
}: {
  children: React.ReactNode
  org: any
}) {
  const pathname = usePathname()

  let isLocked = false
  let lockReason = ''

  if (org) {
    const now = new Date()
    const createdAt = new Date(org.created_at)
    const gracePeriodEnd = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000)

    if (org.billing_status === 'suspended') {
      isLocked = true
      lockReason = 'Your account is suspended. Please renew your subscription to continue.'
    } else if (org.billing_plan === 'free' || !org.billing_plan) {
      if (now > gracePeriodEnd) {
        isLocked = true
        lockReason = 'Your 3-day setup period has ended. Start your 14-day free trial to continue using the platform.'
      }
    } else if (org.billing_status === 'trial') {
      if (org.next_billing_date && now > new Date(org.next_billing_date)) {
        isLocked = true
        lockReason = 'Your 14-day free trial has expired. Please subscribe to a plan to continue.'
      }
    }
  }

  const isBillingPage = pathname === '/dashboard/agency/nanny/billing'
  
  if (isLocked && !isBillingPage) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--paper)', padding: 20 }}>
        <div style={{ background: 'var(--card)', padding: '40px', borderRadius: 'var(--radius-lg)', textAlign: 'center', maxWidth: 500, boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>Setup Complete!</h1>
          <p style={{ color: 'var(--ink-muted)', marginBottom: '32px', lineHeight: 1.5 }}>
            {lockReason}
          </p>
          <Link href="/dashboard/agency/nanny/billing" className="btn btn--dark" style={{ width: '100%', justifyContent: 'center' }}>
            Go to Billing & Subscriptions
          </Link>
        </div>
      </div>
    )
  }

  const isActive = (href: string) => {
    if (href === '/dashboard/agency/nanny') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandTop}>
            <div className={styles.brandIcon}>❤️</div>
            <div>
              <div className={styles.wordmark}>Agency</div>
              <div className={styles.wordmarkSub}>CAREGIVING</div>
            </div>
          </div>
        </div>

        <nav className={styles.navSection} aria-label="Agency navigation">
          <div className={styles.navLabel}>Main</div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon} aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Case
          </Link>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <main className={styles.main}>{children}</main>

      {/* ── Bottom nav (mobile) ───────────────────────────── */}
      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.bottomNavItem} ${isActive(item.href) ? styles.bottomNavItemActive : ''}`}
          >
            <span className={styles.bottomNavIcon} aria-hidden="true">
              {item.icon}
            </span>
            <span className={styles.bottomNavLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
