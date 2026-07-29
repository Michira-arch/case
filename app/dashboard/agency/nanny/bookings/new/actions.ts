'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createManualBookingAction(formData: FormData) {
  const supabase = createClient()
  
  const orgId = formData.get('org_id') as string
  const isNewClient = formData.get('is_new_client') === 'true'
  const serviceTypeId = formData.get('service_type_id') as string
  const workerId = formData.get('worker_id') as string
  const address = formData.get('service_address') as string
  
  const startStr = formData.get('scheduled_start') as string
  const endStr = formData.get('scheduled_end') as string
  const rateStr = formData.get('quoted_rate') as string
  const bookingState = formData.get('booking_state') as string || 'completed'
  
  if (!orgId || !serviceTypeId || !address || !startStr || !endStr) {
    return { error: 'Missing required fields' }
  }

  if (bookingState !== 'open' && !workerId) {
    return { error: 'A worker must be assigned unless the status is Open' }
  }

  let clientId = formData.get('client_id') as string

  // Create new client if requested
  if (isNewClient) {
    const clientName = formData.get('new_client_name') as string
    const clientEmail = formData.get('new_client_email') as string
    const clientPhone = formData.get('new_client_phone') as string
    
    if (!clientName) {
      return { error: 'Client name is required for a new client' }
    }
    
    const { data: newClient, error: clientErr } = await supabase
      .from('nanny_clients')
      .insert({
        org_id: orgId,
        client_name: clientName,
        client_email: clientEmail || null,
        client_phone: clientPhone || null,
        client_type: 'family',
        status: 'active'
      })
      .select('id')
      .single()
      
    if (clientErr || !newClient) {
      console.error('Error creating client:', clientErr)
      return { error: 'Failed to create client.' }
    }
    clientId = newClient.id
  }

  if (!clientId) {
    return { error: 'No client selected' }
  }

  // Generate reference
  const randomNum = Math.floor(100000 + Math.random() * 900000)
  const reference = `EXT-${randomNum}`

  const scheduledStart = new Date(startStr).toISOString()
  const scheduledEnd = new Date(endStr).toISOString()
  const quotedRate = rateStr ? parseFloat(rateStr) : 0

  // Insert Booking
  const initialBookingState = bookingState === 'completed' ? 'in_progress' : bookingState
  
  const { data: booking, error: bookingErr } = await supabase
    .from('nanny_bookings')
    .insert({
      org_id: orgId,
      client_id: clientId,
      service_type_id: serviceTypeId,
      reference,
      booking_state: initialBookingState,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      actual_start: bookingState === 'in_progress' || bookingState === 'completed' ? scheduledStart : null,
      service_address: address,
      quoted_rate: quotedRate,
      source: 'admin'
    })
    .select('id')
    .single()

  if (bookingErr || !booking) {
    console.error('Error creating booking:', bookingErr)
    return { error: 'Failed to create booking.' }
  }

  // If a worker is assigned (i.e. not open), create assignment
  if (workerId) {
    let assignmentState = 'scheduled'
    if (bookingState === 'in_progress' || bookingState === 'completed') {
      assignmentState = 'in_progress'
    }

    const { data: assignment, error: assignErr } = await supabase
      .from('nanny_assignments')
      .insert({
        booking_id: booking.id,
        worker_id: workerId,
        org_id: orgId,
        assignment_state: assignmentState,
        base_amount: quotedRate
      })
      .select('id')
      .single()

    if (assignErr || !assignment) {
      console.error('Error creating assignment:', assignErr)
      return { error: 'Failed to create assignment.' }
    }

    // Only complete if they selected completed
    if (bookingState === 'completed') {
      const hours = (new Date(scheduledEnd).getTime() - new Date(scheduledStart).getTime()) / (1000 * 60 * 60);

      const { error: completeErr } = await supabase.rpc('nanny_complete_assignment', {
        p_assignment_id: assignment.id,
        p_clocked_out_at: scheduledEnd,
        p_hours_worked: hours > 0 ? hours : 1
      })

      if (completeErr) {
        console.error('Error completing assignment:', completeErr)
        return { error: 'Failed to generate invoice for booking.' }
      }
    }
  }

  revalidatePath('/dashboard/agency/nanny/bookings')
  return { success: true, bookingId: booking.id }
}
