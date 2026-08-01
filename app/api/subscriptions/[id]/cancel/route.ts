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

  // Require an authenticated session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only the provider who owns the subscription may cancel it (RLS enforces this too)
  const { data: subscription, error: fetchError } = await supabase
    .from('profile_subscriptions')
    .select('id')
    .eq('id', subscriptionId)
    .single()

  if (fetchError || !subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('profile_subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Subscription canceled' })
}
