import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PitchAcceptClient from './PitchAcceptClient'

export async function generateMetadata({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const { data: pitch } = await supabase
    .from('agency_pitches')
    .select('client_name, total_value, currency, agencies(name)')
    .eq('token', params.token)
    .maybeSingle()

  if (!pitch) return { title: 'Proposal Pitch — Case' }

  return {
    title: `Proposal for ${pitch.client_name || 'Client'} — ${(pitch as any).agencies?.name || 'Agency'}`,
    description: `Official agency proposal and escrow checkout for ${pitch.currency} ${Number(pitch.total_value).toLocaleString()}.`,
  }
}

export default async function PublicPitchPage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  // Fetch pitch
  const { data: pitch } = await supabase
    .from('agency_pitches')
    .select('*, agency:agencies(id, name, handle, logo_url, primary_color, country_code, currency)')
    .eq('token', params.token)
    .maybeSingle()

  if (!pitch) notFound()

  // Mark pitch as viewed if still draft/sent
  if (pitch.status === 'sent' || pitch.status === 'draft') {
    await supabase
      .from('agency_pitches')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', pitch.id)
  }

  const payload = pitch.payload || {}
  const lineItems = payload.items || payload.line_items || []
  const primaryColor = pitch.agency?.primary_color || '#6366f1'

  // Get current logged-in user if any
  const { data: { user } } = await supabase.auth.getUser()
  let clientProfile = null
  if (user) {
    const { data: cp } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
    clientProfile = cp
  }

  return (
    <div style={{ backgroundColor: '#0a0a0f', color: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #1f1f2e', padding: '40px 24px', background: `linear-gradient(135deg, ${primaryColor}22 0%, #0a0a0f 100%)` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
              OFFICIAL AGENCY PROPOSAL
            </div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
              {payload.title || `Proposal for ${pitch.client_name || pitch.client_email}`}
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '0.95rem' }}>
              From <strong>{pitch.agency?.name || 'Agency Partner'}</strong> · Sent to {pitch.client_email}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: pitch.status === 'accepted' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)', color: pitch.status === 'accepted' ? '#34d399' : '#a5b4fc', border: '1px solid currentColor' }}>
              STATUS: {pitch.status.toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* Main Pitch Card */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px', boxSizing: 'border-box' }}>
        <div style={{ backgroundColor: '#111116', borderRadius: '16px', border: '1px solid #2a2a3a', padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', color: '#f9fafb' }}>Scope & Line Items</h2>

          {/* Line items table */}
          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a3a', color: '#9ca3af' }}>
                  <th style={{ padding: '12px 0' }}>Deliverable Description</th>
                  <th style={{ padding: '12px 0', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '12px 0', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1f1f2e' }}>
                    <td style={{ padding: '14px 0', fontWeight: 600 }}>{item.desc || item.description || 'Project deliverable'}</td>
                    <td style={{ padding: '14px 0', textAlign: 'center', color: '#9ca3af' }}>{item.qty || 1}</td>
                    <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: 700, color: '#f9fafb' }}>
                      {pitch.currency || 'USD'} {((item.qty || 1) * (item.price || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {lineItems.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '16px 0', color: '#6b7280', textAlign: 'center' }}>
                      Standard proposal package: {pitch.currency || 'USD'} {Number(pitch.total_value).toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '2px solid #2a2a3a' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Total Investment</div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '2px' }}>Protected by Case Virtual Escrow</div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>
              {pitch.currency || 'USD'} {Number(pitch.total_value).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Client Interactive Accept & Escrow Component */}
        <PitchAcceptClient
          pitchId={pitch.id}
          status={pitch.status}
          totalValue={pitch.total_value}
          currency={pitch.currency || 'USD'}
          primaryColor={primaryColor}
          clientEmail={pitch.client_email}
          existingClientProfile={clientProfile}
        />
      </main>
    </div>
  )
}
