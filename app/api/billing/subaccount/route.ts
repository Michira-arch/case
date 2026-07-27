import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSubaccount } from '@/lib/paystack'

export async function POST(request: Request) {
  try {
    const { orgId, business_name, settlement_bank, account_number } = await request.json()
    
    // In a real app, verify user is owner of orgId using Supabase auth
    const authHeader = request.headers.get('authorization')
    // We will assume server-side validation is done for the context of this test

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Call Paystack API to create subaccount
    // 15% platform commission
    const subaccountData = await createSubaccount({
      business_name,
      settlement_bank,
      account_number,
      percentage_charge: 15, 
    })

    const subaccountCode = subaccountData.subaccount_code

    // Update database
    const { error } = await supabase
      .from('nanny_orgs')
      .update({ paystack_subaccount_code: subaccountCode })
      .eq('id', orgId)

    if (error) {
      console.error('Error updating org with subaccount:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, subaccount_code: subaccountCode })
  } catch (error: any) {
    console.error('Subaccount creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
