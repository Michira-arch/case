import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CronClient from './CronClient'

export default async function CronPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  const { data: org } = await supabase
    .from('nanny_orgs')
    .select('*')
    .eq('owner_profile_id', profile.id)
    .single()

  if (!org) redirect('/dashboard/agency/nanny')

  // Fetch Cron Jobs
  const { data: cronJobs } = await supabase
    .from('nanny_ai_cron_jobs')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  return <CronClient org={org} initialJobs={cronJobs || []} />
}
