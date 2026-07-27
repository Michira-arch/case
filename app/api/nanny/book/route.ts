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
      // Accept both naming conventions: wizard uses start/end_time/address/notes
      // while standard API uses scheduled_start/scheduled_end/service_address/service_notes
      start,
      end_time,
      address,
      notes,
      scheduled_start,
      scheduled_end,
      service_address,
      service_notes,
      special_requirements,
    } = body

    const resolvedStart = scheduled_start ?? start
    const resolvedEnd = scheduled_end ?? end_time
    const resolvedAddress = service_address ?? address
    const resolvedNotes = service_notes ?? notes

    if (!org_slug || !client_name || !service_code || !resolvedStart || !resolvedEnd || !resolvedAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: org_slug, client_name, service_code, start time, end time, and address are required.' },
        { status: 400 }
      )
    }

    if (!client_email && !client_phone) {
      return NextResponse.json(
        { error: 'Either client_email or client_phone is required for confirmation.' },
        { status: 400 }
      )
    }

    const { result, error } = await createAnonBooking({
      org_slug,
      client_name,
      client_email: client_email || '',
      client_phone: client_phone || '',
      service_code,
      start: resolvedStart,
      end_time: resolvedEnd,
      address: resolvedAddress,
      notes: resolvedNotes,
      special: special_requirements || {},
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    // Return result fields at top level for the booking wizard to consume
    const reference = result?.reference ?? result?.booking_id ?? null
    const anon_token = result?.anon_token ?? null

    return NextResponse.json({
      success: true,
      reference,
      anon_token,
      booking_id: result?.booking_id ?? null,
      booking: result,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
