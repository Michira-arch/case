import { NextRequest, NextResponse } from 'next/server'
import { createAnonBooking } from '@/lib/nanny-data'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      org_slug,
      client_name,
      client_email,
      client_phone,
      service_code,
      scheduled_start,
      scheduled_end,
      service_address,
      service_notes,
      special_requirements,
    } = body

    if (!org_slug || !client_name || !service_code || !scheduled_start || !scheduled_end || !service_address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { result, error } = await createAnonBooking({
      org_slug,
      client_name,
      client_email: client_email || null,
      client_phone: client_phone || null,
      service_code,
      start: scheduled_start,
      end_time: scheduled_end,
      address: service_address,
      notes: service_notes,
      special: special_requirements || {},
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true, booking: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
