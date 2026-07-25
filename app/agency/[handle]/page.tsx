import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientInteractiveShowcase from './ClientInteractiveShowcase'

export const revalidate = 60

export async function generateMetadata({ params }: { params: { handle: string } }) {
  const supabase = createClient()
  const { data: agency } = await supabase
    .from('agencies')
    .select('name, tagline, primary_color')
    .eq('handle', params.handle.toLowerCase())
    .single()

  if (!agency) return { title: 'Agency Not Found — Case' }

  return {
    title: `${agency.name} — Case Agency`,
    description: agency.tagline ?? `Explore the verified talent roster at ${agency.name}`,
    openGraph: {
      title: `${agency.name} — Verified Talent Roster`,
      description: agency.tagline ?? `Discover proof-backed talent at ${agency.name}`,
    },
  }
}

export default async function AgencyShowcasePage({ params }: { params: { handle: string } }) {
  const supabase = createClient()
  const handle = params.handle.toLowerCase()

  // Fetch agency
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, handle, name, primary_color, secondary_color, is_verified, location, tagline, banner_url, owner_id')
    .eq('handle', handle)
    .single()

  if (!agency) notFound()

  // Fetch active roster members with overlay data
  const { data: members } = await supabase
    .from('agency_members')
    .select(`
      id,
      user_id,
      overlay_data,
      profiles:profile_id (
        id, handle, display_name, avatar_url, category, role_line
      )
    `)
    .eq('agency_id', agency.id)
    .eq('status', 'active')

  // Shape roster for client component
  const roster = (members ?? [])
    .map((m: any) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      const overlay = m.overlay_data ?? {}
      return {
        id: m.user_id,
        name: p?.display_name ?? 'Unknown',
        handle: p?.handle ?? '',
        avatar: p?.avatar_url ?? '',
        custom_title: overlay.custom_title ?? p?.role_line ?? '',
        category: overlay.category ?? p?.category ?? 'General',
        custom_rate: overlay.custom_rate ?? null,
        availability: overlay.visibility_state !== 'hidden',
      }
    })
    .filter((m: any) => m.handle)

  const categories: string[] = Array.from(new Set(roster.map((r: any) => r.category as string)))

  // Get admin WhatsApp from agency owner's profile
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('whatsapp_number')
    .eq('owner_id', agency.owner_id)
    .maybeSingle()

  const adminWhatsapp = (ownerProfile as any)?.whatsapp_number ?? ''
  const primaryColor = agency.primary_color ?? '#6366f1'
  const secondaryColor = agency.secondary_color ?? '#10b981'

  const location =
    typeof agency.location === 'object' && agency.location !== null
      ? `${(agency.location as any).city ?? ''} ${(agency.location as any).country ?? ''}`.trim()
      : ''

  return (
    <div style={{ backgroundColor: '#0a0a0f', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Inject CSS color variables from DB — entire page theming */}
      <style>{`:root { --agency-primary: ${primaryColor}; --agency-secondary: ${secondaryColor}; }`}</style>

      {/* Hero Section — server rendered */}
      <header
        style={{
          width: '100%',
          minHeight: '280px',
          background: agency.banner_url
            ? `url(${agency.banner_url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${primaryColor}33 0%, #0a0a0f 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '48px 24px',
          borderBottom: '1px solid #1f1f2e',
          position: 'relative',
        }}
      >
        {/* Logo circle */}
        <div
          style={{
            width: '88px', height: '88px', borderRadius: '50%',
            background: '#161620',
            border: `2px solid ${primaryColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 800, color: '#fff',
            marginBottom: '20px',
            boxShadow: `0 0 24px ${primaryColor}55`,
          }}
        >
          {agency.name.charAt(0)}
        </div>

        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', margin: '0 0 10px 0', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {agency.name}
          {agency.is_verified && (
            <span
              title="Verified Agency"
              style={{ background: `${secondaryColor}22`, color: secondaryColor, border: `1px solid ${secondaryColor}55`, padding: '3px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}
            >
              ✓ VERIFIED
            </span>
          )}
        </h1>

        {agency.tagline && (
          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', margin: '0 0 12px 0', maxWidth: '600px' }}>
            {agency.tagline}
          </p>
        )}

        {location && (
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>📍 {location}</p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ backgroundColor: '#1e1e2e', border: '1px solid #2a2a3a', padding: '6px 14px', borderRadius: '999px', fontSize: '0.85rem', color: '#9ca3af' }}>
            {roster.length} Talent Members
          </span>
          <span style={{ backgroundColor: '#1e1e2e', border: '1px solid #2a2a3a', padding: '6px 14px', borderRadius: '999px', fontSize: '0.85rem', color: '#9ca3af' }}>
            {categories.length} Categories
          </span>
        </div>
      </header>

      {/* Interactive client portion: filters, grid, drawer, booking modal */}
      <ClientInteractiveShowcase
        roster={roster}
        categories={categories}
        agencyId={agency.id}
        adminWhatsapp={adminWhatsapp}
      />
    </div>
  )
}
