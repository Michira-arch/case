import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assignWorkerToBooking } from '@/lib/nanny-data'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await req.json()
    const inboxId = params.id

    // Fetch the inbox item
    const { data: inboxItem } = await supabase
      .from('nanny_action_inbox')
      .select('*')
      .eq('id', inboxId)
      .single()

    if (!inboxItem) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    if (action === 'approve') {
      if (inboxItem.action_type === 'assign_worker' && inboxItem.action_payload) {
        const payload = inboxItem.action_payload
        
        // Execute the assignment
        const { error: assignError } = await assignWorkerToBooking(
          payload.booking_id,
          payload.worker_id,
          payload.hourly_rate || 15
        )

        if (assignError) {
          throw new Error(assignError)
        }
      }
      
      // Update item to approved
      await supabase
        .from('nanny_action_inbox')
        .update({ status: 'approved' })
        .eq('id', inboxId)

    } else if (action === 'reject') {
      // Update item to rejected
      await supabase
        .from('nanny_action_inbox')
        .update({ status: 'rejected' })
        .eq('id', inboxId)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Action Inbox Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
