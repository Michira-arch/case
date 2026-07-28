import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getBookingById, updateBookingState, getWorkers, assignWorkerToBooking, completeAssignment } from '@/lib/nanny-data'
import { sendEmail } from '@/lib/email'
import styles from '../../nanny-dashboard.module.css'
import { revalidatePath } from 'next/cache'

export default async function BookingDetailsPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const booking = await getBookingById(params.id)
  if (!booking) notFound()

  // Fetch active workers for this org to show in the pool
  const workers = await getWorkers(booking.org_id, 'active')

  // Server action to cancel booking
  async function handleCancel() {
    'use server'
    await updateBookingState(params.id, 'cancelled', 'Cancelled by agency')
    revalidatePath(`/dashboard/agency/nanny/bookings/${params.id}`)
  }


  // Server action to manually complete an assignment with overridden hours
  async function handleCompleteAssignment(formData: FormData) {
    'use server'
    const assignmentId = formData.get('assignment_id') as string
    const hours = formData.get('hours_worked')
    await completeAssignment(assignmentId, hours ? Number(hours) : undefined)
    
    // Fetch the generated invoice and client email to send the paywall link
    const supabase = createClient()
    const { data: invoice } = await supabase
      .from('nanny_invoices')
      .select('id, nanny_clients(client_name, client_email)')
      .eq('assignment_id', assignmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    if (invoice && invoice.nanny_clients?.client_email) {
      const paywallUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoice/${invoice.id}`
      await sendEmail({
        to: invoice.nanny_clients.client_email,
        fromName: 'Case+ Billing',
        subject: `Invoice for Completed Booking: ${invoice.nanny_clients.client_name}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #111827; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Case+</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Secure Payment Portal</p>
            </div>
            
            <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-bottom: 16px;">Hello ${invoice.nanny_clients.client_name},</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Your recent booking has been successfully completed. An invoice has been generated for the caregiving services provided.
            </p>
            
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${paywallUrl}" style="display: inline-block; padding: 14px 28px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; width: 80%; text-align: center;">
                View & Pay Invoice
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin-bottom: 24px;" />
            
            <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center;">
              This is an automated message from Case+ Billing.<br>
              If you have any questions regarding this invoice, please reply directly to this email.
            </p>
          </div>
        `
      })
    }

    revalidatePath(`/dashboard/agency/nanny/bookings/${params.id}`)
  }

  // Server action to manually assign a worker
  async function handleAssign(formData: FormData) {
    'use server'
    const workerId = formData.get('worker_id') as string
    const rate = Number(formData.get('rate')) || 15
    await assignWorkerToBooking(params.id, workerId, rate)
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

            </>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          
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
                    {assignment.assignment_state !== 'completed' && assignment.assignment_state !== 'cancelled' ? (
                      <form action={handleCompleteAssignment} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="hidden" name="assignment_id" value={assignment.id} />
                        <input 
                          type="number" 
                          name="hours_worked" 
                          placeholder="Hours" 
                          step="0.25" 
                          min="0"
                          style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)' }} 
                        />
                        <button className="btn btn--dark btn--sm">Complete</button>
                      </form>
                    ) : assignment.total_amount ? (
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

        {booking.booking_state !== 'completed' && booking.booking_state !== 'cancelled' && (
          <div className={styles.section} style={{ marginTop: '24px' }}>
            <h2 className={styles.sectionTitle}>Worker Pool (Manual Assignment)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {workers.map((worker: any) => (
                <div key={worker.id} style={{ background: 'var(--card)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>
                      {worker.profile?.avatar_url ? <img src={worker.profile.avatar_url} style={{width:'100%', height:'100%', objectFit: 'cover'}} alt="" /> : '👤'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>
                        {worker.profile?.display_name || worker.shadow_name || 'Worker'}
                      </h3>
                      <div style={{ fontSize: '13px', color: 'var(--ink-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                        ⭐ {worker.avg_rating || 'New'}
                        {worker.profile?.handle && (
                          <a href={`/@${worker.profile.handle}`} target="_blank" rel="noreferrer" style={{ color: 'var(--aim)', textDecoration: 'none', fontWeight: 500 }}>
                            Portfolio ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <form action={handleAssign}>
                    <input type="hidden" name="worker_id" value={worker.id} />
                    <input type="hidden" name="rate" value={worker.hourly_rate || booking.quoted_rate || 15} />
                    <button className="btn btn--sm btn--outline">Assign</button>
                  </form>
                </div>
              ))}
              {workers.length === 0 && (
                <div style={{ color: 'var(--ink-muted)', fontSize: 14 }}>No active workers found in the pool.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
