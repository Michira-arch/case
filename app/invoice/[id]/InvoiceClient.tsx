'use client'

import React, { useState, useEffect } from 'react'
import { openPaystackCheckout } from '@/lib/paystack'
import { useRouter } from 'next/navigation'

export default function InvoiceClient({ invoice, isKenya = true }: { invoice: any, isKenya?: boolean }) {
  const router = useRouter()
  const [isPaying, setIsPaying] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [phone, setPhone] = useState('')
  const [chargeStatus, setChargeStatus] = useState<'idle' | 'loading' | 'stk_pushed' | 'success' | 'error'>('idle')
  const [chargeMessage, setChargeMessage] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Poll for success if STK was pushed
  useEffect(() => {
    if (chargeStatus === 'stk_pushed') {
      const interval = setInterval(() => {
        // Here we would ideally ping our backend to check the invoice status.
        // For now, we will just reload the page after 15 seconds to check if paid.
        // Or user can manually refresh. We just rely on webhook in background.
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [chargeStatus])

  const clientName = invoice.nanny_clients?.client_name || 'Valued Client'
  const clientEmail = invoice.nanny_clients?.client_email || 'guest@example.com'
  const isPaid = invoice.invoice_state === 'paid'
  const amount = invoice.total

  const handlePaymentPopup = () => {
    setIsPaying(true)
    openPaystackCheckout({
      email: clientEmail,
      amountKes: amount,
      reference: `INV-${invoice.id.split('-')[0]}-${Date.now()}`,
      invoiceId: invoice.id,
      subaccount: invoice.nanny_orgs?.paystack_subaccount_code || undefined,
      onSuccess: (ref) => {
        router.refresh()
      },
      onClose: () => {
        setIsPaying(false)
      }
    })
  }

  const handleMpesaDirect = async () => {
    if (!phone || phone.length < 9) {
      setChargeStatus('error')
      setChargeMessage('Please enter a valid M-Pesa phone number')
      return
    }

    setChargeStatus('loading')
    setChargeMessage('')

    try {
      const reference = `INV-${invoice.id.split('-')[0]}-${Date.now()}`
      const subaccount = invoice.nanny_orgs?.paystack_subaccount_code || undefined

      const res = await fetch('/api/paystack/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clientEmail,
          amountKes: amount,
          phone,
          invoiceId: invoice.id,
          reference,
          subaccount
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate STK push')
      }

      setChargeStatus('stk_pushed')
      setChargeMessage('Check your phone! An M-Pesa PIN prompt has been sent to ' + phone)
      
      // Auto-refresh the page after 15 seconds to check for payment completion (webhook takes a few seconds)
      setTimeout(() => {
        router.refresh()
      }, 15000)

    } catch (err: any) {
      console.error(err)
      setChargeStatus('error')
      setChargeMessage(err.message || 'Something went wrong.')
    }
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

        <div className="mt-8">
          {isPaid ? (
            <div className="text-center p-4 bg-green-50 rounded-md border border-green-200">
              <p className="text-green-800 font-medium text-lg">This invoice has already been paid.</p>
              <p className="text-sm text-green-600 mt-1">Thank you for your business!</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-md mx-auto">
              {isKenya && (
                <>
                  {/* Primary Fast Path: M-Pesa Direct */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Pay with M-Pesa</h4>
                    <p className="text-sm text-gray-500 mb-4">Enter your M-Pesa number to receive a payment prompt on your phone immediately.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="phone" className="sr-only">Phone Number</label>
                        <input
                          type="tel"
                          id="phone"
                          placeholder="e.g. 0712345678"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          disabled={chargeStatus === 'loading' || chargeStatus === 'stk_pushed'}
                        />
                      </div>

                      {chargeStatus === 'error' && (
                        <p className="text-sm text-red-600">{chargeMessage}</p>
                      )}
                      {chargeStatus === 'stk_pushed' && (
                        <div className="flex items-center space-x-2 text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                          <div className="animate-spin h-4 w-4 border-2 border-green-700 border-t-transparent rounded-full" />
                          <p className="text-sm font-medium">{chargeMessage}</p>
                        </div>
                      )}

                      <button
                        onClick={handleMpesaDirect}
                        disabled={chargeStatus === 'loading' || chargeStatus === 'stk_pushed' || !phone}
                        className="w-full inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                      >
                        {chargeStatus === 'loading' ? 'Sending Prompt...' : `Pay KES ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </button>
                    </div>
                  </div>

                  {/* Secondary Catch-All: Paystack Popup */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 bg-white text-sm text-gray-500">Or use another method</span>
                    </div>
                  </div>
                </>
              )}

              <div className="text-center">
                <button
                  onClick={handlePaymentPopup}
                  disabled={isPaying || chargeStatus === 'loading' || chargeStatus === 'stk_pushed'}
                  className={isKenya 
                    ? "w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    : "w-full inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                  }
                >
                  {isPaying ? (isKenya ? 'Loading...' : 'Processing...') : (isKenya ? 'Pay with Card / Other' : `Pay KES ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Now`)}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
