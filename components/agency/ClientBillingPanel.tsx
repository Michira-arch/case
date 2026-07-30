'use client'

import { useState } from 'react'
import { openPaystackCheckout } from '@/lib/paystack'
import { CreditCard, Loader2 } from 'lucide-react'

export default function ClientBillingPanel({ client }: { client: any }) {
  const [processing, setProcessing] = useState(false)

  const handleAddCard = () => {
    setProcessing(true)
    openPaystackCheckout({
      email: client.client_email || 'client@example.com',
      amountKes: 10, // Small authorization charge, usually reversible
      reference: `AUTH-${client.id}-${Date.now()}`,
      isSubscription: true, // we just want to save the card
      onSuccess: async (ref) => {
        // Save to backend
        const res = await fetch('/api/billing/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            reference: ref, 
            isClient: true, 
            clientId: client.id,
            plan: 'client_saved_card'
          }),
        })

        if (!res.ok) {
          alert('Failed to save card.')
        } else {
          alert('Card saved successfully!')
          window.location.reload()
        }
        setProcessing(false)
      },
      onClose: () => {
        setProcessing(false)
      }
    })
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <h2 className="text-xl font-bold mb-4">Billing & Payments</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Save a card on file to automatically pay for your upcoming recurring bills or invoices from the agency.
      </p>

      {client.paystack_auth_code ? (
        <div className="flex items-center gap-3 p-4 bg-gray-50 border rounded-md">
          <CreditCard className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-medium text-gray-900">Card saved and active</p>
            <p className="text-xs text-gray-500">Your payments will be processed automatically.</p>
          </div>
          <button 
            onClick={handleAddCard}
            disabled={processing}
            className="ml-auto text-sm text-blue-600 hover:underline"
          >
            Update Card
          </button>
        </div>
      ) : (
        <button
          onClick={handleAddCard}
          disabled={processing}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Add Payment Method
        </button>
      )}
    </div>
  )
}
