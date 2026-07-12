import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTransaction } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json()
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    // Verify transaction directly with Paystack API (secure server-to-server)
    const txData = await verifyTransaction(reference)

    if (txData.status !== 'success') {
      return NextResponse.json({ error: 'Transaction not successful' }, { status: 400 })
    }

    const metadata = txData.metadata || {}
    const profileId   = metadata.profile_id || txData.metadata?.custom_fields?.find((f: any) => f.variable_name === 'profile_id')?.value
    const planPeriod  = metadata.plan_period || txData.metadata?.custom_fields?.find((f: any) => f.variable_name === 'plan_period')?.value

    if (!profileId || !planPeriod) {
      return NextResponse.json({ error: 'Missing transaction metadata' }, { status: 400 })
    }

    const amountKes = txData.amount / 100 // Paystack sends in kobo

    const supabase = createClient()
    const { error: rpcErr } = await supabase.rpc('apply_payment', {
      p_profile_id:         profileId,
      p_paystack_reference: reference,
      p_amount_kes:         amountKes,
      p_plan_period:        planPeriod,
      p_channel:            txData.channel,
      p_paystack_data:      txData,
    })

    if (rpcErr) throw rpcErr

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Manual transaction verification failed:', err)
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 })
  }
}
