import { NextRequest, NextResponse } from 'next/server'
import { proposeAssignment, updateAssignmentState, clockInWorker } from '@/lib/nanny-data'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, booking_id, worker_id, org_id, hourly_rate, assignment_id, state, reason } = body

    if (action === 'propose') {
      if (!booking_id || !worker_id || !org_id || !hourly_rate) {
        return NextResponse.json({ error: 'Missing required fields for propose' }, { status: 400 })
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
      const { error } = await updateAssignmentState(assignment_id, state, reason)
      if (error) return NextResponse.json({ error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'clock_in') {
      if (!assignment_id || !worker_id) {
        return NextResponse.json({ error: 'Missing assignment_id or worker_id' }, { status: 400 })
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
