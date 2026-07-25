import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in or create a Client Profile.' }, { status: 401 })
    }

    const body = await req.json()
    const { pitch_id, company_name, company_handle } = body

    if (!pitch_id) {
      return NextResponse.json({ error: 'pitch_id is required' }, { status: 400 })
    }

    // Call stored procedure accept_pitch_as_client
    const { data, error } = await supabase.rpc('accept_pitch_as_client', {
      p_pitch_id: pitch_id,
      p_client_user_id: user.id,
      p_company_name: company_name || null,
      p_company_handle: company_handle || null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, result: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
