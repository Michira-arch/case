import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ImageResponse } from 'next/og'



interface Props {
  params: any
}

export async function GET(request: NextRequest, { params }: Props) {
  const p = await params
  const handle = p?.handle || ''

  try {
    // Fetch profile data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_public_profile`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ p_handle: handle }),
      }
    )

    const profile = await res.json()

    const displayName = profile?.display_name || handle
    const roleLine    = profile?.role_line || ''
    const proofCount  = profile?.proof_items?.length || 0
    const evidenceCount = profile?.proof_items?.reduce(
      (n: number, i: any) => n + (i.evidence?.length || 0), 0
    ) || 0

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#F1EDE2',
            fontFamily: 'serif',
            padding: '48px',
            position: 'relative',
          }}
        >
          {/* Background pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(168,120,58,0.04) 40px, rgba(168,120,58,0.04) 80px)',
          }} />

          {/* Top: wordmark */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 'auto',
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#20281F', letterSpacing: '-0.02em' }}>
              Case
            </span>
            <span style={{ fontSize: 13, color: '#57604F', marginLeft: 12, fontFamily: 'monospace' }}>
              case.app/@{handle}
            </span>
          </div>

          {/* Main: name + role */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#F3E7D5',
              color: '#7C5A2A',
              fontSize: 28,
              fontWeight: 700,
            }}>
              {displayName.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
            </div>

            <span style={{ fontSize: 48, fontWeight: 700, color: '#20281F', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              {displayName}
            </span>

            {roleLine && (
              <span style={{ fontSize: 22, color: '#57604F' }}>
                {roleLine}
              </span>
            )}

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
              <Stat label="proof items" value={proofCount} />
              <Stat label="evidence files" value={evidenceCount} />
            </div>
          </div>

          {/* Bottom: CTA */}
          <div style={{
            marginTop: 'auto',
            paddingTop: 32,
            borderTop: '1px solid #DCD5C2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 14, color: '#57604F', fontFamily: 'monospace' }}>
              Proof of work profile
            </span>
            <div style={{
              background: '#A8783A',
              color: '#2A1D0C',
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
            }}>
              View Case →
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (err) {
    // Return a simple fallback OG image
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#20281F', color: '#F1EDE2',
          fontSize: 48, fontFamily: 'serif', fontWeight: 700,
        }}>
          Case
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 32, fontWeight: 700, color: '#A8783A' }}>{value}</span>
      <span style={{ fontSize: 13, color: '#57604F', fontFamily: 'monospace' }}>{label}</span>
    </div>
  )
}
