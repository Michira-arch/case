import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSubaccount } from '@/lib/paystack'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { orgId, business_name, settlement_bank, account_number } = await request.json()
    
    const supabaseClient = createServerClient()
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the orgId
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const { data: org, error: orgError } = await supabaseClient
      .from('nanny_orgs')
      .select('id')
      .eq('id', orgId)
      .eq('owner_profile_id', profile.id)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Unauthorized to manage this organization' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Call Paystack API to create subaccount
    const subaccountData = await createSubaccount({
      business_name,
      settlement_bank,
      account_number,
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
