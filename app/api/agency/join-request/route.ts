import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { agency_id, profile_id, direction, message } = body

    if (!agency_id || !profile_id) {
      return NextResponse.json({ error: 'agency_id and profile_id are required' }, { status: 400 })
    }

    // Check Max 4 Agency Limit before inserting request
    const { count, error: countErr } = await supabase
      .from('agency_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (!countErr && count && count >= 4) {
      return NextResponse.json(
        { error: 'Membership limit reached: You can be a member of up to 4 agencies only.' },
        { status: 400 }
      )
    }

    // Insert Join Request
    const { data: request, error: reqErr } = await supabase
      .from('agency_join_requests')
      .insert({
        agency_id,
        user_id: user.id,
        profile_id,
        direction: direction || 'talent_apply',
        message: message || null,
        status: 'pending',
      })
      .select()
      .single()

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, request })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
