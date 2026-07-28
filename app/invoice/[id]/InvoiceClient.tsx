'use client'

import React, { useState, useEffect } from 'react'
import { openPaystackCheckout } from '@/lib/paystack'
import { useRouter } from 'next/navigation'

export default function InvoiceClient({ invoice }: { invoice: any }) {
  const router = useRouter()
  const [isPaying, setIsPaying] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const clientName = invoice.nanny_clients?.client_name || 'Valued Client'
  const clientEmail = invoice.nanny_clients?.client_email || 'guest@example.com'
  const isPaid = invoice.invoice_state === 'paid'
  const amount = invoice.total

  const handlePayment = () => {
    setIsPaying(true)
    openPaystackCheckout({
      email: clientEmail,
      amountKes: amount,
      reference: `INV-${invoice.id.split('-')[0]}-${Date.now()}`,
      invoiceId: invoice.id,
      onSuccess: (ref) => {
        // Poll or refresh to show paid state
        router.refresh()
      },
      onClose: () => {
        setIsPaying(false)
      }
    })
  }

  if (!mounted) return null

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
        <div>
          <h3 className="text-xl leading-6 font-bold text-gray-900">Invoice {invoice.invoice_number}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Billed to: {clientName}</p>
        </div>
        <div>
          {isPaid ? (
            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              Paid
            </span>
          ) : (
            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Pending
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-5 sm:p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Invoice Details</h4>
        <ul className="divide-y divide-gray-200">
          {invoice.nanny_invoice_items?.map((item: any) => (
            <li key={item.id} className="py-4 flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.description}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-medium text-gray-900">KES {Number(item.line_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </li>
          ))}
          {invoice.nanny_invoice_items?.length === 0 && (
            <li className="py-4 text-sm text-gray-500 text-center">No items listed.</li>
          )}
        </ul>
        <div className="mt-6 border-t border-gray-200 pt-4 flex justify-between items-center">
          <p className="text-base font-semibold text-gray-900">Total Amount Due</p>
          <p className="text-xl font-bold text-gray-900">KES {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        <div className="mt-8 text-center">
          {isPaid ? (
            <div className="p-4 bg-green-50 rounded-md border border-green-200">
              <p className="text-green-800 font-medium text-lg">This invoice has already been paid.</p>
              <p className="text-sm text-green-600 mt-1">Thank you for your business!</p>
            </div>
          ) : (
            <button
              onClick={handlePayment}
              disabled={isPaying}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isPaying ? 'Processing...' : `Pay KES ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Now`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
