import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { agencyId: string, memberId: string } }) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agencyId, memberId } = params
    const body = await req.json()
    const { custom_title, custom_rate, visibility_state } = body

    const { data: overlay, error } = await supabase
      .from('agency_profiles_overlay')
      .update({
        custom_title,
        custom_rate,
        visibility_state,
        updated_at: new Date().toISOString()
      })
      .eq('agency_id', agencyId)
      .eq('user_id', memberId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, overlay })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { agencyId: string, memberId: string } }) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { agencyId, memberId } = params

    await supabase
      .from('agency_profiles_overlay')
      .delete()
      .eq('agency_id', agencyId)
      .eq('user_id', memberId)

    const { error: delErr } = await supabase
      .from('agency_members')
      .delete()
      .eq('agency_id', agencyId)
      .eq('user_id', memberId)

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 })
    }

    // Log to agency_events_log if it exists, ignore error if it doesn't
    await supabase.from('agency_events_log').insert({
      agency_id: agencyId,
      event_type: 'member_offboarded',
      user_id: memberId,
      created_at: new Date().toISOString()
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
