import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verifyTransaction, PRICING, PlanPeriod } from '@/lib/paystack'

export async function POST(req: Request) {
  try {
    const { reference, orgId, plan, isClient, clientId, portalToken } = await req.json()

    if (!reference || (!orgId && !clientId) || !plan) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify transaction with Paystack
    const txData = await verifyTransaction(reference)
    if (txData.status !== 'success') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 })
    }

    // Amount check: the paid amount must match the selected plan
    const planDetails = PRICING[plan as PlanPeriod]
    const amountKes = txData.amount / 100
    if (planDetails && plan !== 'client_saved_card') {
      if (Number(amountKes) !== planDetails.amount_kes) {
        return NextResponse.json({ error: 'Amount does not match plan' }, { status: 400 })
      }
    }

    const authClient = createClient()
    const supabase = createServiceClient()

    // ── Authorization ──────────────────────────────────────────────────────
    if (isClient && clientId) {
      // Client path: must present the client's portal token
      const { data: client } = await supabase
        .from('nanny_clients')
        .select('portal_token')
        .eq('id', clientId)
        .single()
      if (!client || !client.portal_token || portalToken !== client.portal_token) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (orgId) {
      // Org path: must be the org owner
      const { data: { user } } = await authClient.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
      const { data: org } = await supabase
        .from('nanny_orgs')
        .select('id')
        .eq('id', orgId)
        .eq('owner_profile_id', profile.id)
        .maybeSingle()
      if (!org) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const authCode = txData.authorization?.authorization_code || null

    // Card-save only: do not create a bogus active subscription
    if (plan === 'client_saved_card' && isClient && clientId) {
      const { error } = await supabase
        .from('nanny_clients')
        .update({ paystack_auth_code: authCode })
        .eq('id', clientId)
      if (error) throw error
      return NextResponse.json({ success: true, cardSaved: true })
    }

    const months = planDetails?.months ?? 1
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + months)

    const { data: { user } } = await authClient.auth.getUser()

    // Check if subscription exists
    let existingSubs: any = []
    const q = supabase.from('nanny_subscriptions').select('id')
    if (isClient && clientId) {
      q.eq('client_id', clientId)
    } else {
      q.eq('org_id', orgId).is('client_id', null)
    }
    const { data: existing } = await q
    existingSubs = existing || []

    if (existingSubs.length > 0) {
      await supabase
        .from('nanny_subscriptions')
        .update({
          plan,
          status: 'active',
          next_billing_date: nextBillingDate.toISOString(),
          paystack_auth_code: authCode,
          billing_email: user?.email || null,
        })
        .eq('id', existingSubs[0].id)
    } else {
      await supabase
        .from('nanny_subscriptions')
        .insert({
          org_id: isClient ? null : orgId,
          client_id: isClient ? clientId : null,
          plan,
          status: 'active',
          next_billing_date: nextBillingDate.toISOString(),
          paystack_auth_code: authCode,
          billing_email: user?.email || null,
        })
    }

    // Update org or client directly
    if (!isClient && orgId) {
      await supabase
        .from('nanny_orgs')
        .update({
          billing_plan: plan,
          billing_status: 'active',
          next_billing_date: nextBillingDate.toISOString(),
          paystack_auth_code: authCode,
          billing_email: user?.email || null,
        })
        .eq('id', orgId)
    } else if (isClient && clientId) {
      await supabase
        .from('nanny_clients')
        .update({
          billing_plan: plan,
          next_billing_date: nextBillingDate.toISOString(),
          paystack_auth_code: authCode,
        })
        .eq('id', clientId)
    }

    return NextResponse.json({ success: true, nextBillingDate })
  } catch (error: any) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
