import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  // Query database for matching invite token
  const { data: request } = await supabase
    .from('agency_join_requests')
    .select('*, agency:agencies(name, tagline, primary_color)')
    .eq('invite_token', params.token)
    .maybeSingle()

  const agencyName = request?.agency?.name || 'Case Agency'
  const agencyTagline = request?.agency?.tagline || 'Verified Talent Roster'
  const primaryColor = request?.agency?.primary_color || '#6366f1'

  // Validate invite status and expiration (72 hours)
  const createdTime = request?.created_at ? new Date(request.created_at).getTime() : 0
  const hoursSinceCreation = (Date.now() - createdTime) / (1000 * 60 * 60)
  const isValid = request && request.status === 'pending' && hoursSinceCreation < 72

  if (!isValid) {
    return (
      <div style={{ backgroundColor: '#0a0a0f', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '24px' }}>
        <div style={{ textAlign: 'center', backgroundColor: '#111116', padding: '40px 32px', borderRadius: '16px', border: '1px solid #2a2a3a', maxWidth: '420px', width: '100%' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '24px', margin: '0 0 12px 0', fontWeight: 800 }}>Invalid or Expired Invite</h1>
          <p style={{ color: '#9ca3af', margin: '0 0 24px 0', fontSize: '0.95rem', lineHeight: 1.5 }}>
            This agency invite link has expired or has already been redeemed.
          </p>
          <Link href="/" style={{ padding: '12px 24px', backgroundColor: '#1e1e2e', color: '#fff', textDecoration: 'none', borderRadius: '8px', display: 'inline-block', fontWeight: 600 }}>
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#0a0a0f', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '24px' }}>
      <div style={{ textAlign: 'center', backgroundColor: '#111116', padding: '40px 32px', borderRadius: '16px', border: '1px solid #2a2a3a', maxWidth: '420px', width: '100%' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#1a1a24', border: `2px solid ${primaryColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, margin: '0 auto 24px auto',
          boxShadow: `0 0 20px ${primaryColor}44`,
        }}>
          {agencyName.charAt(0)}
        </div>
        <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', fontWeight: 800 }}>You've been invited!</h1>
        <p style={{ color: '#e5e7eb', margin: '0 0 6px 0', fontSize: '1.05rem' }}>Join <strong>{agencyName}</strong></p>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: '0 0 32px 0' }}>{agencyTagline}</p>

        <form action="/api/agency/join-request" method="POST">
          <input type="hidden" name="token" value={params.token} />
          <button
            type="submit"
            style={{
              width: '100%', padding: '14px', backgroundColor: primaryColor, color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 4px 14px ${primaryColor}55`,
            }}
          >
            Accept Invitation & Join Agency
          </button>
        </form>

        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '20px' }}>This single-use invite link expires in 72 hours.</p>
      </div>
    </div>
  )
}
