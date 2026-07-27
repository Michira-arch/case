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

export default function NannyAgencyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

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
