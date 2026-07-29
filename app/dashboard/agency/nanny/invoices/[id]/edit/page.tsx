import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditInvoiceClient from './EditInvoiceClient'

export const revalidate = 0

interface Props {
  params: { id: string }
}

export default async function EditInvoicePage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Make sure this invoice belongs to an agency this user owns
  const { data: orgs } = await supabase
    .from('nanny_orgs')
    .select('id')
    .eq('owner_profile_id', profile.id)

  if (!orgs || orgs.length === 0) redirect('/dashboard/agency/nanny/new')
  
  const orgIds = orgs.map((o: any) => o.id)

  const { data: invoice } = await supabase
    .from('nanny_invoices')
    .select('*')
    .eq('id', params.id)
    .in('org_id', orgIds)
    .single()

  if (!invoice) notFound()

  return <EditInvoiceClient invoice={invoice as any} />
}
