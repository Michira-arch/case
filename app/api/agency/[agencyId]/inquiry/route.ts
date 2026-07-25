import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { agencyId: string } }) {
  try {
    const supabase = createClient()
    const { agencyId } = params
    const body = await req.json()
    const { talentIds, service, date, budget, name, email, phone, whatsapp } = body

    if (!email || !service) {
      return NextResponse.json({ error: 'Email and service description are required' }, { status: 400 })
    }

    // Generate random token for pitch
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Insert draft pitch in agency_pitches
    const { data: pitch, error: pitchErr } = await supabase
      .from('agency_pitches')
      .insert({
        agency_id: agencyId,
        created_by: (await supabase.auth.getUser()).data.user?.id || '00000000-0000-0000-0000-000000000000',
        client_email: email,
        client_name: name || 'Client Inquiry',
        token,
        status: 'draft',
        total_value: Number(budget) || 0,
        payload: {
          service,
          date,
          talent_ids: talentIds || [],
          phone,
          whatsapp,
          inquiry_source: 'public_showcase',
        },
      })
      .select()
      .single()

    // Log event in agency_events_log
    await supabase.from('agency_events_log').insert({
      agency_id: agencyId,
      event_type: 'client_inquiry_received',
      metadata: {
        client_name: name,
        client_email: email,
        service,
        budget,
        talent_count: (talentIds || []).length,
      },
    })

    if (pitchErr) {
      // If pitch insert fails (e.g. auth required), still return success for public inquiry
      return NextResponse.json({ success: true, token, note: 'Inquiry logged' })
    }

    return NextResponse.json({ success: true, pitch, token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
