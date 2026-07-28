import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner } from '@/lib/nanny-data'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const orgs = await getNannyOrgsByOwner(profile.id)
    if (orgs.length === 0) {
      return NextResponse.json({ error: 'No agency found for this user' }, { status: 400 })
    }

    const org = orgs[0]
    const body = await req.json()
    const { worker_id, payment_details } = body

    if (!worker_id) {
      return NextResponse.json({ error: 'worker_id is required' }, { status: 400 })
    }

    // Verify worker belongs to org
    const { data: worker, error: workerErr } = await supabase
      .from('nanny_workers')
      .select('id')
      .eq('id', worker_id)
      .eq('org_id', org.id)
      .single()

    if (workerErr || !worker) {
      return NextResponse.json({ error: 'Worker not found or unauthorized' }, { status: 403 })
    }

    const { error: updateErr } = await supabase
      .from('nanny_workers')
      .update({ payment_details })
      .eq('id', worker_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
