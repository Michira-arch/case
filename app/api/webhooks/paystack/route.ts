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
  const invoiceId   = metadata.invoice_id || data.metadata?.custom_fields?.find((f: any) => f.variable_name === 'invoice_id')?.value

  const amountKes = data.amount / 100 // Paystack sends in kobo

  try {
    const supabase = createServiceClient()

    if (invoiceId) {
      // Handle Invoice Payment
      // Security: Verify amount exactly matches the invoice total
      const { data: invoice, error: fetchError } = await supabase
        .from('nanny_invoices')
        .select('total, invoice_state')
        .eq('id', invoiceId)
        .single()

      if (fetchError || !invoice) {
        console.error(`Invoice not found: ${invoiceId}`)
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }

      if (Number(invoice.total) !== amountKes) {
        console.error(`Amount mismatch for invoice ${invoiceId}: expected ${invoice.total}, got ${amountKes}`)
        return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
      }

      if (invoice.invoice_state === 'paid') {
        console.log(`Invoice ${invoiceId} already marked as paid.`)
        return NextResponse.json({ received: true })
      }

      const { error } = await supabase
        .from('nanny_invoices')
        .update({
          invoice_state: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'paystack',
          payment_reference: data.reference,
        })
        .eq('id', invoiceId)
        
      if (error) throw error
      console.log(`Invoice paid: ${invoiceId} amount=${amountKes}`)
      return NextResponse.json({ received: true })
    }

    // Handle Subscription Payment
    if (!profileId || !planPeriod) {
      console.error('Missing profile_id, plan_period, or invoice_id in Paystack metadata', metadata)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

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
