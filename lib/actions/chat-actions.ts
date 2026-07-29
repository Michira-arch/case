'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { sendAgencyEmail } from '@/lib/email'

export async function sendChatMessage({
  clientId,
  orgId,
  message,
  senderType,
  senderId
}: {
  clientId: string
  orgId: string
  message: string
  senderType: 'agency' | 'client'
  senderId?: string
}) {
  const supabase = createServiceClient()

  // 1. Insert message
  const { data: newMessage, error } = await supabase
    .from('nanny_client_messages')
    .insert({
      client_id: clientId,
      org_id: orgId,
      message,
      sender_type: senderType,
      sender_id: senderId
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to send message: ' + error.message)
  }

  // 2. Fetch client details and org details for notifications
  const { data: client } = await supabase
    .from('nanny_clients')
    .select('client_name, client_email')
    .eq('id', clientId)
    .single()

  const { data: org } = await supabase
    .from('nanny_orgs')
    .select('name, contact_email')
    .eq('id', orgId)
    .single()

  if (senderType === 'agency' && client?.client_email) {
    // Send email to client
    const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/portal/clients/${clientId}`
    await sendAgencyEmail({
      orgId,
      to: client.client_email,
      subject: 'New message from ' + (org?.name || 'your agency'),
      preheader: 'You have a new message regarding your caregiving services.',
      htmlBody: `
        <p>Hi ${client.client_name},</p>
        <p>You have a new message from ${org?.name || 'us'}:</p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 16px; font-style: italic;">
          ${message}
        </blockquote>
        <a href="${portalUrl}" class="btn">View & Reply</a>
      `
    })
  } else if (senderType === 'client' && org?.contact_email) {
    // Send email to agency
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/agency/nanny/clients/${clientId}`
    await sendAgencyEmail({
      orgId,
      to: org.contact_email,
      subject: 'New message from client: ' + (client?.client_name || 'Client'),
      preheader: 'A client has sent you a new message.',
      htmlBody: `
        <p>You have a new message from <strong>${client?.client_name}</strong>:</p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 16px; font-style: italic;">
          ${message}
        </blockquote>
        <a href="${dashboardUrl}" class="btn">View & Reply in Dashboard</a>
      `
    })
  }

  return { success: true, message: newMessage }
}

export async function getChatMessages(clientId: string) {
  const supabase = createServiceClient()
  
  const { data, error } = await supabase
    .from('nanny_client_messages')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error('Failed to fetch messages: ' + error.message)
  }

  return data
}
