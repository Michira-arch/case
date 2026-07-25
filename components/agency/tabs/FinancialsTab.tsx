'use client';

import React, { useEffect, useState } from 'react';

type Transaction = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  debit_account: string;
  credit_account: string;
  reference_id: string;
  created_at: string;
};

type PayoutLedger = {
  id: string;
  user_id: string;
  available_balance: number;
  currency: string;
  last_payout_at: string;
  user_name?: string; // Appended for UI
};

type Pitch = {
  id: string;
  client_email: string;
  total_value: number;
  currency: string;
  status: string;
  created_at: string;
  token: string;
};

export default function FinancialsTab({ agencyId }: { agencyId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledgers, setLedgers] = useState<PayoutLedger[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);
  const [pitchStep, setPitchStep] = useState(1);
  const [pitchData, setPitchData] = useState({ clientEmail: '', title: '', due: '', items: [] as any[], talentId: '', cut: 20 });

  useEffect(() => {
    fetch(`/api/agency/${agencyId}/transactions`).then(res => res.json()).then(data => setTransactions(data.transactions || []));
    fetch(`/api/agency/${agencyId}/payouts`).then(res => res.json()).then(data => setLedgers(data.payouts || []));
    fetch(`/api/agency/${agencyId}/pitches`).then(res => res.json()).then(data => setPitches(data.pitches || []));
  }, [agencyId]);

  const kpis = {
    totalInvoiced: pitches.filter(p => p.status === 'accepted' || p.status === 'sent').reduce((sum, p) => sum + p.total_value, 0),
    agencyRevenue: transactions.filter(t => t.credit_account.startsWith('agency_revenue')).reduce((sum, t) => sum + t.amount, 0),
    talentPayable: ledgers.reduce((sum, l) => sum + l.available_balance, 0),
    escrow: transactions.filter(t => t.debit_account === 'escrow_inbound').reduce((sum, t) => sum + t.amount, 0) - transactions.filter(t => t.credit_account === 'escrow_outbound').reduce((sum, t) => sum + t.amount, 0)
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'client_payment': return '#3b82f6';
      case 'agency_revenue': return '#6366f1';
      case 'talent_payable': return '#10b981';
      case 'payout': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const requestPayout = async (userId: string, amount: number, currency: string) => {
    if (confirm(`Request payout of ${currency} ${amount}?`)) {
      await fetch(`/api/agency/${agencyId}/payouts`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, amount, currency }),
        headers: { 'Content-Type': 'application/json' }
      });
      fetch(`/api/agency/${agencyId}/payouts`).then(res => res.json()).then(data => setLedgers(data.payouts || []));
    }
  };

  const createPitch = async (send: boolean) => {
    const total = pitchData.items.reduce((sum, it) => sum + (it.qty * it.price), 0);
    const res = await fetch(`/api/agency/${agencyId}/pitches`, {
      method: 'POST',
      body: JSON.stringify({
        client_email: pitchData.clientEmail,
        created_by: 'system',
        total_value: total,
        currency: 'USD',
        payload: pitchData
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    const { pitch } = await res.json();
    if (send) {
      await fetch(`/api/agency/${agencyId}/pitches/${pitch.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'sent' }),
        headers: { 'Content-Type': 'application/json' }
      });
    }
    setIsPitchModalOpen(false);
    fetch(`/api/agency/${agencyId}/pitches`).then(res => res.json()).then(data => setPitches(data.pitches || []));
  };

  return (
    <div style={{ padding: '24px', color: '#fff', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Financial Engine</h1>
        <button 
          onClick={() => { setPitchStep(1); setIsPitchModalOpen(true); }}
          style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          + New Pitch
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {[
          { label: 'Total Invoiced', value: `$${kpis.totalInvoiced.toLocaleString()}` },
          { label: 'Agency Revenue (20%)', value: `$${kpis.agencyRevenue.toLocaleString()}` },
          { label: 'Total Talent Payable', value: `$${kpis.talentPayable.toLocaleString()}` },
          { label: 'Cash in Escrow', value: `$${kpis.escrow.toLocaleString()}` },
        ].map((kpi, i) => (
          <div key={i} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>{kpi.label}</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div>
          {/* Double Entry Ledger */}
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Double-Entry Ledger</h2>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '16px' }}>Date</th>
                  <th style={{ padding: '16px' }}>Type</th>
                  <th style={{ padding: '16px' }}>Debit Acc</th>
                  <th style={{ padding: '16px' }}>Credit Acc</th>
                  <th style={{ padding: '16px' }}>Amount</th>
                  <th style={{ padding: '16px' }}>Ref</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '16px', color: '#94a3b8' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold', backgroundColor: getBadgeColor(t.type) + '33', color: getBadgeColor(t.type) }}>
                        {t.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'monospace', color: '#cbd5e1' }}>{t.debit_account}</td>
                    <td style={{ padding: '16px', fontFamily: 'monospace', color: '#cbd5e1' }}>{t.credit_account}</td>
                    <td style={{ padding: '16px', fontWeight: 'bold' }}>{t.currency} {t.amount.toLocaleString()}</td>
                    <td style={{ padding: '16px', color: '#94a3b8', fontSize: '12px' }}>{t.reference_id}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No transactions recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Active Pitches */}
          <h2 style={{ fontSize: '20px', marginTop: '40px', marginBottom: '16px' }}>Active Pitches Pipeline</h2>
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
            {['draft', 'sent', 'viewed', 'accepted', 'rejected'].map(status => (
              <div key={status} style={{ flex: '0 0 280px', backgroundColor: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
                <h3 style={{ textTransform: 'capitalize', fontSize: '16px', margin: '0 0 16px 0', borderBottom: '2px solid #3b82f6', display: 'inline-block', paddingBottom: '4px' }}>{status}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pitches.filter(p => p.status === status).map(p => (
                    <div key={p.id} style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', wordBreak: 'break-all' }}>{p.client_email}</div>
                      <div style={{ color: '#10b981', fontWeight: 'bold', margin: '8px 0' }}>{p.currency} {p.total_value.toLocaleString()}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                        <a href={`/pitch/${p.token}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>View Link</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {/* Payout Ledger Panel */}
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Payout Ledger</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {ledgers.map(l => (
              <div key={l.id} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Talent {l.user_id.substring(0,6)}...</div>
                  <div style={{ color: '#94a3b8', fontSize: '14px' }}>Last Payout: {new Date(l.last_payout_at).toLocaleDateString()}</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '8px' }}>{l.currency} {l.available_balance.toLocaleString()}</div>
                </div>
                <button 
                  onClick={() => requestPayout(l.user_id, l.available_balance, l.currency)}
                  disabled={l.available_balance <= 0}
                  style={{ padding: '8px 16px', backgroundColor: l.available_balance > 0 ? '#f59e0b' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: l.available_balance > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
                >
                  Request Payout
                </button>
              </div>
            ))}
            {ledgers.length === 0 && (
              <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center', color: '#64748b' }}>No talent payouts pending.</div>
            )}
          </div>

          {/* PPP Subscription Info */}
          <h2 style={{ fontSize: '20px', marginTop: '40px', marginBottom: '16px' }}>PPP Subscription</h2>
          <div style={{ backgroundColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '24px', borderRadius: '12px', border: '1px solid #3b82f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>Current Tier</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>Tier 1 (US/EU)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>Renewal Date</div>
                <div style={{ fontWeight: 'bold' }}>Oct 12, 2026</div>
              </div>
            </div>
            <table style={{ width: '100%', fontSize: '14px' }}>
              <tbody>
                <tr><td style={{ padding: '8px 0', borderBottom: '1px solid #334155' }}>Tier 2 (Kenya, SA)</td><td style={{ textAlign: 'right', borderBottom: '1px solid #334155' }}>$49/mo (Equiv)</td></tr>
                <tr><td style={{ padding: '8px 0', borderBottom: '1px solid #334155' }}>Tier 3 (Nigeria)</td><td style={{ textAlign: 'right', borderBottom: '1px solid #334155' }}>$25/mo (Equiv)</td></tr>
                <tr><td style={{ padding: '8px 0' }}>Tier 4 (India, Egypt)</td><td style={{ textAlign: 'right' }}>$19/mo (Equiv)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isPitchModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '16px', width: '500px', border: '1px solid #334155' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Create Invoice / Pitch</h2>
            
            {pitchStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input placeholder="Client Email" value={pitchData.clientEmail} onChange={e => setPitchData({...pitchData, clientEmail: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }} />
                <input placeholder="Job Title" value={pitchData.title} onChange={e => setPitchData({...pitchData, title: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }} />
                <input type="date" value={pitchData.due} onChange={e => setPitchData({...pitchData, due: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }} />
                <button onClick={() => setPitchStep(2)} style={{ padding: '12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' }}>Next: Select Talent</button>
              </div>
            )}

            {pitchStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <select value={pitchData.talentId} onChange={e => setPitchData({...pitchData, talentId: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }}>
                  <option value="">Select Talent from Roster</option>
                  <option value="user_123">John Doe</option>
                  <option value="user_456">Jane Smith</option>
                </select>
                <div style={{ padding: '16px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>Add Line Item</div>
                  <button onClick={() => setPitchData({...pitchData, items: [...pitchData.items, { desc: 'Design work', qty: 1, price: 1000 }]})} style={{ padding: '8px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Add Item</button>
                  {pitchData.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <input value={it.desc} onChange={e => {const n = [...pitchData.items]; n[idx].desc = e.target.value; setPitchData({...pitchData, items: n})}} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }} />
                      <input type="number" value={it.price} onChange={e => {const n = [...pitchData.items]; n[idx].price = Number(e.target.value); setPitchData({...pitchData, items: n})}} style={{ width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }} />
                    </div>
                  ))}
                </div>
                
                <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px', border: '1px solid #10b981' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#10b981' }}>Split Preview (Agency Cut: {pitchData.cut}%)</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Invoice:</span>
                    <strong>${pitchData.items.reduce((s, it) => s + (it.qty * it.price), 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginTop: '4px' }}>
                    <span>Talent Share:</span>
                    <span>${pitchData.items.reduce((s, it) => s + (it.qty * it.price), 0) * (1 - pitchData.cut/100)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginTop: '4px' }}>
                    <span>Agency Share:</span>
                    <span>${pitchData.items.reduce((s, it) => s + (it.qty * it.price), 0) * (pitchData.cut/100)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button onClick={() => setPitchStep(1)} style={{ flex: 1, padding: '12px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
                  <button onClick={() => setPitchStep(3)} style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Review</button>
                </div>
              </div>
            )}

            {pitchStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p>Review the pitch for <strong>{pitchData.clientEmail}</strong>.</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button onClick={() => setIsPitchModalOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#fff', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => createPitch(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Create Draft</button>
                  <button onClick={() => createPitch(true)} style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Send to Client</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
