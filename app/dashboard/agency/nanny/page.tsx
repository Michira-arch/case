import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner, getNannyDashboardStats, getBookings } from '@/lib/nanny-data'
import NannyDashboard from '@/components/agency/NannyDashboard'
import BookingCard from '@/components/agency/BookingCard'
import styles from './nanny-dashboard.module.css'

export const revalidate = 60

export default async function NannyAgencyDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get the first agency for this owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const orgs = await getNannyOrgsByOwner(profile.id)
  if (orgs.length === 0) redirect('/dashboard/agency/nanny/new')

  const org = orgs[0]
  const [stats, recentBookings, actionInbox] = await Promise.all([
    getNannyDashboardStats(org.id),
    getBookings(org.id, { limit: 5 }),
    supabase.from('nanny_action_inbox').select('*').eq('org_id', org.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(3)
  ])

  const pendingActions = actionInbox.data || [];

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{org.name}</h1>
          <p className={styles.pageSubtitle}>
            {org.tagline ?? 'Agency dashboard overview'}
          </p>
        </div>
        <div className={styles.pageActions}>
          <Link
            href={`/agency/${org.slug}/nanny`}
            className="btn btn--outline btn--sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Public Page ↗
          </Link>
          <Link
            href="/dashboard/agency/nanny/bookings"
            className="btn btn--dark btn--sm"
          >
            + New Booking
          </Link>
        </div>
      </div>

      <div className={styles.content}>
        {/* Stats */}
        <NannyDashboard stats={stats} orgId={org.id} />

        {/* Action Inbox (Copilot) */}
        {pendingActions.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span style={{ marginRight: '8px' }}>✨</span>
                Copilot Suggestions
              </h2>
              <Link
                href="/dashboard/agency/nanny/copilot"
                className={styles.sectionLink}
              >
                Review Inbox →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingActions.map((action: any) => (
                <div key={action.id} style={{ 
                  background: 'var(--brand-muted)', 
                  border: '1px solid var(--brand)',
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brand)', margin: '0 0 4px 0' }}>{action.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>{action.message}</p>
                  </div>
                  <Link href="/dashboard/agency/nanny/copilot" className="btn btn--brass btn--sm">
                    Review
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Bookings */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Bookings</h2>
            <Link
              href="/dashboard/agency/nanny/bookings"
              className={styles.sectionLink}
            >
              View all →
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <div className={styles.emptyTitle}>No bookings yet</div>
              <p className={styles.emptyText}>
                Bookings will appear here once clients start requesting services.
              </p>
            </div>
          ) : (
            recentBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                href={`/dashboard/agency/nanny/bookings/${booking.id}`}
              />
            ))
          )}
        </div>

        {/* Quick actions */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>
            Quick Actions
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))',
              gap: 12,
            }}
          >
            {[
              {
                icon: '👤',
                label: 'Add Worker',
                sub: 'Shadow or invite',
                href: '/dashboard/agency/nanny/workers/new',
              },
              {
                icon: '📄',
                label: 'Review Credentials',
                sub: `${stats.pending_credentials} pending`,
                href: '/dashboard/agency/nanny/workers',
              },
              {
                icon: '💰',
                label: 'Create Invoice',
                sub: 'Bill a client',
                href: '/dashboard/agency/nanny/invoices',
              },
              {
                icon: '⚙',
                label: 'Settings',
                sub: 'Policy & services',
                href: '/dashboard/agency/nanny/settings',
              },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 18px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'box-shadow 200ms ease',
                }}
              >
                <span style={{ fontSize: 24 }}>{action.icon}</span>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: 'var(--ink)',
                    }}
                  >
                    {action.label}
                  </div>
                  <div
                    style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}
                  >
                    {action.sub}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
