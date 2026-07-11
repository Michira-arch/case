import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalyticsDashboard from './AnalyticsDashboard'

export const metadata = { title: 'Analytics — Case' }

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at')
    .limit(1)
    .single()

  if (!profile) redirect('/onboarding')

  const [subResult, analyticsResult] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('profile_id', profile.id).single(),
    supabase.rpc('get_analytics_summary', { p_profile_id: profile.id, p_days: 7 }),
  ])

  return (
    <AnalyticsDashboard
      profile={profile}
      subscription={subResult.data}
      analytics={analyticsResult.data}
    />
  )
}
