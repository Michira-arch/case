import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { email, amountKes, phone, invoiceId, reference, subaccount, handle, isAgency } = await req.json()

    if (!email || !amountKes || !phone || !reference) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. Convert KES to subunits (kobo/cents equivalent)
    // Paystack expects amount in smallest currency unit. For KES it's 100 subunits = 1 KES.
    const amountSubunits = Math.round(Number(amountKes) * 100)

    // 2. Format phone number for Paystack (requires international format e.g. 2547XXXXXXXX)
    // Strip non-digit characters other than a leading '+' (e.g. spaces, dashes, parens)
    let cleanPhone = phone.replace(/[^\d+]/g, '')
    cleanPhone = cleanPhone.replace(/^\+/, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.substring(1)
    } else if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) {
      cleanPhone = '254' + cleanPhone
    }

    // 2b. Resolve the subaccount server-side when it isn't provided by the client
    let resolvedSubaccount = subaccount
    let profileId = null
    if (!resolvedSubaccount && handle) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      if (isAgency) {
        const { data: org } = await supabase
          .from('nanny_orgs')
          .select('id, paystack_subaccount_code')
          .eq('slug', handle)
          .single()
        if (org) {
          resolvedSubaccount = org.paystack_subaccount_code
          profileId = org.id
        }
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, paystack_subaccount_code')
          .eq('handle', handle)
          .single()
        if (profile) {
          resolvedSubaccount = profile.paystack_subaccount_code
          profileId = profile.id
        }
      }
    }

    const customFields: any[] = [
      {
        display_name: "Invoice ID",
        variable_name: "invoice_id",
        value: invoiceId || "N/A"
      }
    ]

    if (profileId) {
      customFields.push({
        display_name: isAgency ? "Org ID" : "Profile ID",
        variable_name: isAgency ? "org_id" : "profile_id",
        value: profileId
      })
    }

    const payload: any = {
      email,
      amount: amountSubunits,
      currency: 'KES',
      reference,
      mobile_money: {
        phone: cleanPhone,
        provider: 'mpesa'
      },
      metadata: {
        custom_fields: customFields
      }
    }

    if (resolvedSubaccount) {
      payload.subaccount = resolvedSubaccount
    }

    const response = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    // 3. Handle Paystack response
    // For M-Pesa STK push, the status is typically 'pay_offline' or 'pending' if it successfully fired the push.
    if (!response.ok || !data.status) {
      console.error('Paystack Charge API Error:', data)
      return NextResponse.json({ error: data.message || 'Payment initiation failed' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: data.message,
      data: data.data
    })

  } catch (error: any) {
    console.error('Charge Endpoint Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
