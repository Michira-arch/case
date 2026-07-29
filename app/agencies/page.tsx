import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Caregiving Agencies | Case',
  description: 'Find top-rated nanny and caregiving agencies on Case.',
}

export default async function AgenciesListPage() {
  const supabase = createClient()
  
  const { data: agencies } = await supabase
    .from('nanny_orgs')
    .select('id, name, slug, tagline, cover_url, logo_url')
    .eq('status', 'active')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-sans)', padding: '60px 20px' }}>
      <div className="container" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, marginBottom: 12 }}>Caregiving & Nanny Agencies</h1>
          <p style={{ fontSize: 18, color: 'var(--ink-soft)' }}>
            Choose a verified agency to book a professional caregiver.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {agencies && agencies.length > 0 ? (
            agencies.map((agency: any) => (
              <Link 
                key={agency.id} 
                href={`/agency/${agency.slug}/nanny`}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  background: 'var(--card)', 
                  borderRadius: 'var(--radius-lg)', 
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'inherit',
                  border: '1px solid var(--line)',
                  boxShadow: 'var(--shadow)'
                }}
              >
                <div style={{ height: 140, background: agency.cover_url ? `url(${agency.cover_url}) center/cover` : 'var(--ink)' }} />
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    {agency.logo_url && (
                      <img src={agency.logo_url} alt={agency.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', background: '#fff', border: '1px solid var(--line)' }} />
                    )}
                    <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{agency.name}</h2>
                  </div>
                  {agency.tagline && (
                    <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 16px', flex: 1 }}>
                      {agency.tagline}
                    </p>
                  )}
                  <div style={{ marginTop: 'auto' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--brass)' }}>View Agency →</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', background: 'var(--paper-light)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--line)' }}>
              <p style={{ color: 'var(--ink-soft)' }}>No public agencies available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
