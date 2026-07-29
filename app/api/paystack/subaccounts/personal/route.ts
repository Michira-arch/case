import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSubaccount } from '@/lib/paystack'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { business_name, settlement_bank, account_number } = await request.json()

    if (!business_name || !settlement_bank || !account_number) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Call Paystack
    const subaccount = await createSubaccount({
      business_name,
      settlement_bank,
      account_number,
      primary_contact_email: user.email,
    })

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ paystack_subaccount_code: subaccount.subaccount_code })
      .eq('owner_id', user.id)

    if (updateError) {
      console.error('Failed to update profile with subaccount code:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true, subaccount_code: subaccount.subaccount_code })
  } catch (error: any) {
    console.error('Paystack Subaccount Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
