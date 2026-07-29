import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: any }
) {
  const p = await params
  const subscriptionId = p.id

  if (!subscriptionId) {
    return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 })
  }

  const supabase = createClient()

  // First verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Get subscription
  const { data: subscription, error: fetchError } = await supabase
    .from('profile_subscriptions')
    .select('*, profiles!inner(owner_id)')
    .eq('id', subscriptionId)
    .single()

  if (fetchError || !subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  // Allow cancellation if user is the provider OR client provided matching email
  const body = await request.json().catch(() => ({}))
  const clientEmail = body.client_email

  let authorized = false
  if (user && subscription.profiles.owner_id === user.id) {
    authorized = true
  } else if (clientEmail && subscription.client_email === clientEmail) {
    authorized = true
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Update status
  const { error: updateError } = await supabase
    .from('profile_subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Subscription canceled' })
}
