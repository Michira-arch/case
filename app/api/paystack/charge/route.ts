import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { email, amountKes, phone, invoiceId, reference, subaccount } = await req.json()

    if (!email || !amountKes || !phone || !reference) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. Convert KES to subunits (kobo/cents equivalent)
    // Paystack expects amount in smallest currency unit. For KES it's 100 subunits = 1 KES.
    const amountSubunits = Math.round(Number(amountKes) * 100)

    // 2. Format phone number (Paystack prefers valid formats, e.g. 07XXXXXXXX or 2547XXXXXXXX or +2547XXXXXXXX)
    // We'll pass it exactly as user entered, but we can do basic cleanup
    const cleanPhone = phone.replace(/\s+/g, '')

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
        custom_fields: [
          {
            display_name: "Invoice ID",
            variable_name: "invoice_id",
            value: invoiceId || "N/A"
          }
        ]
      }
    }

    if (subaccount) {
      payload.subaccount = subaccount
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
