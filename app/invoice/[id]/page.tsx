import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InvoiceClient from './InvoiceClient'
import Script from 'next/script'
import ChatUI from '@/components/ChatUI'
import { headers } from 'next/headers'

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  
  // Detect if user is in Kenya via Vercel headers (defaults to true for local dev safety)
  const headersList = headers()
  const countryCode = headersList.get('x-vercel-ip-country')
  const isKenya = !countryCode || countryCode === 'KE'

  // Fetch invoice, linked client info, and invoice items using Service Role (anonymous access)
  const { data: invoice, error } = await supabase
    .from('nanny_invoices')
    .select(`
      *,
      nanny_clients(id, client_name, client_email),
      nanny_invoice_items(*),
      nanny_orgs(id, name, logo_url, profiles(avatar_url, display_name))
    `)
    .eq('id', params.id)
    .single()

  if (error || !invoice) {
    return notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
      <div className="max-w-3xl mx-auto mb-8 text-center flex flex-col items-center">
        {invoice.nanny_orgs?.logo_url ? (
          <img src={invoice.nanny_orgs.logo_url} alt={invoice.nanny_orgs.name} className="h-16 w-auto mb-4 object-contain rounded-md" />
        ) : invoice.nanny_orgs?.profiles?.avatar_url ? (
          <img src={invoice.nanny_orgs.profiles.avatar_url} alt={invoice.nanny_orgs.name} className="h-16 w-16 mb-4 rounded-full object-cover" />
        ) : null}
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{invoice.nanny_orgs?.name || 'Case+'}</h1>
        <p className="mt-2 text-sm text-gray-500">Secure Payment Portal</p>
      </div>
      <div className="max-w-3xl mx-auto space-y-8">
        <InvoiceClient invoice={invoice} isKenya={isKenya} />
        
        {invoice.client_id && invoice.org_id && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Contact {invoice.nanny_orgs?.name}</h2>
            <ChatUI 
              clientId={invoice.client_id}
              orgId={invoice.org_id}
              senderType="client"
            />
          </div>
        )}
      </div>
    </div>
  )
}
