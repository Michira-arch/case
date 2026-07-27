import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner, getInvoices } from '@/lib/nanny-data'
import styles from '../nanny-dashboard.module.css'
import InvoicesClient from './InvoicesClient'

export const revalidate = 60

export default async function InvoicesPage() {
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
  const invoices = await getInvoices(org.id)

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Invoices</h1>
          <p className={styles.pageSubtitle}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <InvoicesClient invoices={invoices} currency="KES" />
      </div>
    </>
  )
}
