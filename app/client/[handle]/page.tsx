import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { handle: string } }) {
  const supabase = createClient()
  const { data: client } = await supabase
    .from('client_profiles')
    .select('company_name, tagline')
    .eq('handle', params.handle.toLowerCase())
    .maybeSingle()

  if (!client) return { title: 'Client Profile — Case' }

  return {
    title: `${client.company_name} — Verified Client Profile on Case`,
    description: client.tagline || `View verified creative campaigns and commissioned works by ${client.company_name}.`,
  }
}

export default async function ClientPublicProfilePage({ params }: { params: { handle: string } }) {
  const supabase = createClient()
  const handle = params.handle.toLowerCase()

  const { data: client } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('handle', handle)
    .maybeSingle()

  if (!client) notFound()

  // Fetch 2-sided campaigns
  const { data: campaigns } = await supabase
    .from('client_campaigns')
    .select('*, agency:agencies(name, handle, primary_color, is_verified)')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  // Fetch client vouches
  const { data: vouches } = await supabase
    .from('client_vouches')
    .select('*')
    .eq('client_id', client.id)

  const totalSpentFormatted = `$${(client.total_spent || 0).toLocaleString()}`
  const paymentRate = client.on_time_payment_rate || 100

  return (
    <div style={{ backgroundColor: '#0a0a0f', color: '#f9fafb', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          width: '100%',
          padding: '60px 24px 40px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(16,185,129,0.08) 100%)',
          borderBottom: '1px solid #1f1f2e',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '96px', height: '96px', borderRadius: '24px',
              backgroundColor: '#161622', border: '2px solid #6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px', fontWeight: 800, color: '#fff',
              boxShadow: '0 0 30px rgba(99,102,241,0.3)',
            }}
          >
            {client.logo_url ? <img src={client.logo_url} alt={client.company_name} style={{ width: '100%', height: '100%', borderRadius: '22px', objectFit: 'cover' }} /> : client.company_name.charAt(0)}
          </div>

          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>{client.company_name}</h1>
              {client.verified_brand_badge && (
                <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                  ✓ VERIFIED BRAND
                </span>
              )}
            </div>
            <p style={{ margin: '0 0 10px 0', color: '#9ca3af', fontSize: '1.05rem' }}>@{client.handle} {client.industry && `· ${client.industry}`}</p>
            {client.tagline && <p style={{ margin: '0 0 14px 0', color: '#cbd5e1', fontSize: '0.95rem' }}>{client.tagline}</p>}

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#6b7280' }}>
              {client.website_url && (
                <a href={client.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'none' }}>
                  🌐 {client.website_url.replace(/^https?:\/\//, '')} ↗
                </a>
              )}
              <span>🛡️ Tax ID Verified</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px', boxSizing: 'border-box' }}>
        
        {/* Trust & Reputation Cards */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '48px' }}>
          <div style={{ backgroundColor: '#111116', padding: '20px', borderRadius: '14px', border: '1px solid #2a2a3a' }}>
            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>On-Time Payment Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{paymentRate}%</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Verified Escrow Settlements</div>
          </div>

          <div style={{ backgroundColor: '#111116', padding: '20px', borderRadius: '14px', border: '1px solid #2a2a3a' }}>
            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>Verified Campaign Volume</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8' }}>{totalSpentFormatted}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Invested in Creative Talent</div>
          </div>

          <div style={{ backgroundColor: '#111116', padding: '20px', borderRadius: '14px', border: '1px solid #2a2a3a' }}>
            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>Campaign Nodes</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>{(campaigns || []).length}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Multi-Agency & Talent Projects</div>
          </div>
        </section>

        {/* 2-Sided Commissioned Works & Campaigns */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎨</span> Commissioned Works & Campaigns
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {(campaigns || []).map((camp: any) => (
              <div
                key={camp.id}
                style={{
                  backgroundColor: '#111116',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #2a2a3a',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f9fafb' }}>{camp.title}</h3>
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                      COMPLETED
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: '#9ca3af', margin: '0 0 16px 0' }}>
                    Executed by <strong style={{ color: '#e5e7eb' }}>{camp.agency?.name || 'Agency Partner'}</strong>
                    {camp.agency?.is_verified && <span style={{ color: '#818cf8', marginLeft: '4px' }}>✓</span>}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #1f1f2e', fontSize: '0.85rem' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{camp.currency} {Number(camp.budget).toLocaleString()}</span>
                  {camp.agency?.handle && (
                    <Link href={`/agency/${camp.agency.handle}`} style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                      View Agency Showcase ↗
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {(campaigns || []).length === 0 && (
              <div style={{ gridColumn: '1/-1', backgroundColor: '#111116', padding: '40px', borderRadius: '16px', border: '1px solid #2a2a3a', textAlign: 'center', color: '#6b7280' }}>
                <p style={{ fontSize: '2rem', margin: '0 0 8px 0' }}>📂</p>
                <p style={{ margin: 0 }}>No public campaigns published yet for this brand.</p>
              </div>
            )}
          </div>
        </section>

        {/* Vouches & Endorsements */}
        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>
            🤝 Agency & Creative Vouches
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(vouches || []).map((vouch: any) => (
              <div key={vouch.id} style={{ backgroundColor: '#111116', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a3a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>{'★'.repeat(vouch.rating || 5)}</span>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{new Date(vouch.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ margin: 0, color: '#e5e7eb', fontSize: '0.95rem', lineHeight: 1.5 }}>"{vouch.comment}"</p>
              </div>
            ))}

            {(vouches || []).length === 0 && (
              <div style={{ backgroundColor: '#111116', padding: '32px', borderRadius: '12px', border: '1px solid #2a2a3a', textAlign: 'center', color: '#6b7280' }}>
                No vouches recorded yet.
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}
