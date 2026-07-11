import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/paystack'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-paystack-signature')
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const body = await request.text()

  // CRITICAL: verify HMAC before trusting any data
  const isValid = await verifyWebhookSignature(body, signature)
  if (!isValid) {
    console.error('Invalid Paystack webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log(`Paystack webhook: ${event.event}`, event.data?.reference)

  // Only process successful charge events
  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const data = event.data
  const metadata = data.metadata || {}

  const profileId   = metadata.profile_id || data.metadata?.custom_fields?.find((f: any) => f.variable_name === 'profile_id')?.value
  const planPeriod  = metadata.plan_period || data.metadata?.custom_fields?.find((f: any) => f.variable_name === 'plan_period')?.value

  if (!profileId || !planPeriod) {
    console.error('Missing profile_id or plan_period in Paystack metadata', metadata)
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
  }

  const amountKes = data.amount / 100 // Paystack sends in kobo

  try {
    const supabase = createServiceClient()

    await supabase.rpc('apply_payment', {
      p_profile_id:         profileId,
      p_paystack_reference: data.reference,
      p_amount_kes:         amountKes,
      p_plan_period:        planPeriod,
      p_channel:            data.channel,
      p_paystack_data:      event.data,
    })

    console.log(`Payment applied: profile=${profileId} plan=${planPeriod} amount=${amountKes}`)
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Failed to apply payment:', err.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Paystack requires a 200 response for GET verification
export async function GET() {
  return NextResponse.json({ ok: true })
}
