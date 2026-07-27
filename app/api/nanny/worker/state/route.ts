import { NextRequest, NextResponse } from 'next/server'
import { updateWorkerState } from '@/lib/nanny-data'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { worker_id, state, reason } = body

    if (!worker_id || !state) {
      return NextResponse.json({ error: 'Missing worker_id or state' }, { status: 400 })
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
