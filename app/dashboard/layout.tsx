'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './dashboard.module.css'

const navItems = [
  { href: '/dashboard',            label: 'Case',      icon: '◆' },
  { href: '/dashboard/analytics',  label: 'Analytics', icon: '↗' },
  { href: '/dashboard/billing',    label: 'Billing',   icon: '★' },
  { href: '/dashboard/affiliate',  label: 'Affiliate', icon: '🤝' },
  { href: '/dashboard/settings',   label: 'Settings',  icon: '⚙' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className={styles.shell}>
      {/* Sidebar (desktop) / Bottom nav (mobile) */}
      <nav className={styles.nav} aria-label="Dashboard navigation">
        <div className={styles.navBrand}>
          <span className={styles.wordmark}>Case</span>
        </div>
        <ul className={styles.navItems}>
          {navItems.map(item => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${
                  pathname === item.href ? styles.navItemActive : ''
                }`}
              >
                <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.navFooter}>
          <Link href="/dashboard/proof/new" className={styles.addBtn}>
            + Add proof
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className={styles.main}>
        {children}
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.bottomNavItem} ${
              pathname === item.href ? styles.bottomNavItemActive : ''
            }`}
          >
            <span className={styles.bottomNavIcon}>{item.icon}</span>
            <span className={styles.bottomNavLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
