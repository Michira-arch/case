import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner, getBookings } from '@/lib/nanny-data'
import styles from '../nanny-dashboard.module.css'
import BookingsClient from './BookingsClient'

export const revalidate = 30

export default async function BookingsPage() {
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
  const bookings = await getBookings(org.id)

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Bookings</h1>
          <p className={styles.pageSubtitle}>
            {bookings.length} total booking{bookings.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <BookingsClient bookings={bookings} />
      </div>
    </>
  )
}
