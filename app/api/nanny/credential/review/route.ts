import { NextRequest, NextResponse } from 'next/server'
import { reviewCredential } from '@/lib/nanny-data'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { credential_id, decision, expiry_date, rejection_reason } = body

    if (!credential_id || !decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await reviewCredential(credential_id, decision, user.id, {
      expiryDate: expiry_date,
      rejectionReason: rejection_reason,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
