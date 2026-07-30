import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { verifyTransaction, PRICING, PlanPeriod } from '@/lib/paystack'

export async function POST(req: Request) {
  try {
    const { reference, orgId, plan, isClient, clientId } = await req.json()

    if (!reference || (!orgId && !clientId) || !plan) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: any[]) {
            // handle setting if needed
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify transaction with Paystack
    const txData = await verifyTransaction(reference)
    
    if (txData.status !== 'success') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 })
    }

    // Get the auth code for future billing
    const authCode = txData.authorization?.authorization_code

    if (!authCode) {
      console.warn('No authorization code found in transaction')
    }

    // Calculate next billing date
    const planDetails = PRICING[plan as PlanPeriod] || { months: 1 } // default 1 month if not in PRICING
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + planDetails.months)

    // Check if subscription exists
    const query = supabase
      .from('nanny_subscriptions')
      .select('id')
    
    if (isClient && clientId) {
      query.eq('client_id', clientId)
    } else {
      query.eq('org_id', orgId).is('client_id', null)
    }

    const { data: existingSubs } = await query

    if (existingSubs && existingSubs.length > 0) {
      // Update existing
      await supabase
        .from('nanny_subscriptions')
        .update({
          plan,
          status: 'active',
          next_billing_date: nextBillingDate.toISOString(),
          paystack_auth_code: authCode || null,
          billing_email: user.email,
        })
        .eq('id', existingSubs[0].id)
    } else {
      // Insert new
      await supabase
        .from('nanny_subscriptions')
        .insert({
          org_id: orgId || null,
          client_id: isClient ? clientId : null,
          plan,
          status: 'active',
          next_billing_date: nextBillingDate.toISOString(),
          paystack_auth_code: authCode || null,
          billing_email: user.email,
        })
    }

    // Update org or client directly as well, based on the previous migration
    if (!isClient && orgId) {
      await supabase
        .from('nanny_orgs')
        .update({
          billing_plan: plan,
          billing_status: 'active',
          next_billing_date: nextBillingDate.toISOString(),
          paystack_auth_code: authCode || null,
          billing_email: user.email,
        })
        .eq('id', orgId)
    } else if (isClient && clientId) {
      await supabase
        .from('nanny_clients')
        .update({
          billing_plan: plan,
          next_billing_date: nextBillingDate.toISOString(),
          paystack_auth_code: authCode || null,
        })
        .eq('id', clientId)
    }

    return NextResponse.json({ success: true, nextBillingDate })
  } catch (error: any) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
