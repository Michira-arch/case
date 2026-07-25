import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    let body: any = {}
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      body = Object.fromEntries(formData.entries())
    } else {
      body = await req.json()
    }

    const { token, requestId, action, agency_id, profile_id, direction, message } = body

    // Case A: Reject a pending join request by requestId
    if (requestId && action === 'reject') {
      const { error: rejectErr } = await supabase
        .from('agency_join_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId)

      if (rejectErr) {
        return NextResponse.json({ error: rejectErr.message }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: 'Request rejected' })
    }

    // Case B: Redeem an invite token
    if (token) {
      const { data: inviteReq } = await supabase
        .from('agency_join_requests')
        .select('*')
        .eq('invite_token', token)
        .single()

      if (!inviteReq) {
        return NextResponse.json({ error: 'Invite token not found' }, { status: 404 })
      }

      // Add user to agency_members via DB RPC or direct insert
      const { error: memberErr } = await supabase
        .from('agency_members')
        .insert({
          agency_id: inviteReq.agency_id,
          user_id: user.id,
          role: 'talent',
          status: 'active',
          overlay_data: { visibility_state: 'public' },
        })

      if (memberErr && !memberErr.message.includes('duplicate')) {
        return NextResponse.json({ error: memberErr.message }, { status: 400 })
      }

      // Mark request as approved
      await supabase
        .from('agency_join_requests')
        .update({ status: 'approved', user_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', inviteReq.id)

      return NextResponse.redirect(new URL('/dashboard/agency', req.url))
    }

    // Case C: Create a new join request
    if (!agency_id) {
      return NextResponse.json({ error: 'agency_id is required' }, { status: 400 })
    }

    // Check Max 4 Agency Limit
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

    // Check completeness score rule
    const { data: profile } = await supabase
      .from('profiles')
      .select('completeness_score')
      .eq('owner_id', user.id)
      .maybeSingle()

    const { data: rules } = await supabase
      .from('agency_rules')
      .select('configuration')
      .eq('agency_id', agency_id)
      .eq('rule_type', 'MIN_COMPLETENESS_SCORE')
      .maybeSingle()

    const minScore = rules?.configuration?.min_score || 70
    const score = profile?.completeness_score || 80

    if (score < minScore) {
      await supabase
        .from('agency_join_requests')
        .insert({
          agency_id,
          user_id: user.id,
          direction: direction || 'talent_apply',
          message: message || null,
          status: 'rejected',
        })

      return NextResponse.json(
        { error: `Profile completeness score (${score}%) is below the agency minimum of ${minScore}%.` },
        { status: 400 }
      )
    }

    // Insert Join Request
    const { data: request, error: reqErr } = await supabase
      .from('agency_join_requests')
      .insert({
        agency_id,
        user_id: user.id,
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
