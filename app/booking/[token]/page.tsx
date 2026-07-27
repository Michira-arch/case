import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import type { NannyBooking } from '@/lib/nanny-types'

interface Props {
  params: { token: string }
}

const STATE_INFO: Record<
  string,
  { icon: string; title: string; sub: string; color: string; bg: string }
> = {
  open: {
    icon: '🔍',
    title: 'Reviewing your request',
    sub: 'We have received your booking and are finding the best carer for you.',
    color: 'var(--aim)',
    bg: 'var(--aim-bg)',
  },
  matched: {
    icon: '🤝',
    title: 'Carer matched',
    sub: 'We found a carer for you. Confirming availability now.',
    color: 'var(--brass)',
    bg: 'var(--brass-bg)',
  },
  scheduled: {
    icon: '📅',
    title: 'Booking scheduled',
    sub: 'Your carer has been assigned and will arrive at the scheduled time.',
    color: 'var(--brass)',
    bg: 'var(--brass-bg)',
  },
  confirmed: {
    icon: '✅',
    title: 'Booking confirmed',
    sub: 'Your booking is confirmed. Your carer is looking forward to helping you.',
    color: 'var(--verified)',
    bg: 'var(--verified-bg)',
  },
  in_progress: {
    icon: '⏳',
    title: 'Service in progress',
    sub: 'Your carer has arrived and the session is underway.',
    color: 'var(--verified)',
    bg: 'var(--verified-bg)',
  },
  completed: {
    icon: '🎉',
    title: 'Service completed',
    sub: 'Your booking has been completed. Thank you for choosing our service.',
    color: 'var(--ink)',
    bg: 'var(--paper-light)',
  },
  cancelled: {
    icon: '❌',
    title: 'Booking cancelled',
    sub: 'This booking has been cancelled. Please contact us if you need help.',
    color: 'var(--danger)',
    bg: 'var(--danger-bg)',
  },
}

function Timeline({ state }: { state: string }) {
  const STEPS = ['open', 'matched', 'confirmed', 'in_progress', 'completed']
  const currentIdx = STEPS.indexOf(
    ['scheduled'].includes(state) ? 'matched' : state
  )

  if (state === 'cancelled') return null

  return (
    <div style={{ padding: '28px 0', display: 'flex', alignItems: 'center', gap: 0 }}>
      {STEPS.map((s, i) => {
        const done = i <= currentIdx
        const active = i === currentIdx
        return (
          <div
            key={s}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {/* connector */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {i > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: '50%',
                    height: 2,
                    background: done ? 'var(--verified)' : 'var(--line)',
                    top: 11,
                    zIndex: 0,
                  }}
                />
              )}
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    right: 0,
                    height: 2,
                    background: i < currentIdx ? 'var(--verified)' : 'var(--line)',
                    top: 11,
                    zIndex: 0,
                  }}
                />
              )}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: done ? 'var(--verified)' : 'var(--line)',
                  color: done ? 'white' : 'var(--ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  margin: '0 auto',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: active ? '0 0 0 4px var(--verified-bg)' : 'none',
                  transition: 'all 300ms ease',
                }}
              >
                {done ? '✓' : i + 1}
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: done ? 'var(--verified)' : 'var(--ink-muted)',
                marginTop: 6,
                textAlign: 'center',
                textTransform: 'capitalize',
              }}
            >
              {s.replace('_', ' ')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default async function BookingStatusPage({ params }: Props) {
  const supabase = createServiceClient()

  // Look up booking by anon_token on the client record
  const { data: clientRecord } = await supabase
    .from('nanny_clients')
    .select('id, org_id')
    .eq('anon_token', params.token)
    .single()

  if (!clientRecord) notFound()

  const { data: bookings } = await supabase
    .from('nanny_bookings')
    .select(`
      *,
      service_type:nanny_service_types(name),
      assignments:nanny_assignments(
        assignment_state, hourly_rate, hours_worked,
        worker:nanny_workers(
          shadow_name,
          profile:profiles(display_name, avatar_url)
        )
      )
    `)
    .eq('client_id', clientRecord.id)
    .order('created_at', { ascending: false })

  const booking = bookings?.[0] as NannyBooking | undefined

  if (!booking) notFound()

  const info = STATE_INFO[booking.booking_state] ?? STATE_INFO.open
  const activeAssignment = booking.assignments?.find(
    (a) => !['cancelled', 'no_show'].includes(a.assignment_state)
  )
  const workerName =
    activeAssignment?.worker?.profile?.display_name ??
    activeAssignment?.worker?.shadow_name ??
    null

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--paper)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 20px 64px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--ink)',
            }}
          >
            Case Agency
          </span>
        </div>

        {/* Status card */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow)',
          }}
        >
          {/* Status hero */}
          <div
            style={{
              background: info.bg,
              padding: '32px 28px 24px',
              textAlign: 'center',
              borderBottom: '1px solid var(--line-soft)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>{info.icon}</div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                fontWeight: 600,
                color: info.color,
                marginBottom: 8,
              }}
            >
              {info.title}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 340, margin: '0 auto' }}>
              {info.sub}
            </p>
          </div>

          {/* Timeline */}
          <div style={{ padding: '0 28px' }}>
            <Timeline state={booking.booking_state} />
          </div>

          {/* Booking details */}
          <div
            style={{
              padding: '0 28px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {[
              {
                label: 'Reference',
                value: booking.reference,
                mono: true,
              },
              {
                label: 'Service',
                value: booking.service_type?.name ?? 'Care Service',
              },
              {
                label: 'Date',
                value: new Date(booking.scheduled_start).toLocaleDateString(
                  'en-GB',
                  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                ),
              },
              {
                label: 'Time',
                value: `${new Date(booking.scheduled_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} – ${new Date(booking.scheduled_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
              },
              {
                label: 'Address',
                value: booking.service_address,
              },
              workerName
                ? { label: 'Your Carer', value: workerName }
                : null,
            ]
              .filter(Boolean)
              .map((item: any) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--line-soft)',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--ink-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      minWidth: 76,
                      paddingTop: 2,
                      flexShrink: 0,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: 'var(--ink)',
                      fontFamily: item.mono ? 'var(--font-mono)' : undefined,
                      fontWeight: item.label === 'Reference' ? 600 : 400,
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
          </div>

          {/* Notes */}
          {booking.service_notes && (
            <div
              style={{
                margin: '0 28px 28px',
                padding: '12px 16px',
                background: 'var(--paper-light)',
                borderRadius: 'var(--radius)',
                fontSize: 13.5,
                color: 'var(--ink-soft)',
              }}
            >
              <span style={{ fontWeight: 600 }}>Notes: </span>
              {booking.service_notes}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              padding: '16px 28px 24px',
              borderTop: '1px solid var(--line-soft)',
              fontSize: 13,
              color: 'var(--ink-muted)',
              textAlign: 'center',
            }}
          >
            Need help?{' '}
            <a
              href="mailto:support@case.app"
              style={{ color: 'var(--brass)', textDecoration: 'none' }}
            >
              Contact us
            </a>
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--ink-muted)',
            marginTop: 24,
          }}
        >
          Powered by{' '}
          <a href="/" style={{ color: 'var(--brass)', textDecoration: 'none' }}>
            Case
          </a>
        </p>
      </div>
    </div>
  )
}
