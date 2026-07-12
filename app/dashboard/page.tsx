import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch user's profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at')

  // Fetch active subscription for first profile
  const firstProfile = profiles?.[0]
  let subscription = null
  let proofItems: any[] = []
  let monthlyViews = 0

  if (firstProfile) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [subResult, itemsResult, viewsResult] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('profile_id', firstProfile.id)
        .single(),
      supabase
        .from('proof_items')
        .select('*, evidence(*)')
        .eq('profile_id', firstProfile.id)
        .order('sort_order')
        .order('created_at'),
      supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', firstProfile.id)
        .eq('event_type', 'profile_view')
        .gte('created_at', startOfMonth.toISOString()),
    ])
    subscription = subResult.data
    proofItems = itemsResult.data || []
    monthlyViews = viewsResult.count || 0
  }

  return (
    <DashboardClient
      user={user}
      profiles={profiles || []}
      activeProfile={firstProfile || null}
      subscription={subscription}
      proofItems={proofItems}
      monthlyViews={monthlyViews}
    />
  )
}
