import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner, getClients } from '@/lib/nanny-data'
import styles from '../nanny-dashboard.module.css'

export const revalidate = 60

const TYPE_LABELS: Record<string, string> = {
  family:    'Family',
  individual:'Individual',
  corporate: 'Corporate',
  care_home: 'Care Home',
}

export default async function ClientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const orgs = await getNannyOrgsByOwner(profile.id)
  if (orgs.length === 0) redirect('/dashboard/agency/nanny/new')

  const org = orgs[0]
  const clients = await getClients(org.id)

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Clients</h1>
          <p className={styles.pageSubtitle}>
            {clients.length} client{clients.length !== 1 ? 's' : ''} in your system
          </p>
        </div>
      </div>

      <div className={styles.content}>
        {clients.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏠</div>
            <div className={styles.emptyTitle}>No clients yet</div>
            <p className={styles.emptyText}>
              Clients are automatically created when someone makes a booking through your agency.
            </p>
          </div>
        ) : (
          <>
            {/* Search / filters could be added here */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Since</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {client.client_name}
                        </div>
                        {client.details?.children?.length ? (
                          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                            {client.details.children.length} child
                            {client.details.children.length !== 1 ? 'ren' : ''}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            background: 'var(--aim-bg)',
                            color: 'var(--aim)',
                          }}
                        >
                          {TYPE_LABELS[client.client_type] ?? client.client_type}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {client.client_email ? (
                          <a
                            href={`mailto:${client.client_email}`}
                            style={{ color: 'var(--brass)' }}
                          >
                            {client.client_email}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--ink-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                        {client.client_phone ?? '—'}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            client.status === 'active'
                              ? styles.badgeActive
                              : client.status === 'suspended'
                              ? styles.badgeSuspended
                              : styles.badgeInactive
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                        {new Date(client.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}
