import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getWorkerById,
  getWorkerCredentials,
  getNannyOrgsByOwner,
  getBookings,
} from '@/lib/nanny-data'
import styles from '../../nanny-dashboard.module.css'
import CredentialBadge from '@/components/agency/CredentialBadge'
import ComplianceRing from '@/components/agency/ComplianceRing'
import WorkerStateControl from './WorkerStateControl'
import CredentialActions from './CredentialActions'

interface Props {
  params: { id: string }
}

const ROLE_LABELS: Record<string, string> = {
  caregiver:        'Caregiver',
  senior_caregiver: 'Senior Caregiver',
  patient_care:     'Patient Care',
  nanny:            'Nanny',
  cleaner:          'Cleaner',
  maternity_nurse:  'Maternity Nurse',
  live_in:          'Live-in Carer',
  both:             'Nanny & Cleaner',
  all:              'All Roles',
}

const BOOKING_STATE_LABELS: Record<string, string> = {
  confirmed:   'Confirmed',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
}

export default async function WorkerDetailPage({ params }: Props) {
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

  const [worker, allCreds] = await Promise.all([
    getWorkerById(params.id),
    getWorkerCredentials(params.id),
  ])

  if (!worker || worker.org_id !== org.id) notFound()

  const name =
    worker.profile?.display_name ?? worker.shadow_name ?? 'Unknown Worker'
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const okCreds = allCreds.filter((c) => c.status === 'approved').length
  const totalCreds = allCreds.length

  // Pending credential count for notice
  const pendingCount = allCreds.filter((c) => c.status === 'pending').length

  // Get recent assignments for this worker via bookings
  const allBookings = await getBookings(org.id, { limit: 50 })
  const workerBookings = allBookings.filter((b) =>
    b.assignments?.some((a) => a.worker_id === params.id)
  )

  return (
    <>
      {/* Header */}
      <div className={styles.detailHeader}>
        {worker.profile?.avatar_url ? (
          <img
            src={worker.profile.avatar_url}
            alt={name}
            className={styles.detailAvatar}
          />
        ) : (
          <div className={styles.detailAvatarPlaceholder}>{initials}</div>
        )}

        <div className={styles.detailInfo}>
          <h1 className={styles.detailName}>{name}</h1>
          <div className={styles.detailMeta}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink-soft)',
              }}
            >
              {ROLE_LABELS[worker.role_type] ?? worker.role_type}
            </span>
            {worker.profile?.location_area && (
              <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                📍 {worker.profile.location_area}
              </span>
            )}
            {worker.avg_rating != null && (
              <span style={{ fontSize: 13, color: 'var(--brass)' }}>
                ★ {worker.avg_rating.toFixed(1)}
              </span>
            )}
          </div>

          {worker.profile?.handle && (
            <a
              href={`https://case.app/@${worker.profile.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 12,
                padding: '5px 12px',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-full)',
                fontSize: 12.5,
                color: 'var(--ink-soft)',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)',
                background: 'var(--paper-light)',
              }}
            >
              ◆ case.app/@{worker.profile.handle}
            </a>
          )}
        </div>

        <div className={styles.detailActions}>
          <ComplianceRing ok={okCreds} total={totalCreds} size={56} />
        </div>
      </div>

      <div className={styles.content}>
        {/* Pending notice */}
        {pendingCount > 0 && (
          <div className={`${styles.notice} ${styles.noticeWarning}`}>
            ⚠ {pendingCount} credential{pendingCount !== 1 ? 's' : ''} pending
            review.
          </div>
        )}

        {/* State control + quick stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) auto',
            gap: 20,
            marginBottom: 28,
            alignItems: 'start',
          }}
        >
          {/* Quick stats */}
          <div
            className={styles.formSection}
            style={{ margin: 0, padding: '20px 24px' }}
          >
            <div className={styles.infoGrid}>
              {[
                { key: 'Worker ID',       val: worker.id.slice(0, 8) + '…' },
                { key: 'State',           val: worker.worker_state },
                { key: 'Assignments',     val: String(worker.total_assignments) },
                { key: 'Hourly Rate',     val: worker.hourly_rate ? `KES ${worker.hourly_rate.toLocaleString()}` : '—' },
                { key: 'Email',           val: worker.shadow_email ?? worker.profile?.handle ?? '—' },
                { key: 'Phone',           val: worker.shadow_phone ?? '—' },
              ].map(({ key, val }) => (
                <div key={key} className={styles.infoItem}>
                  <div className={styles.infoKey}>{key}</div>
                  <div
                    className={styles.infoValue}
                    style={{ fontFamily: key === 'Worker ID' ? 'var(--font-mono)' : undefined }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* State control */}
          <WorkerStateControl workerId={params.id} currentState={worker.worker_state} />
        </div>

        {/* Credentials Checklist */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Credentials ({okCreds}/{totalCreds} verified)
            </h2>
          </div>

          {allCreds.length === 0 ? (
            <div
              className={styles.tableWrap}
              style={{ padding: '32px', textAlign: 'center' }}
            >
              <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
                No credentials on file.
              </p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <div className={styles.credList} style={{ padding: '0 20px' }}>
                {allCreds.map((cred) => (
                  <div key={cred.id} className={styles.credItem}>
                    <CredentialBadge status={cred.status} />
                    <div className={styles.credName}>
                      {cred.credential_type?.name ?? 'Credential'}
                    </div>
                    {cred.issuing_body && (
                      <div
                        style={{ fontSize: 12, color: 'var(--ink-muted)' }}
                      >
                        {cred.issuing_body}
                      </div>
                    )}
                    {cred.expiry_date && (
                      <div className={styles.credExpiry}>
                        exp{' '}
                        {new Date(cred.expiry_date).toLocaleDateString('en-GB', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                    {cred.status === 'pending' && (
                      <CredentialActions credentialId={cred.id} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assignment History */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Assignment History</h2>
          </div>

          {workerBookings.length === 0 ? (
            <div className={styles.emptyState} style={{ padding: '40px 24px' }}>
              <div className={styles.emptyIcon}>📋</div>
              <p className={styles.emptyText}>No assignments yet.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workerBookings.slice(0, 20).map((b) => {
                    const assignment = b.assignments?.find(
                      (a) => a.worker_id === params.id
                    )
                    return (
                      <tr
                        key={b.id}
                        className={styles.tableRow}
                        onClick={() =>
                          (window.location.href = `/dashboard/agency/nanny/bookings/${b.id}`)
                        }
                      >
                        <td>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                              color: 'var(--ink-muted)',
                            }}
                          >
                            {b.reference}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {b.client?.client_name ?? '—'}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                          {new Date(b.scheduled_start).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {b.service_type?.name ?? '—'}
                        </td>
                        <td>
                          {assignment && (
                            <span
                              className={`${styles.badge} ${
                                assignment.assignment_state === 'completed'
                                  ? styles.badgeCompleted
                                  : assignment.assignment_state === 'in_progress'
                                  ? styles.badgeInProgress
                                  : styles.badgeMatched
                              }`}
                            >
                              {assignment.assignment_state.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
