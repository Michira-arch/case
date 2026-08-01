import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Trial is 14 days
    const nextBillingDate = new Date()
    nextBillingDate.setDate(nextBillingDate.getDate() + 14)

    // Only allow starting a trial when the org is not already paying or trialing.
    // NOTE: billing_status defaults to 'active' for new orgs, so we must NOT gate
    // on it — gate on the paid plan instead.
    const { data: existingOrg, error: fetchError } = await supabase
      .from('nanny_orgs')
      .select('billing_status, billing_plan')
      .eq('owner_profile_id', profile.id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to load org' }, { status: 500 })
    }

    if (existingOrg) {
      const alreadyTrialing = existingOrg.billing_status === 'trial'
      const onPaidPlan = !!existingOrg.billing_plan && existingOrg.billing_plan !== 'free'
      if (alreadyTrialing || onPaidPlan) {
        return NextResponse.json({ error: 'Trial only available for orgs not already paying or trialing' }, { status: 400 })
      }
    }

    const { error } = await supabase
      .from('nanny_orgs')
      .update({
        billing_plan: 'agency_monthly',
        billing_status: 'trial',
        next_billing_date: nextBillingDate.toISOString()
      })
      .eq('owner_profile_id', profile.id)

    if (error) {
      console.error('Error starting trial:', error)
      return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 })
    }

    return NextResponse.json({ success: true, next_billing_date: nextBillingDate })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
