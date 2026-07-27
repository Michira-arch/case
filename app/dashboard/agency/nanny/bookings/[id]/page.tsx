import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getBookingById, updateBookingState } from '@/lib/nanny-data'
import styles from '../../nanny-dashboard.module.css'
import { revalidatePath } from 'next/cache'

export default async function BookingDetailsPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const booking = await getBookingById(params.id)
  if (!booking) notFound()

  // Server action to cancel booking
  async function handleCancel() {
    'use server'
    await updateBookingState(params.id, 'cancelled', 'Cancelled by agency')
    revalidatePath(`/dashboard/agency/nanny/bookings/${params.id}`)
  }

  // Server action to mark as completed
  async function handleComplete() {
    'use server'
    await updateBookingState(params.id, 'completed')
    revalidatePath(`/dashboard/agency/nanny/bookings/${params.id}`)
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <Link href="/dashboard/agency/nanny/bookings" className={styles.backLink || ''} style={{ fontSize: '14px', color: 'var(--ink-muted)', textDecoration: 'none' }}>
            ← Back to Bookings
          </Link>
          <h1 className={styles.pageTitle} style={{ marginTop: 8 }}>
            Booking Details
          </h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '12px', 
              fontWeight: 600,
              background: 'var(--brand-muted)',
              color: 'var(--brand)',
              textTransform: 'uppercase'
            }}>
              {booking.booking_state}
            </span>
            <span className={styles.pageSubtitle}>ID: {booking.id}</span>
          </div>
        </div>
        
        <div className={styles.pageActions}>
          {booking.booking_state !== 'cancelled' && booking.booking_state !== 'completed' && (
            <>
              <form action={handleCancel} style={{ display: 'inline-block' }}>
                <button className="btn btn--outline btn--sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                  Cancel Booking
                </button>
              </form>
              <form action={handleComplete} style={{ display: 'inline-block', marginLeft: '8px' }}>
                <button className="btn btn--dark btn--sm">
                  Mark Completed
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Client Information</h2>
            <div style={{ background: 'var(--card)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)' }}>
              <p style={{ margin: '0 0 8px' }}><strong>Name:</strong> {booking.client?.client_name || 'N/A'}</p>
              <p style={{ margin: '0 0 8px' }}><strong>Email:</strong> {booking.client?.client_email || 'N/A'}</p>
              <p style={{ margin: '0 0 8px' }}><strong>Phone:</strong> {booking.client?.client_phone || 'N/A'}</p>
              <p style={{ margin: 0 }}><strong>Type:</strong> {booking.client?.client_type || 'N/A'}</p>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Service Details</h2>
            <div style={{ background: 'var(--card)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)' }}>
              <p style={{ margin: '0 0 8px' }}><strong>Service Type:</strong> {booking.service_type?.name || 'N/A'}</p>
              <p style={{ margin: '0 0 8px' }}><strong>Start:</strong> {new Date(booking.scheduled_start).toLocaleString()}</p>
              <p style={{ margin: '0 0 8px' }}><strong>End:</strong> {new Date(booking.scheduled_end).toLocaleString()}</p>
              <p style={{ margin: '0 0 8px' }}><strong>Address:</strong> {booking.service_address}</p>
              {booking.service_notes && (
                <div style={{ marginTop: '12px' }}>
                  <strong>Notes:</strong>
                  <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', color: 'var(--ink-muted)' }}>
                    {booking.service_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className={styles.section} style={{ marginTop: '24px' }}>
          <h2 className={styles.sectionTitle}>Assignments</h2>
          {(!booking.assignments || booking.assignments.length === 0) ? (
            <div className={styles.emptyState} style={{ padding: '32px' }}>
              <p className={styles.emptyText}>No worker assigned yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {booking.assignments.map((assignment: any) => (
                <div key={assignment.id} style={{ background: 'var(--card)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px' }}>
                      {assignment.worker?.profile?.display_name || assignment.worker?.shadow_name || 'Worker'}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
                      State: {assignment.assignment_state} | Hourly Rate: ${assignment.hourly_rate}
                    </div>
                  </div>
                  <div>
                    {assignment.total_amount ? (
                      <span style={{ fontWeight: 600 }}>Total: ${assignment.total_amount}</span>
                    ) : (
                      <span style={{ color: 'var(--ink-muted)' }}>Hours: {assignment.hours_worked || 0}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}
