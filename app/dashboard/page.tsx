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
  let weekViews = 0
  let prevWeekViews = 0
  let evidenceTapsWeek = 0
  let socialClicksWeek = 0
  let vouchCount = 0
  let itemsWithoutEvidence = 0

  if (firstProfile) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [
      subResult,
      itemsResult,
      viewsResult,
      weekViewsResult,
      prevWeekViewsResult,
      evidenceTapsResult,
      socialClicksResult,
      vouchCountResult,
    ] = await Promise.all([
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
      supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', firstProfile.id)
        .eq('event_type', 'profile_view')
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', firstProfile.id)
        .eq('event_type', 'profile_view')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', firstProfile.id)
        .eq('event_type', 'evidence_tap')
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', firstProfile.id)
        .eq('event_type', 'social_click')
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('proof_items')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', firstProfile.id)
        .eq('pillar', 'vouched')
        .eq('visible', true),
    ])
    subscription = subResult.data
    proofItems = itemsResult.data || []
    monthlyViews = viewsResult.count || 0
    weekViews = weekViewsResult.count || 0
    prevWeekViews = prevWeekViewsResult.count || 0
    evidenceTapsWeek = evidenceTapsResult.count || 0
    socialClicksWeek = socialClicksResult.count || 0
    vouchCount = vouchCountResult.count || 0

    // Items without any evidence (visible only)
    const visibleItems = proofItems.filter(i => i.visible)
    itemsWithoutEvidence = visibleItems.filter(
      i => !i.evidence || i.evidence.length === 0
    ).length

    // Trigger downgrade check server-side if subscription may have lapsed
    if (subscription?.plan === 'plus' && subscription?.current_period_end) {
      const expiry = new Date(subscription.current_period_end)
      if (expiry < new Date()) {
        // Fire and forget — the SQL function handles idempotently
        void supabase.rpc('downgrade_expired_subscriptions').catch(() => {})
      }
    }
  }

  return (
    <DashboardClient
      user={user}
      profiles={profiles || []}
      activeProfile={firstProfile || null}
      subscription={subscription}
      proofItems={proofItems}
      monthlyViews={monthlyViews}
      weekViews={weekViews}
      prevWeekViews={prevWeekViews}
      evidenceTapsWeek={evidenceTapsWeek}
      socialClicksWeek={socialClicksWeek}
      vouchCount={vouchCount}
      itemsWithoutEvidence={itemsWithoutEvidence}
    />
  )
}
