import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { PublicProfile } from '@/lib/types'
import ProfilePublicView from '@/components/profile/ProfilePublicView'

interface Props {
  params: any
}

export const revalidate = 60 // ISR: revalidate every 60s

import { cache } from 'react'

const getProfile = cache(async (handle: string): Promise<PublicProfile | null> => {
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://case.app'

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

  // Log profile view server-side (not losable to adblockers)
  // Fire-and-forget — don't await
  const supabase = createClient()
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
