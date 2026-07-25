import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { agencyId: string } }) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agencyId } = params
    const body = await req.json()
    const { memberId, type, message } = body

    // Insert nudge audit log into agency_events_log
    const { data: event, error: eventErr } = await supabase
      .from('agency_events_log')
      .insert({
        agency_id: agencyId,
        actor_id: user.id,
        event_type: 'nudge_sent',
        metadata: {
          target_member_id: memberId || null,
          nudge_type: type || 'custom',
          message: message || 'Please update your Case profile details.',
          sent_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (eventErr) {
      return NextResponse.json({ error: eventErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, event })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
