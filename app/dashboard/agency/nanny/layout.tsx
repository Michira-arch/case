import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NannyLayoutClient from './NannyLayoutClient'

export default async function NannyAgencyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  let org = null
  let isLocked = false
  let lockReason = ''

  if (profile) {
    const { data: orgData } = await supabase
      .from('nanny_orgs')
      .select('*')
      .eq('owner_profile_id', profile.id)
      .single()
    org = orgData

    if (org) {
      const now = new Date()
      const createdAt = new Date(org.created_at)
      const gracePeriodEnd = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000)

      if (org.billing_status === 'suspended') {
        isLocked = true
        lockReason = 'Your account is suspended. Please renew your subscription to continue.'
      } else if (org.billing_status === 'past_due') {
        isLocked = true
        lockReason = 'Your account is past due. Please update your payment method to continue.'
      } else if (org.billing_plan === 'free' || !org.billing_plan) {
        if (now > gracePeriodEnd) {
          isLocked = true
          lockReason = 'Your 3-day setup period has ended. Start your 14-day free trial to continue using the platform.'
        }
      } else if (org.billing_status === 'trial') {
        if (org.next_billing_date && now > new Date(org.next_billing_date)) {
          isLocked = true
          lockReason = 'Your 14-day free trial has expired. Please subscribe to a plan to continue.'
        }
      }
    }
  }

  return <NannyLayoutClient org={org} serverLocked={isLocked} serverLockReason={lockReason}>{children}</NannyLayoutClient>
}
