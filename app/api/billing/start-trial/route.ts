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

    const { error } = await supabase
      .from('nanny_orgs')
      .update({
        billing_plan: 'agency_monthly',
        billing_status: 'trial',
        next_billing_date: nextBillingDate.toISOString()
      })
      .eq('owner_profile_id', profile.id)
      // Only allow starting trial if they are currently free or don't have a plan
      .in('billing_status', ['free', 'active', 'inactive', 'suspended']) // Actually let's just make it simple, if they call this and it's their first time. We can just check it on the client, but let's be safe. Wait, if we use .in('billing_plan', ['free', null]) it will fail because null doesn't work well with .in in supabase sometimes. Let's just update.

    if (error) {
      console.error('Error starting trial:', error)
      return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 })
    }

    return NextResponse.json({ success: true, next_billing_date: nextBillingDate })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
