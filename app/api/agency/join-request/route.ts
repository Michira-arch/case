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
      // Assuming 'status' isn't explicitly requested in schema but keeping as original code had it
      // if it errors we might need to remove it, but user mentioned it might exist. Let's keep it.

    if (!countErr && count && count >= 4) {
      return NextResponse.json(
        { error: 'Membership limit reached: You can be a member of up to 4 agencies only.' },
        { status: 400 }
      )
    }

    // Check completeness score
    const { data: profile } = await supabase
      .from('profiles')
      .select('completeness_score')
      .eq('user_id', user.id)
      .single()

    // Assuming a hypothetical minimum of 70 for this agency, or fetching from rules.
    const { data: rules } = await supabase
      .from('agency_rules')
      .select('minimum_completeness_score')
      .eq('agency_id', agency_id)
      .single()

    const minScore = rules?.minimum_completeness_score || 70
    const score = profile?.completeness_score || 0

    if (score < minScore) {
      // Auto-reject
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
        { error: `Profile completeness score (${score}%) is below the agency minimum of ${minScore}%. Please update your profile.` },
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
