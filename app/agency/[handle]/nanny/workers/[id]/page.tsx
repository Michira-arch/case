import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getWorkerById, getWorkerRatings, getWorkerCredentials } from '@/lib/nanny-data'

interface Props {
  params: { handle: string; id: string }
}

export async function generateMetadata({ params }: Props) {
  const worker = await getWorkerById(params.id)
  if (!worker) return { title: 'Worker not found' }
  const name =
    worker.profile?.display_name ?? worker.shadow_name ?? 'Care Worker'
  return {
    title: `${name} — Care Professional`,
    description: `Book ${name}, a verified care professional.`,
  }
}

function StarRow({ value, count }: { value: number; count: number }) {
  const full = Math.floor(value)
  const half = value % 1 >= 0.5
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--brass)', fontSize: 18, letterSpacing: 2 }}>
        {'★'.repeat(full)}
        {half ? '½' : ''}
        {'☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)))}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-soft)' }}>
        {value.toFixed(1)} ({count})
      </span>
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  nanny: 'Nanny',
  cleaner: 'Cleaner',
  maternity_nurse: 'Maternity Nurse',
  live_in: 'Live-in Carer',
  both: 'Nanny & Cleaner',
}

const CRED_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  approved:  { bg: 'var(--verified-bg)', color: 'var(--verified)', icon: '✓' },
  pending:   { bg: 'var(--aim-bg)',      color: 'var(--aim)',      icon: '…' },
  rejected:  { bg: 'var(--danger-bg)',   color: 'var(--danger)',   icon: '✕' },
  expired:   { bg: 'var(--danger-bg)',   color: 'var(--danger)',   icon: '!' },
  revoked:   { bg: 'var(--danger-bg)',   color: 'var(--danger)',   icon: '✕' },
}

export default async function PublicWorkerProfilePage({ params }: Props) {
  const [worker, ratings, credentials] = await Promise.all([
    getWorkerById(params.id),
    getWorkerRatings(params.id),
    getWorkerCredentials(params.id),
  ])

  if (!worker) notFound()

  // Only show approved credentials publicly
  const verifiedCreds = credentials.filter((c) => c.status === 'approved')
  const name =
    worker.profile?.display_name ?? worker.shadow_name ?? 'Care Professional'
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const avgRating =
    ratings.length > 0
      ? ratings.reduce((s, r) => s + r.overall, 0) / ratings.length
      : null

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--paper)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Back nav */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--line-soft)',
          background: 'var(--card)',
        }}
      >
        <Link
          href={`/agency/${params.handle}/nanny`}
          style={{ fontSize: 13.5, color: 'var(--ink-muted)', textDecoration: 'none' }}
        >
          ← Back to agency
        </Link>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 64px' }}>
        {/* Profile card */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 24,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            {/* Avatar */}
            {worker.profile?.avatar_url ? (
              <img
                src={worker.profile.avatar_url}
                alt={name}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  boxShadow: 'var(--shadow)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: 'var(--brass-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 36,
                  fontWeight: 600,
                  color: 'var(--brass-deep)',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 26,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginBottom: 6,
                }}
              >
                {name}
              </h1>

              <div
                style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}
              >
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
              </div>

              {avgRating !== null && (
                <StarRow value={avgRating} count={ratings.length} />
              )}

              {/* Case portfolio link */}
              {worker.profile?.handle && (
                <a
                  href={`https://case.app/@${worker.profile.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 14,
                    padding: '6px 14px',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 13,
                    color: 'var(--ink-soft)',
                    textDecoration: 'none',
                    background: 'var(--paper-light)',
                    transition: 'border-color 150ms ease',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span>◆</span>
                  case.app/@{worker.profile.handle}
                </a>
              )}
            </div>

            {/* Book CTA */}
            <Link
              href={`/agency/${params.handle}/nanny/book`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--brass)',
                color: '#2A1D0C',
                padding: '12px 24px',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 700,
                fontSize: 15,
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              Book Now →
            </Link>
          </div>

          {/* Stats strip */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 28,
              paddingTop: 24,
              borderTop: '1px solid var(--line-soft)',
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Assignments', value: worker.total_assignments },
              {
                label: 'Verified Credentials',
                value: verifiedCreds.length,
              },
              {
                label: 'Hourly Rate',
                value: worker.hourly_rate
                  ? `KES ${worker.hourly_rate.toLocaleString()}`
                  : '—',
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 22,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    lineHeight: 1.2,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Credentials */}
        {verifiedCreds.length > 0 && (
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  background: 'var(--verified-bg)',
                  color: 'var(--verified)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 10px',
                  fontSize: 13,
                }}
              >
                ✓ Verified
              </span>
              Credentials
            </h2>
            <div>
              {verifiedCreds.map((cred) => {
                const cfg = CRED_STYLES[cred.status] ?? CRED_STYLES.approved
                return (
                  <div
                    key={cred.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--line-soft)',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: cfg.bg,
                        color: cfg.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}
                      >
                        {cred.credential_type?.name ?? 'Credential'}
                      </div>
                      {cred.issuing_body && (
                        <div
                          style={{ fontSize: 12, color: 'var(--ink-muted)' }}
                        >
                          {cred.issuing_body}
                        </div>
                      )}
                    </div>
                    {cred.expiry_date && (
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          color: 'var(--ink-muted)',
                        }}
                      >
                        exp {new Date(cred.expiry_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Availability */}
        {worker.availability.days.length > 0 && (
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: 14,
              }}
            >
              Availability
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map(
                (day) => {
                  const active = worker.availability.days.includes(day)
                  return (
                    <span
                      key={day}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background: active ? 'var(--verified-bg)' : 'var(--line-soft)',
                        color: active ? 'var(--verified)' : 'var(--ink-muted)',
                      }}
                    >
                      {day}
                    </span>
                  )
                }
              )}
            </div>
            {worker.availability.start_time && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 13.5,
                  color: 'var(--ink-soft)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {worker.availability.start_time} – {worker.availability.end_time}
              </div>
            )}
          </div>
        )}

        {/* Public Reviews */}
        {ratings.length > 0 && (
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: 16,
              }}
            >
              Client Reviews
            </h2>
            {ratings.slice(0, 5).map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '16px 0',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--aim-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--aim)',
                    }}
                  >
                    {(r.reviewer_name ?? 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {r.reviewer_name ?? 'Anonymous'}
                    </div>
                    <div style={{ color: 'var(--brass)', fontSize: 12 }}>
                      {'★'.repeat(r.overall)}
                      {'☆'.repeat(5 - r.overall)}
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      color: 'var(--ink-muted)',
                    }}
                  >
                    {new Date(r.created_at).toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                {r.review_text && (
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--ink-soft)',
                      lineHeight: 1.6,
                    }}
                  >
                    {r.review_text}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Final CTA */}
        <div
          style={{
            marginTop: 32,
            padding: '32px',
            background: 'var(--ink)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            color: 'var(--paper)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Book {name.split(' ')[0]} today
          </p>
          <Link
            href={`/agency/${params.handle}/nanny/book`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--brass)',
              color: '#2A1D0C',
              padding: '13px 28px',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            Book Now →
          </Link>
        </div>
      </div>
    </div>
  )
}
