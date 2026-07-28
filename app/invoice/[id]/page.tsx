import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InvoiceClient from './InvoiceClient'
import Script from 'next/script'

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  // Fetch invoice, linked client info, and invoice items using Service Role (anonymous access)
  const { data: invoice, error } = await supabase
    .from('nanny_invoices')
    .select(`
      *,
      nanny_clients(client_name, client_email),
      nanny_invoice_items(*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !invoice) {
    return notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      <div className="max-w-3xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Case+</h1>
        <p className="mt-2 text-sm text-gray-500">Secure Payment Portal</p>
      </div>
      <div className="max-w-3xl mx-auto">
        <InvoiceClient invoice={invoice} />
      </div>
    </div>
  )
}
