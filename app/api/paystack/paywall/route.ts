import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { handle, amount, email } = await req.json()

    if (!handle || !amount || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, paystack_subaccount_code')
      .eq('handle', handle)
      .single()

    if (!profile || !profile.paystack_subaccount_code) {
      return NextResponse.json({ error: 'User not found or wallet not set up' }, { status: 404 })
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      throw new Error('PAYSTACK_SECRET_KEY is missing')
    }

    const amountInKobo = Math.round(amount * 100)
    
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://caseshow.info'
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    const callbackUrl = `${baseUrl}/pay/${handle}?success=true`

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        currency: 'KES',
        callback_url: callbackUrl,
        subaccount: profile.paystack_subaccount_code,
        metadata: {
          custom_fields: [
            {
              display_name: "Profile Handle",
              variable_name: "profile_handle",
              value: handle
            }
          ]
        }
      }),
    })

    const data = await response.json()
    if (!data.status) {
      return NextResponse.json({ error: data.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Paystack paywall error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
