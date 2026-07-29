'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function assignWorkerWithCustomPricing(formData: FormData) {
  const supabase = createClient()
  
  const bookingId = formData.get('booking_id') as string
  const workerId = formData.get('worker_id') as string
  const customPricing = formData.get('custom_pricing') === 'true'
  
  if (!bookingId || !workerId) {
    return { error: 'Missing required fields' }
  }

  // Get current booking to get org_id
  const { data: booking, error: bookingErr } = await supabase
    .from('nanny_bookings')
    .select('org_id, quoted_rate')
    .eq('id', bookingId)
    .single()

  if (bookingErr || !booking) {
    return { error: 'Booking not found' }
  }

  // Handle custom pricing fields
  let rate = Number(formData.get('rate')) || booking.quoted_rate || 15
  
  const updateData: Record<string, any> = {}
  
  if (customPricing) {
    const pricingModel = formData.get('pricing_model') as string
    const unitRate = Number(formData.get('unit_rate'))
    const commissionPct = Number(formData.get('agency_commission_pct'))
    const flatPlacementFee = Number(formData.get('flat_placement_fee'))
    
    updateData.custom_pricing_enabled = true
    updateData.pricing_model = pricingModel
    updateData.unit_rate = unitRate
    updateData.agency_commission_pct = commissionPct
    
    if (flatPlacementFee) {
      updateData.advanced_settings = { flat_placement_fee: flatPlacementFee }
    } else {
      updateData.advanced_settings = null
    }
    
    rate = unitRate // set assignment rate to the custom unit rate
    
    // Update booking with custom pricing settings
    const { error: updateErr } = await supabase
      .from('nanny_bookings')
      .update(updateData)
      .eq('id', bookingId)
      
    if (updateErr) {
      console.error('Error updating custom pricing:', updateErr)
      return { error: 'Failed to update custom pricing settings' }
    }
  }

  // Create Assignment
  const { error: assignErr } = await supabase
    .from('nanny_assignments')
    .insert({
      booking_id: bookingId,
      worker_id: workerId,
      org_id: booking.org_id,
      assignment_state: 'scheduled',
      hourly_rate: rate,
      base_amount: rate
    })

  if (assignErr) {
    console.error('Error creating assignment:', assignErr)
    return { error: 'Failed to assign worker' }
  }
  
  // Update booking state to scheduled/matched
  await supabase
    .from('nanny_bookings')
    .update({ booking_state: 'scheduled' })
    .eq('id', bookingId)

  revalidatePath(`/dashboard/agency/nanny/bookings/${bookingId}`)
  
  return { success: true }
}
