import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAiClient } from '@/lib/ai/client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { booking_id, org_slug, client_name, service_code, worker_id } = body

    if (!booking_id || !org_slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 1. Get org details
    const { data: org } = await supabase
      .from('nanny_orgs')
      .select('id, name')
      .eq('slug', org_slug)
      .single()

    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

    // 2. Fetch the booking
    const { data: booking } = await supabase
      .from('nanny_bookings')
      .select('*, service_type:nanny_service_types(name)')
      .eq('id', booking_id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // 3. Fetch active vetted workers
    const { data: workers } = await supabase
      .from('nanny_workers')
      .select(`
        id, shadow_name, worker_state, avg_rating,
        profile:profiles(display_name, category)
      `)
      .eq('org_id', org.id)
      .in('worker_state', ['active', 'vetted'])
      
    const availableWorkers = workers || []

    const { client, model } = await getAiClient(org.id)

    let actionTitle = ''
    let actionDesc = ''
    let actionPayload = {}
    let actionType = 'assign_worker'

    if (worker_id) {
      // The client explicitly requested a worker
      const requestedWorker = availableWorkers.find((w: any) => w.id === worker_id)
      const workerName = requestedWorker ? (requestedWorker.profile?.display_name || requestedWorker.shadow_name) : 'a worker'
      
      actionTitle = `Approve Booking for ${workerName}`
      actionDesc = `Client ${client_name} explicitly requested ${workerName} for ${booking.service_type?.name || service_code}. Approve this assignment?`
      actionPayload = { booking_id, worker_id, hourly_rate: booking.quoted_rate || 15 }
    } else {
      // The AI should pick the most ideal worker
      const workerDataStr = availableWorkers.map((w: any) => 
        `- ID: ${w.id}, Name: ${w.profile?.display_name || w.shadow_name}, Rating: ${w.avg_rating || 'N/A'}`
      ).join('\n')

      const prompt = `You are the AI coordinator for "${org.name}".
A new booking was just created!
Booking ID: ${booking_id}
Client: ${client_name}
Service: ${booking.service_type?.name || service_code}
Dates: ${new Date(booking.scheduled_start).toLocaleString()} to ${new Date(booking.scheduled_end).toLocaleString()}
Address: ${booking.service_address}

Here is the list of available workers:
${workerDataStr || 'No active workers found.'}

Your task:
1. Pick the best ideal worker for this booking (if there are workers).
2. Return ONLY a JSON object with this exact structure:
{
  "best_worker_id": "the-uuid",
  "reason": "Short 1-sentence justification"
}

If no workers are available, return:
{
  "best_worker_id": null,
  "reason": "No active workers available to assign."
}`

      const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'system', content: prompt }],
        response_format: { type: 'json_object' }
      })

      const aiContent = response.choices[0].message.content
      try {
        const parsed = JSON.parse(aiContent || '{}')
        if (parsed.best_worker_id) {
          const matchedWorker = availableWorkers.find((w: any) => w.id === parsed.best_worker_id)
          const wName = matchedWorker ? (matchedWorker.profile?.display_name || matchedWorker.shadow_name) : 'Worker'
          actionTitle = `Assign ${wName} to new booking`
          actionDesc = `New booking from ${client_name} for ${booking.service_type?.name || service_code}. AI Match: ${parsed.reason}`
          actionPayload = { booking_id, worker_id: parsed.best_worker_id, hourly_rate: booking.quoted_rate || 15 }
        } else {
          actionTitle = `Unassigned Booking from ${client_name}`
          actionDesc = parsed.reason || 'Please review and manually assign a worker.'
          actionType = 'manual_review'
          actionPayload = { booking_id }
        }
      } catch (e) {
        // Fallback if AI fails to parse
        actionTitle = `New Booking from ${client_name}`
        actionDesc = `Service: ${booking.service_type?.name || service_code}. Please assign a worker.`
        actionType = 'manual_review'
        actionPayload = { booking_id }
      }
    }

    // Insert into Action Inbox
    const { data: inboxItem } = await supabase
      .from('nanny_action_inbox')
      .insert({
        org_id: org.id,
        title: actionTitle,
        message: actionDesc,
        action_type: actionType,
        action_payload: actionPayload,
        status: 'pending'
      })
      .select()
      .single()

    // Dispatch Push Notification to org members
    await fetch(new URL('/api/messaging/send', req.url).toString(), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        org_id: org.id,
        title: actionTitle,
        body: actionDesc,
        data: { url: '/dashboard/agency/nanny/copilot' }
      })
    }).catch(() => {})

    return NextResponse.json({ success: true, inboxItem })
  } catch (error: any) {
    console.error('Booking AI Webhook Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
