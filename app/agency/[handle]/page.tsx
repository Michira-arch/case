import { createClient } from '@/lib/supabase/server'
import { AgencyPublicProfile } from '@/lib/types'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './agency.module.css'

export const revalidate = 60 // ISR revalidate every 60 seconds

interface PageProps {
  params: {
    handle: string
  }
}

export async function generateMetadata({ params }: PageProps) {
  const handle = params.handle.toLowerCase()
  const supabase = createClient()
  
  const { data } = await supabase.rpc('get_agency_public_profile', {
    p_handle: handle,
  })

  if (!data) {
    return {
      title: 'Agency Not Found — Case',
    }
  }

  const agency: AgencyPublicProfile = data as AgencyPublicProfile
  return {
    title: `${agency.name} (@${agency.handle}) — Case Agency Roster`,
    description: agency.tagline || agency.description || `Explore verified talent roster at ${agency.name}`,
    openGraph: {
      title: `${agency.name} — Verified Talent Roster`,
      description: agency.tagline || agency.description || `Discover proof-backed talent at ${agency.name}`,
      images: agency.banner_url ? [agency.banner_url] : [],
    },
  }
}

export default async function PublicAgencyPage({ params }: PageProps) {
  const handle = params.handle.toLowerCase()
  const supabase = createClient()

  // High-performance single DB roundtrip call to RPC
  const { data, error } = await supabase.rpc('get_agency_public_profile', {
    p_handle: handle,
  })

  if (error || !data) {
    notFound()
  }

  const agency: AgencyPublicProfile = data as AgencyPublicProfile

  return (
    <div className={styles.container}>
      {/* Banner */}
      <div 
        className={styles.banner}
        style={{ backgroundImage: agency.banner_url ? `url(${agency.banner_url})` : undefined }}
      >
        <div className={styles.bannerOverlay} />
      </div>

      {/* Header Content */}
      <header className={styles.headerContent}>
        <div className={styles.agencyBadgeRow}>
          <div className={styles.logoWrapper}>
            {agency.logo_url ? (
              <img src={agency.logo_url} alt={agency.name} className={styles.logoImg} />
            ) : (
              agency.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className={styles.actionButtons}>
            <Link href={`/dashboard/agency?join=${agency.handle}`} className={styles.primaryBtn}>
              Join Agency
            </Link>
            <a 
              href={`https://wa.me/?text=${encodeURIComponent(`Check out ${agency.name} on Case: https://case.app/agency/${agency.handle}`)}`}
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.secondaryBtn}
            >
              Share Agency
            </a>
          </div>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{agency.name}</h1>
            {agency.is_verified && <span className={styles.verifiedBadge}>Verified Agency</span>}
          </div>
          <p className={styles.handle}>@{agency.handle} · {agency.country_code}</p>
          {agency.tagline && <p className={styles.tagline}>{agency.tagline}</p>}
          {agency.description && <p className={styles.description}>{agency.description}</p>}

          <div className={styles.metaRow}>
            <span>{agency.roster.length} Talent Members</span>
            <span>Currency: {agency.currency}</span>
          </div>
        </div>
      </header>

      {/* Main Content — Roster */}
      <main className={styles.mainContent}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Talent Roster</h2>
        </div>

        {agency.roster.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No active talent roster members listed yet.</p>
          </div>
        ) : (
          <div className={styles.rosterGrid}>
            {agency.roster.map((member) => (
              <Link 
                key={member.member_id} 
                href={`/@${member.profile.handle}`}
                className={styles.rosterCard}
              >
                <div className={styles.cardHeader}>
                  <img 
                    src={member.profile.avatar_url || '/default-avatar.png'} 
                    alt={member.profile.display_name} 
                    className={styles.avatar} 
                  />
                  <div className={styles.memberMeta}>
                    <div className={styles.memberName}>{member.profile.display_name}</div>
                    <div className={styles.memberRole}>@{member.profile.handle}</div>
                    {member.profile.role_line && (
                      <div className={styles.memberRole}>{member.profile.role_line}</div>
                    )}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span>{member.profile.location_area || member.profile.category || 'Talent'}</span>
                  <span className={styles.proofBadge}>{member.proof_count} Proof Items</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
