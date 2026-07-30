import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import styles from '../dashboard.module.css'

export default async function ClientDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, persona')
    .eq('owner_id', user.id)
    .single()

  if (!profile || profile.persona !== 'client') {
    redirect('/dashboard')
  }

  // Fetch client records
  const { data: clients } = await supabase
    .from('nanny_clients')
    .select('id')
    .eq('profile_id', profile.id)

  const clientIds = clients?.map((c: any) => c.id) || []
  
  let upcomingBookings: any[] = []
  let pastBookings: any[] = []
  let pendingInvoices: any[] = []

  if (clientIds.length > 0) {
    const { data: bookings } = await supabase
      .from('nanny_bookings')
      .select('*, service_type:nanny_service_types(name)')
      .in('client_id', clientIds)
      .order('scheduled_start', { ascending: true })

    const now = new Date().toISOString()
    
    if (bookings) {
      upcomingBookings = bookings.filter((b: any) => b.scheduled_start > now && b.booking_state !== 'cancelled')
      pastBookings = bookings.filter((b: any) => b.scheduled_start <= now || b.booking_state === 'cancelled')
    }

    const { data: invoices } = await supabase
      .from('nanny_invoices')
      .select('*')
      .in('client_id', clientIds)
      .eq('invoice_state', 'sent')
      .order('due_at', { ascending: true })

    if (invoices) {
      pendingInvoices = invoices
    }
  }

  return (
    <div className={styles.dashboardContainer} style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Welcome back, {profile.display_name}</h1>
        <p style={{ color: '#666' }}>Manage your bookings and invoices from your dashboard.</p>
      </header>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Pending Invoices</h2>
        {pendingInvoices.length === 0 ? (
          <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ color: '#666', margin: 0 }}>No pending invoices.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {pendingInvoices.map((inv) => (
              <div key={inv.id} style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>{inv.invoice_number}</h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Due: {new Date(inv.due_at).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 600, margin: '0 0 0.25rem 0' }}>{inv.currency} {inv.total}</p>
                  <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '999px' }}>Action Required</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Upcoming Bookings</h2>
        {upcomingBookings.length === 0 ? (
          <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ color: '#666', margin: 0 }}>You don't have any upcoming bookings.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {upcomingBookings.map((b) => (
              <div key={b.id} style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{b.service_type?.name || 'Service Booking'}</h3>
                  <span style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '999px' }}>{b.booking_state}</span>
                </div>
                <p style={{ margin: '0 0 0.5rem 0', color: '#444' }}>
                  <strong>Start:</strong> {new Date(b.scheduled_start).toLocaleString()}<br />
                  <strong>End:</strong> {new Date(b.scheduled_end).toLocaleString()}
                </p>
                {b.reference && <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>Ref: {b.reference}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Past Bookings</h2>
        {pastBookings.length === 0 ? (
          <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ color: '#666', margin: 0 }}>No past bookings found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {pastBookings.slice(0, 5).map((b) => (
              <div key={b.id} style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0, color: '#444' }}>{b.service_type?.name || 'Service Booking'}</h3>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>{b.booking_state}</span>
                </div>
                <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{new Date(b.scheduled_start).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
