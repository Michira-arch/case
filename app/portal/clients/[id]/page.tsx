import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ChatUI from '@/components/ChatUI'
import ClientBillingPanel from '@/components/agency/ClientBillingPanel'

interface PageProps {
  params: { id: string }
}

export default async function ClientPortalPage({ params }: PageProps): Promise<JSX.Element> {
  const supabase = createServiceClient()

  // Fetch client and org info using Service Role (since it's accessed via magic link/anon ID)
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
    .eq('id', params.id)
    .single()

  if (error || !client) {
    return notFound()
  }

  const org = client.nanny_orgs
  if (!org) return notFound()

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
          />
        </div>
        
        <ClientBillingPanel client={client} />
      </div>
    </div>
  )
}
