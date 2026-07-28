import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner } from '@/lib/nanny-data'
import styles from '../nanny-dashboard.module.css'
import RequestsClient from './RequestsClient'

export const revalidate = 0 // always fresh

export default async function RequestsPage() {
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

  // Fetch join requests
  const { data: requests, error } = await supabase
    .from('agency_join_requests')
    .select('*, profiles(id, full_name, display_name, email, avatar_url)')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching join requests:', error)
  }

  const joinRequests = requests || []

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Join Requests</h1>
          <p className={styles.pageSubtitle}>
            {joinRequests.length} request{joinRequests.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <RequestsClient requests={joinRequests} />
      </div>
    </>
  )
}
