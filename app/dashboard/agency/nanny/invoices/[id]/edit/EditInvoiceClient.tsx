'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { NannyInvoice, InvoiceState } from '@/lib/nanny-types'
import { formatCurrency } from '@/lib/nanny-utils'

interface Props {
  invoice: NannyInvoice
}

export default function EditInvoiceClient({ invoice }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [state, setState] = useState<InvoiceState>(invoice.invoice_state)
  const [notes, setNotes] = useState(invoice.notes || '')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/agency/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_state: state, notes })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to update invoice')
      
      router.push('/dashboard/agency/nanny/invoices')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ marginBottom: 32 }}>
        <a href="/dashboard/agency/nanny/invoices" style={{ fontSize: 13, color: 'var(--ink-muted)', textDecoration: 'none' }}>
          ← Back to Invoices
        </a>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, color: 'var(--ink)', marginTop: 16 }}>
          Edit Invoice {invoice.invoice_number}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginTop: 4 }}>
          Total: {formatCurrency(invoice.total, invoice.currency)}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 12, borderRadius: 6, fontSize: 14 }}>
            ⚠ {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Status</label>
          <select 
            value={state} 
            onChange={e => setState(e.target.value as InvoiceState)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)' }}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="voided">Voided</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Internal Notes</label>
          <textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', resize: 'vertical' }}
            placeholder="Notes visible only to agency..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
          <button type="button" onClick={() => router.push('/dashboard/agency/nanny/invoices')} className="btn btn--outline">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn--dark">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
