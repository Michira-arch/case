import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner, getWorkers, getWorkerCompliance } from '@/lib/nanny-data'
import styles from '../nanny-dashboard.module.css'
import WorkersClient from './WorkersClient'

export const revalidate = 30

export default async function WorkersPage() {
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
  const [workers, compliance] = await Promise.all([
    getWorkers(org.id),
    getWorkerCompliance(org.id),
  ])

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Workers</h1>
          <p className={styles.pageSubtitle}>
            {workers.length} worker{workers.length !== 1 ? 's' : ''} on roster
          </p>
        </div>
        <div className={styles.pageActions}>
          <Link
            href="/dashboard/agency/nanny/workers/new"
            className="btn btn--dark"
          >
            + Add Worker
          </Link>
        </div>
      </div>

      <div className={styles.content}>
        <WorkersClient
          workers={workers}
          compliance={compliance}
          orgHandle={org.slug}
        />
      </div>
    </>
  )
}
