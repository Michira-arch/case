import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateWorkerState } from '@/lib/nanny-data'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { worker_id, state, reason } = body

    if (!worker_id || !state) {
      return NextResponse.json({ error: 'Missing worker_id or state' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization: the caller must be a member of the worker's org
    const { data: worker } = await supabase
      .from('nanny_workers')
      .select('org_id')
      .eq('id', worker_id)
      .maybeSingle()

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
    const profileIds = (profiles || []).map((p: any) => p.id)
    if (profileIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data: members } = await supabase
      .from('nanny_org_members')
      .select('org_id')
      .in('profile_id', profileIds)
      .eq('org_id', worker.org_id)
    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await updateWorkerState(worker_id, state, reason)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
