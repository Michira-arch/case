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

  if (firstProfile) {
    const [subResult, itemsResult] = await Promise.all([
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
    ])
    subscription = subResult.data
    proofItems = itemsResult.data || []
  }

  return (
    <DashboardClient
      user={user}
      profiles={profiles || []}
      activeProfile={firstProfile || null}
      subscription={subscription}
      proofItems={proofItems}
    />
  )
}
