'use client'

import React, { useState } from 'react'
import styles from './agencyOS.module.css'

interface InvoiceSplitEngineProps {
  agency: any
  rosterMembers: any[]
  transactions: any[]
}

export default function InvoiceSplitEngine({ agency, rosterMembers, transactions }: InvoiceSplitEngineProps) {
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [clientEmail, setClientEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [totalAmount, setTotalAmount] = useState<number | ''>('')
  const [selectedTalentId, setSelectedTalentId] = useState('')
  const [loading, setLoading] = useState(false)

  const defaultSplitPct = agency?.rules?.default_agency_split_pct || 20
  const totalNum = Number(totalAmount) || 0
  const agencyCut = Math.round(totalNum * (defaultSplitPct / 100))
  const talentCut = totalNum - agencyCut

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/agency/split-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agency_id: agency.id,
          client_email: clientEmail,
          title: jobTitle,
          total_amount: totalNum,
          talent_user_id: selectedTalentId,
          agency_cut_amount: agencyCut,
          talent_cut_amount: talentCut,
        }),
      })
      if (res.ok) {
        setIsInvoiceModalOpen(false)
        window.location.reload()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className={styles.card}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Total Invoiced</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '0.4rem' }}>
            {agency.currency} {transactions.reduce((acc, t) => acc + Number(t.total_amount || 0), 0).toLocaleString()}
          </div>
        </div>

        <div className={styles.card}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Agency Net Cut</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8', marginTop: '0.4rem' }}>
            {agency.currency} {transactions.reduce((acc, t) => acc + Number(t.agency_cut_amount || 0), 0).toLocaleString()}
          </div>
        </div>

        <div className={styles.card}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Talent Payouts</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '0.4rem' }}>
            {agency.currency} {transactions.reduce((acc, t) => acc + Number(t.talent_cut_amount || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Invoice Generator Button & Transactions */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          <span>Client Invoice & Payout Ledger</span>
          <button onClick={() => setIsInvoiceModalOpen(true)} className={styles.btnPrimary}>
            + Create Split Invoice
          </button>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
            No transactions or client invoices recorded yet. Click "Create Split Invoice" to send an invoice link to a client.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f3f4f6', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Job Title</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Client</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Total</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Agency Cut</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Talent Cut</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{t.title}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#9ca3af' }}>{t.client_email}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{agency.currency} {t.total_amount}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#818cf8' }}>{agency.currency} {t.agency_cut_amount}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#34d399' }}>{agency.currency} {t.talent_cut_amount}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className={`${styles.badge} ${t.status === 'successful' ? styles.badgeSuccess : styles.badgeWarning}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Generator Modal */}
      {isInvoiceModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 style={{ marginTop: 0 }}>Create Split Client Invoice</h3>
            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Client Email</label>
                <input
                  type="email"
                  required
                  placeholder="client@company.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#11141b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Job Title / Description</label>
                <input
                  type="text"
                  required
                  placeholder="Event Catering & Styling Package"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#11141b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Assigned Talent</label>
                <select
                  required
                  value={selectedTalentId}
                  onChange={(e) => setSelectedTalentId(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#11141b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                >
                  <option value="">Select Talent Member...</option>
                  {rosterMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.display_name} (@{m.profiles?.handle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Total Amount ({agency.currency})</label>
                <input
                  type="number"
                  required
                  placeholder="50000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', background: '#11141b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </div>

              {totalNum > 0 && (
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.85rem', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Agency ({defaultSplitPct}%): <strong>{agency.currency} {agencyCut.toLocaleString()}</strong></span>
                  <span>Talent ({100 - defaultSplitPct}%): <strong>{agency.currency} {talentCut.toLocaleString()}</strong></span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className={styles.btnSecondary}>Cancel</button>
                <button type="submit" disabled={loading} className={styles.btnPrimary}>
                  {loading ? 'Creating...' : 'Create & Generate Payment Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
