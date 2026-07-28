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

  const mappedJobs = (cronJobs || []).map((job: any) => {
    let schedule = job.cron_expression;
    if (job.cron_expression === '0 0 * * *') schedule = 'daily';
    else if (job.cron_expression === '0 0 * * 0') schedule = 'weekly';
    else if (job.cron_expression === '0 0 1 * *') schedule = 'monthly';
    return { ...job, schedule };
  });

  return <CronClient org={org} initialJobs={mappedJobs} />
}
