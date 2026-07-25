import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: { agencyId: string } }) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agencyId = params.agencyId

    const { data: members, error } = await supabase
      .from('agency_members')
      .select(`
        *,
        profile:profiles(id, user_id, handle, display_name, avatar_url, category, role_line, bio, completeness_score),
        overlay:agency_profiles_overlay(id, agency_id, user_id, visibility_state, custom_title, custom_rate, updated_at)
      `)
      .eq('agency_id', agencyId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { data: pendingRequests, error: reqErr } = await supabase
      .from('agency_join_requests')
      .select(`
        *,
        profile:profiles(id, user_id, handle, display_name, avatar_url, category, role_line, bio, completeness_score)
      `)
      .eq('agency_id', agencyId)
      .eq('status', 'pending')

    const formatted = members?.map((m: any) => {
      const p = Array.isArray(m.profile) ? m.profile[0] : m.profile
      const o = Array.isArray(m.overlay) ? m.overlay.find((ov: any) => ov.agency_id === agencyId) : m.overlay
      return { ...m, profile: p, overlay: o }
    })

    const formattedReq = pendingRequests?.map((r: any) => {
      const p = Array.isArray(r.profile) ? r.profile[0] : r.profile
      return { ...r, profile: p }
    })

    return NextResponse.json({ members: formatted, requests: formattedReq })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { agencyId: string } }) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agencyId = params.agencyId
    const body = await req.json()
    const { request_id } = body

    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    const { data: request, error: reqErr } = await supabase
      .from('agency_join_requests')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', request_id)
      .eq('agency_id', agencyId)
      .select()
      .single()

    if (reqErr || !request) {
      return NextResponse.json({ error: reqErr?.message || 'Request not found' }, { status: 400 })
    }

    const { data: member, error: memErr } = await supabase
      .from('agency_members')
      .insert({
        agency_id: agencyId,
        user_id: request.user_id,
        role: 'member',
        joined_at: new Date().toISOString()
      })
      .select()
      .single()

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 400 })
    }

    const { error: overlayErr } = await supabase
      .from('agency_profiles_overlay')
      .insert({
        agency_id: agencyId,
        user_id: request.user_id,
        visibility_state: 'public',
        custom_title: null,
        custom_rate: null,
        updated_at: new Date().toISOString()
      })

    if (overlayErr) {
      return NextResponse.json({ error: overlayErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, member })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
