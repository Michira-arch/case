import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { handle, amount, email, isAgency } = await req.json()

    if (!handle || !amount || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let subaccountCode = null;
    if (isAgency) {
      const { data: org } = await supabase
        .from('nanny_orgs')
        .select('id, paystack_subaccount_code')
        .eq('slug', handle)
        .single()
      if (org) {
        subaccountCode = org.paystack_subaccount_code
      }
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, paystack_subaccount_code')
        .eq('handle', handle)
        .single()
      if (profile) {
        subaccountCode = profile.paystack_subaccount_code
      }
    }

    if (!subaccountCode) {
      return NextResponse.json({ error: 'User/Agency not found or wallet not set up' }, { status: 404 })
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      throw new Error('PAYSTACK_SECRET_KEY is missing')
    }

    const amountInKobo = Math.round(amount * 100)
    
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://caseshow.info'
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    const callbackUrl = isAgency 
      ? `${baseUrl}/agency/${handle}/pay?success=true`
      : `${baseUrl}/pay/${handle}?success=true`

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
        subaccount: subaccountCode,
        metadata: {
          custom_fields: [
            {
              display_name: isAgency ? "Agency Slug" : "Profile Handle",
              variable_name: isAgency ? "agency_slug" : "profile_handle",
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
