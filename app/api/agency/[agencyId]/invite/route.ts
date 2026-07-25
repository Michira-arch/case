import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request, { params }: { params: { agencyId: string } }) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agencyId = params.agencyId
    const token = crypto.randomBytes(16).toString('hex')

    const { data, error } = await supabase
      .from('agency_join_requests')
      .insert({
        agency_id: agencyId,
        user_id: user.id, // Using the admin's user_id just to satisfy DB constraints
        status: 'pending',
        message: token,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Usually there would be an actual token column or direction column, 
    // but we use the existing schema properties (message holds token).
    return NextResponse.json({ link: `case.app/invite/${token}` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
