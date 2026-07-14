import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'

export const dynamic = 'force-dynamic'

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

    if (!res.ok) {
      throw new Error('Failed to fetch profile')
    }

    const profile = await res.json()

    const displayName = profile?.display_name || handle
    const roleLine    = profile?.role_line || 'Case Member'
    const tagline     = profile?.tagline || ''
    const avatarUrl   = profile?.avatar_url
      ? `https://media.dispatch.bld.co.ke/${profile.avatar_url}` // R2 public CDN domain
      : null

    const initials = displayName
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://case.app'
    const profileUrl = `${appUrl}/@${handle}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(profileUrl)}`

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#161C15', // Sleek dark mode background
            position: 'relative',
          }}
        >
          {/* Decorative background grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              opacity: 0.05,
              backgroundImage: 'radial-gradient(#A8783A 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Letterpress Business Card Container */}
          <div
            style={{
              width: '900px',
              height: '480px',
              display: 'flex',
              backgroundColor: '#FCFBF9', // Case warm paper/card color
              borderRadius: '16px',
              border: '1.5px solid #DCD5C2',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              padding: '48px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Elegant side stripe in Case Brass */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '6px',
                backgroundColor: '#A8783A',
              }}
            />

            {/* Left Column: Personal info */}
            <div
              style={{
                width: '60%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* Brand and Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '36px',
                      objectFit: 'cover',
                      border: '1.5px solid #DCD5C2',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '36px',
                      backgroundColor: '#F3E7D5',
                      color: '#A8783A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 700,
                      border: '1.5px solid #DCD5C2',
                    }}
                  >
                    {initials}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#A8783A', letterSpacing: '-0.02em', fontFamily: 'serif' }}>
                    CASE
                  </span>
                  <span style={{ fontSize: '11px', color: '#57604F', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Verified Dossier
                  </span>
                </div>
              </div>

              {/* Name & Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color: '#20281F',
                    letterSpacing: '-0.03em',
                    lineHeight: '1.1',
                  }}
                >
                  {displayName}
                </span>
                <span style={{ fontSize: '18px', fontWeight: 500, color: '#57604F' }}>
                  {roleLine}
                </span>
              </div>

              {/* Short tagline/claim */}
              <div style={{ display: 'flex' }}>
                <span
                  style={{
                    fontSize: '13px',
                    color: '#57604F',
                    fontStyle: 'italic',
                    lineHeight: '1.4',
                    maxHeight: '40px',
                    overflow: 'hidden',
                  }}
                >
                  {tagline ? `"${tagline.slice(0, 100)}${tagline.length > 100 ? '...' : ''}"` : 'State your claim. Present your evidence.'}
                </span>
              </div>
            </div>

            {/* Right Column: Connection / QR */}
            <div
              style={{
                width: '40%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderLeft: '1px dashed #DCD5C2',
                paddingLeft: '40px',
              }}
            >
              {/* Security Seal badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#20281F',
                  padding: '6px 12px',
                  borderRadius: '6px',
                }}
              >
                <span style={{ color: '#FCFBF9', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  CASE.APP/@{handle.toUpperCase()}
                </span>
              </div>

              {/* QR Code */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#FFFFFF',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #DCD5C2',
                }}
              >
                <img
                  src={qrUrl}
                  alt="Scan QR"
                  style={{
                    width: '130px',
                    height: '130px',
                  }}
                />
              </div>

              {/* Bottom footer text */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <span style={{ fontSize: '11px', color: '#A8783A', fontWeight: 600, fontFamily: 'monospace' }}>
                  SCAN FOR EVIDENCE
                </span>
                <span style={{ fontSize: '10px', color: '#57604F', fontFamily: 'monospace' }}>
                  Authentic proof-of-work record
                </span>
              </div>
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
