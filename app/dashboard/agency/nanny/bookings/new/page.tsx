import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner, getClients, getWorkers, getServiceTypes } from '@/lib/nanny-data'
import styles from '../../nanny-dashboard.module.css'
import Link from 'next/link'
import NewBookingClient from './NewBookingClient'

export const revalidate = 0

export default async function NewBookingPage() {
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

  const [clients, workers, serviceTypes] = await Promise.all([
    getClients(org.id),
    getWorkers(org.id),
    getServiceTypes(org.id)
  ])

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Log External Booking</h1>
          <p className={styles.pageSubtitle}>
            Manually log a booking that happened outside the platform.
          </p>
        </div>
        <div className={styles.pageActions}>
          <Link href="/dashboard/agency/nanny/bookings" className="btn btn--outline">
            Cancel
          </Link>
        </div>
      </div>

      <div className={styles.content}>
        <NewBookingClient 
          orgId={org.id} 
          clients={clients} 
          workers={workers} 
          serviceTypes={serviceTypes} 
        />
      </div>
    </>
  )
}
