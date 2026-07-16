import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { PublicProfile } from '@/lib/types'
import ProfilePublicView from '@/components/profile/ProfilePublicView'

interface Props {
  params: any
}

export const revalidate = 60 // ISR: revalidate every 60s

import { cache } from 'react'
import { MOCK_EXAMPLES } from '@/lib/mock-examples'

const getProfile = cache(async (handle: string): Promise<PublicProfile | null> => {
  const normHandle = handle.toLowerCase()
  if (MOCK_EXAMPLES[normHandle]) {
    return MOCK_EXAMPLES[normHandle]
  }

  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_public_profile', { p_handle: handle })
  if (error || !data) return null
  return data as PublicProfile
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params
  const handle = (p?.handle || '').startsWith('%40')
    ? decodeURIComponent(p.handle).slice(1)
    : (p?.handle || '')

  const profile = await getProfile(handle)
  if (!profile) return { title: 'Profile not found' }

  const title = `${profile.display_name} — Case`
  const description = profile.tagline ||
    `${profile.display_name}${profile.role_line ? ` — ${profile.role_line}` : ''}. View their proof-of-work profile on Case.`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://caseshow.info'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/@${handle}`,
      images: [`${appUrl}/api/og/${handle}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${appUrl}/api/og/${handle}`],
    },
    alternates: {
      canonical: `${appUrl}/@${handle}`,
    },
    other: {
      // Schema.org structured data added in the component
    },
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const p = await params
  const handle = (p?.handle || '').startsWith('%40')
    ? decodeURIComponent(p.handle).slice(1)
    : (p?.handle || '')

  const profile = await getProfile(handle)

  if (!profile) {
    notFound()
  }

  const supabase = createClient()

  // Limit check (only for non-mock, free-tier profiles)
  let viewLimitExceeded = false
  const isMock = handle.toLowerCase() === 'a.njoroge' || handle.toLowerCase() === 'm.obwaka' || handle.toLowerCase() === 'j.kimani'

  if (profile.plan === 'free' && !isMock) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('event_type', 'profile_view')
      .gte('created_at', startOfMonth.toISOString())

    const currentViews = count || 0
    if (currentViews >= 100) {
      viewLimitExceeded = true
    }
  }

  if (viewLimitExceeded) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--paper)',
        color: 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        <div style={{
          maxWidth: '480px',
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔒</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
            Profile View Limit Reached
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '24px' }}>
            This Case profile has reached its monthly view limit of <b>100 views</b> on the free tier.
            To restore access and unlock unlimited views, custom domains, and full analytics, upgrade to <b>Case+</b>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link href="/login" className="btn btn--brass btn--full">
              Log in to upgrade to Case+
            </Link>
            <Link href="/" className="btn btn--outline btn--full">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Log profile view server-side (not losable to adblockers)
  // Fire-and-forget — don't await
  void (async () => {
    try {
      await supabase.rpc('log_event', {
        p_profile_id: profile.id,
        p_event_type: 'profile_view',
        p_device_type: 'unknown', // filled by middleware in production
      })
    } catch (e) {
      // ignore log failure
    }
  })()

  // Structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.display_name,
    jobTitle: profile.role_line,
    description: profile.tagline,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/@${handle}`,
    image: profile.avatar_url,
    hasCredential: profile.proof_items
      ?.filter(i => i.pillar === 'trained')
      .map(i => ({
        '@type': 'EducationalOccupationalCredential',
        name: i.title,
        description: i.detail,
      })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProfilePublicView profile={profile} handle={handle} />
    </>
  )
}
