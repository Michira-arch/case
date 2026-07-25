import { createClient } from '@/lib/supabase/server'
import { createPaystackSubaccount } from '@/lib/paystack'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { request_id, role, payout_bank_details } = body

    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    // Call stored procedure RPC `approve_agency_member`
    const { data: result, error: rpcErr } = await supabase.rpc('approve_agency_member', {
      p_request_id: request_id,
      p_role: role || 'talent',
    })

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 })
    }

    // Optionally provision Paystack Subaccount if bank details provided
    if (payout_bank_details?.account_number && payout_bank_details?.bank_code && result?.member_id) {
      try {
        const subaccount = await createPaystackSubaccount({
          business_name: `Case Member - ${result.member_id.slice(0, 8)}`,
          settlement_bank: payout_bank_details.bank_code,
          account_number: payout_bank_details.account_number,
          percentage_charge: 20, // Default 20% agency cut
        })

        if (subaccount?.subaccount_code) {
          await supabase
            .from('agency_members')
            .update({
              paystack_subaccount: subaccount.subaccount_code,
              payout_bank_details,
            })
            .eq('id', result.member_id)
        }
      } catch (subErr) {
        console.error('Subaccount creation notice:', subErr)
      }
    }

    return NextResponse.json({ success: true, member_id: result?.member_id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
