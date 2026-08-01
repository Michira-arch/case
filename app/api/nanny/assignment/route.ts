import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { proposeAssignment, updateAssignmentState, clockInWorker } from '@/lib/nanny-data'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profiles } = await supabase.from('profiles').select('id').eq('owner_id', user.id)
    const profileIds = (profiles || []).map((p: any) => p.id)

    const isOrgMember = async (orgId: string): Promise<boolean> => {
      if (profileIds.length === 0) return false
      const { data: members } = await supabase
        .from('nanny_org_members')
        .select('org_id')
        .in('profile_id', profileIds)
        .eq('org_id', orgId)
      return !!members && members.length > 0
    }

    const body = await req.json()
    const { action, booking_id, worker_id, org_id, hourly_rate, assignment_id, state, reason } = body

    if (action === 'propose') {
      if (!booking_id || !worker_id || !org_id || !hourly_rate) {
        return NextResponse.json({ error: 'Missing required fields for propose' }, { status: 400 })
      }
      // Only an org member may propose an assignment
      if (!(await isOrgMember(org_id))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const { assignment, error } = await proposeAssignment({
        booking_id,
        worker_id,
        org_id,
        hourly_rate: Number(hourly_rate),
      })
      if (error) return NextResponse.json({ error }, { status: 400 })
      return NextResponse.json({ success: true, assignment })
    }

    if (action === 'update_state') {
      if (!assignment_id || !state) {
        return NextResponse.json({ error: 'Missing assignment_id or state' }, { status: 400 })
      }
      // RLS allows org members + the assigned worker; just ensure the worker can't
      // self-confirm past the agency. Restrict state transitions for workers below.
      const { data: assignment } = await supabase
        .from('nanny_assignments')
        .select('org_id, worker_id')
        .eq('id', assignment_id)
        .maybeSingle()
      if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

      const callerIsMember = await isOrgMember(assignment.org_id)
      const callerIsWorker = profileIds.length > 0 && !!(
        await supabase
          .from('nanny_workers')
          .select('id')
          .eq('id', assignment.worker_id)
          .in('profile_id', profileIds)
          .maybeSingle()
      ).data

      if (!callerIsMember && !callerIsWorker) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Workers may only transition to worker_accepted (accept) or no_show/cancelled;
      // they cannot self-approve to client_confirmed/completed/in_progress.
      if (callerIsWorker && !callerIsMember) {
        if (!['worker_accepted', 'no_show', 'cancelled'].includes(state)) {
          return NextResponse.json({ error: 'Worker cannot perform this transition' }, { status: 403 })
        }
      }

      const { error } = await updateAssignmentState(assignment_id, state, reason)
      if (error) return NextResponse.json({ error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'clock_in') {
      if (!assignment_id || !worker_id) {
        return NextResponse.json({ error: 'Missing assignment_id or worker_id' }, { status: 400 })
      }
      const { data: assignment } = await supabase
        .from('nanny_assignments')
        .select('org_id, worker_id')
        .eq('id', assignment_id)
        .maybeSingle()
      if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
      const callerIsMember = await isOrgMember(assignment.org_id)
      const callerIsWorker = profileIds.length > 0 && !!(
        await supabase
          .from('nanny_workers')
          .select('id')
          .eq('id', assignment.worker_id)
          .eq('id', worker_id)
          .in('profile_id', profileIds)
          .maybeSingle()
      ).data
      if (!callerIsMember && !callerIsWorker) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const { error } = await clockInWorker(assignment_id, worker_id)
      if (error) return NextResponse.json({ error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
