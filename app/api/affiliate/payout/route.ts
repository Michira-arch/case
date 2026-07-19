import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentDetails } = await request.json()
    if (!paymentDetails || !paymentDetails.trim()) {
      return NextResponse.json({ error: 'Payment details are required' }, { status: 400 })
    }

    // Get active profile
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at')

    const activeProfile = profiles?.[0]
    if (!activeProfile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 400 })
    }

    // Fetch all unpaid earned referrals for this referrer
    const { data: referrals, error: refError } = await supabase
      .from('aff_referrals_summary' as any) // using view
      .select('*')
      .eq('referrer_profile_id', activeProfile.id)
      .eq('payout_status', 'unpaid')
      .eq('status', 'earned')

    // Workaround if standard table check is needed, or map from view
    const targetReferrals = referrals || []
    if (refError || !targetReferrals.length) {
      // It might be named affiliate_referrals_summary as created in schema.sql
      // Let's retry with the correct view name
      const { data: referralsRetry, error: refErrorRetry } = await supabase
        .from('affiliate_referrals_summary')
        .select('*')
        .eq('referrer_profile_id', activeProfile.id)
        .eq('payout_status', 'unpaid')
        .eq('status', 'earned')

      if (refErrorRetry) throw refErrorRetry
      
      if (!referralsRetry || referralsRetry.length === 0) {
        return NextResponse.json({ error: 'No unpaid earned commission available' }, { status: 400 })
      }
      
      targetReferrals.push(...referralsRetry)
    }

    // Calculate total unpaid balance
    const totalUnpaid = targetReferrals.reduce((sum: number, ref: any) => sum + Number(ref.commission_kes), 0)

    // Verify minimum payout
    if (totalUnpaid < 1000) {
      return NextResponse.json({
        error: `Minimum payout is 1,000 KES. Your current balance is ${totalUnpaid.toFixed(2)} KES.`
      }, { status: 400 })
    }

    // Use service client to bypass RLS and update referrals
    const serviceClient = createServiceClient()

    // 1. Create affiliate payout record
    const { data: payout, error: payoutErr } = await serviceClient
      .from('affiliate_payouts')
      .insert({
        profile_id: activeProfile.id,
        amount_kes: totalUnpaid,
        payment_details: paymentDetails,
        status: 'pending'
      })
      .select()
      .single()

    if (payoutErr) throw payoutErr

    // 2. Update referrals to link them to the payout
    const referredIds = targetReferrals.map((r: any) => r.referred_profile_id)
    const { error: updateErr } = await serviceClient
      .from('referrals')
      .update({
        payout_id: payout.id,
        payout_status: 'paid'
      })
      .eq('referrer_profile_id', activeProfile.id)
      .eq('payout_status', 'unpaid')
      .in('referred_profile_id', referredIds)

    if (updateErr) {
      // Rollback payout record if update fails (using service client)
      await serviceClient.from('affiliate_payouts').delete().eq('id', payout.id)
      throw updateErr
    }

    return NextResponse.json({ success: true, payout })
  } catch (err: any) {
    console.error('Failed to request payout:', err)
    return NextResponse.json({ error: err.message || 'Failed to request payout' }, { status: 500 })
  }
}
