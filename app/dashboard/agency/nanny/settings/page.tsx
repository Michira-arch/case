import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner } from '@/lib/nanny-data'
import styles from '../nanny-dashboard.module.css'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
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

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageSubtitle}>
            Configure your agency profile and policies
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <SettingsClient org={org} />
      </div>
    </>
  )
}
