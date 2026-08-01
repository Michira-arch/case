import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ChatUI from '@/components/ChatUI'
import ClientBillingPanel from '@/components/agency/ClientBillingPanel'

interface PageProps {
  params: { id: string }
  searchParams: { token?: string }
}

export default async function ClientPortalPage({ params, searchParams }: PageProps): Promise<JSX.Element> {
  const p = await params
  const sp = await searchParams
  const token = sp?.token

  const supabase = createServiceClient()

  // Fetch client and org info using Service Role (portal is reached via an emailed token link)
  const { data: client, error } = await supabase
    .from('nanny_clients')
    .select(`
      *,
      nanny_orgs (
        id,
        name,
        logo_url,
        profiles (avatar_url)
      )
    `)
    .eq('id', p.id)
    .single()

  if (error || !client) {
    return notFound()
  }

  const org = client.nanny_orgs
  if (!org) return notFound()

  // The portal is opened via a per-client secret token. Without a matching
  // token (or an authenticated agency member) we do not render it.
  const authClient = createServiceClient()
  let authorized = false
  if (token && client.portal_token && token === client.portal_token) {
    authorized = true
  } else {
    // Allow authenticated agency members to view their client's portal
    const cookieClient = createClient()
    const { data: { user } } = await cookieClient.auth.getUser()
    if (user) {
      const { data: profiles } = await authClient
        .from('profiles')
        .select('id')
        .eq('owner_id', user.id)
      const profileIds = (profiles || []).map((x: any) => x.id)
      if (profileIds.length > 0) {
        const { data: members } = await authClient
          .from('nanny_org_members')
          .select('org_id')
          .in('profile_id', profileIds)
          .eq('org_id', org.id)
        if (members && members.length > 0) authorized = true
      }
    }
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600">
          This portal link is invalid or expired. Please use the link from your email, or contact your agency.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto mb-8 text-center flex flex-col items-center">
        {org.logo_url ? (
          <img src={org.logo_url} alt={org.name} className="h-16 w-auto mb-4 object-contain rounded-md" />
        ) : org.profiles?.avatar_url ? (
          <img src={org.profiles.avatar_url} alt={org.name} className="h-16 w-16 mb-4 rounded-full object-cover" />
        ) : null}
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{org.name || 'Caregiving Agency'}</h1>
        <p className="mt-2 text-sm text-gray-500">Client Portal</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Welcome, {client.client_name}</h2>
          <p className="text-gray-600 mb-6">
            Use this portal to communicate with us. Let us know if you have any questions about your bookings or services.
          </p>
          <ChatUI
            clientId={client.id}
            orgId={org.id}
            senderType="client"
            token={token}
          />
        </div>

        <ClientBillingPanel client={client} token={token} />
      </div>
    </div>
  )
}
