'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendAgencyEmail } from '@/lib/email'

/**
 * Authorize access to a client's conversation.
 *
 * A caller may read/write a client's chat if ANY of these hold:
 *  1. They present the client's `portal_token` (the emailed portal link).
 *  2. They present a valid invoice id that belongs to this client (the emailed
 *     invoice link — bearer-UUID model, same as the invoice page).
 *  3. They are an authenticated member/owner of the client's agency.
 *
 * Returns 'agency' | 'client' or throws.
 */
async function authorizeAccess(
  clientId: string,
  opts: { token?: string; invoiceId?: string } = {}
): Promise<'agency' | 'client'> {
  const supabase = createServiceClient()

  const { data: client, error } = await supabase
    .from('nanny_clients')
    .select('id, org_id, portal_token')
    .eq('id', clientId)
    .single()

  if (error || !client) {
    throw new Error('Client not found')
  }

  // 1. Portal token
  if (opts.token && client.portal_token && opts.token === client.portal_token) {
    return 'client'
  }

  // 2. Invoice bearer access (anyone holding a valid invoice link for this client)
  if (opts.invoiceId) {
    const { data: invoice } = await supabase
      .from('nanny_invoices')
      .select('id')
      .eq('id', opts.invoiceId)
      .eq('client_id', clientId)
      .maybeSingle()
    if (invoice) return 'client'
  }

  // 3. Authenticated agency member of the client's org
  const authClient = createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (user) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
    const profileIds = (profiles || []).map((p: any) => p.id)
    if (profileIds.length > 0) {
      const { data: members } = await supabase
        .from('nanny_org_members')
        .select('org_id')
        .in('profile_id', profileIds)
        .eq('org_id', client.org_id)
      if (members && members.length > 0) return 'agency'

      // Org owner (may not have a nanny_org_members row for orgs created before
      // the membership trigger, or when the owner was reassigned)
      const { data: owned } = await supabase
        .from('nanny_orgs')
        .select('id')
        .eq('id', client.org_id)
        .in('owner_profile_id', profileIds)
        .maybeSingle()
      if (owned) return 'agency'
    }
  }

  throw new Error('Not authorized to access this conversation')
}

export async function sendChatMessage({
  clientId,
  orgId,
  message,
  senderType,
  senderId,
  token,
  invoiceId,
}: {
  clientId: string
  orgId: string
  message: string
  senderType: 'agency' | 'client'
  senderId?: string
  token?: string
  invoiceId?: string
}) {
  const mode = await authorizeAccess(clientId, { token, invoiceId })

  // Agency must be a real member; a client-side sender needs link access.
  // Anyone with legitimate access may send, but we prevent an attacker who
  // somehow holds a client link from sending as the agency.
  if (senderType === 'agency' && mode !== 'agency') {
    throw new Error('Not authorized to send as agency')
  }

  const supabase = createServiceClient()

  // 1. Insert message
  const { data: newMessage, error } = await supabase
    .from('nanny_client_messages')
    .insert({
      client_id: clientId,
      org_id: orgId,
      message,
      sender_type: senderType,
      sender_id: senderId,
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to send message: ' + error.message)
  }

  // 2. Fetch client details and org details for notifications
  const { data: client } = await supabase
    .from('nanny_clients')
    .select('client_name, client_email, portal_token')
    .eq('id', clientId)
    .single()

  const { data: org } = await supabase
    .from('nanny_orgs')
    .select('name, contact_email')
    .eq('id', orgId)
    .single()

  if (senderType === 'agency' && client?.client_email) {
    // Send email to client, linking them to their portal with their token
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://caseshow.info'
    const tokenParam = client.portal_token ? `?token=${encodeURIComponent(client.portal_token)}` : ''
    const portalUrl = `${base}/portal/clients/${clientId}${tokenParam}`
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
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://caseshow.info'
    const dashboardUrl = `${base}/dashboard/agency/nanny/clients/${clientId}`
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

export async function getChatMessages(
  clientId: string,
  opts: { token?: string; invoiceId?: string } = {}
) {
  await authorizeAccess(clientId, opts)

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
