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
    const { agency_id } = body

    if (!agency_id) {
      return NextResponse.json({ error: 'agency_id is required' }, { status: 400 })
    }

    // Call stored procedure RPC `leave_agency_safe`
    const { data: result, error: rpcErr } = await supabase.rpc('leave_agency_safe', {
      p_agency_id: agency_id,
    })

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Safely left agency. Your personal Case profile remains 100% intact.' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
