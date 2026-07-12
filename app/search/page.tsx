import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './search.module.css'
import { getMediaUrl } from '@/lib/r2'

interface Props {
  searchParams: any
}

export const metadata = {
  title: 'Search Profiles — Case',
  description: 'Search professional proof-of-work profiles by name, handle, or profession on Case.',
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const query = params?.q || ''
  const category = params?.category || ''
  const location = params?.location || ''

  const supabase = createClient()

  // 1. Fetch public stats
  const [profilesRes, viewsRes, evidenceRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_public', true).eq('discoverable', true),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'profile_view'),
    supabase.from('evidence').select('*', { count: 'exact', head: true })
  ])

  // 2. Fetch search results using RPC
  const { data: results, error } = await supabase.rpc('search_profiles', {
    p_query: query,
    p_category: category || null,
    p_location: location || null,
    p_limit: 30,
    p_offset: 0
  })

  const stats = {
    totalProfiles: profilesRes.count || 0,
    totalViews: viewsRes.count || 0,
    totalEvidence: evidenceRes.count || 0,
  }

  const items = Array.isArray(results) ? results : []

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navbarInner}>
          <Link href="/" className={styles.logo}>Case</Link>
          <div className={styles.navActions}>
            <Link href="/login" className="btn btn--outline btn--sm">Log in</Link>
            <Link href="/signup" className="btn btn--dark btn--sm">Sign up</Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Stats Section */}
        <section className={styles.statsSection}>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{stats.totalProfiles.toLocaleString()}</span>
            <span className={styles.statLabel}>Profiles Indexed</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{stats.totalEvidence.toLocaleString()}</span>
            <span className={styles.statLabel}>Proof Documents Verified</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{stats.totalViews.toLocaleString()}</span>
            <span className={styles.statLabel}>Total Engagement / Views</span>
          </div>
        </section>

        {/* Search Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Search Case Profiles</h1>
          <p className={styles.sub}>Find certified service providers, professionals, and candidates by name, handle, or profession.</p>
        </div>

        {/* Search Bar Form */}
        <form method="GET" action="/search" className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by name, handle (e.g. j.kimani), or profession..."
              className={styles.searchInput}
              autoFocus
            />
            <button type="submit" className="btn btn--brass">Search</button>
          </div>

          <div className={styles.filters}>
            <div className={styles.filterField}>
              <select name="category" defaultValue={category} className={styles.select}>
                <option value="">All Categories</option>
                <option value="service">Service Providers</option>
                <option value="professional">Professionals</option>
                <option value="creator">Creators</option>
                <option value="student">Students & Learners</option>
              </select>
            </div>
            <div className={styles.filterField}>
              <input
                type="text"
                name="location"
                defaultValue={location}
                placeholder="Filter by location (e.g. Nairobi)"
                className={styles.filterInput}
              />
            </div>
          </div>
        </form>

        {/* Results Info */}
        <div className={styles.resultsInfo}>
          <h2>
            {items.length > 0
              ? `Found ${items.length} public profile${items.length === 1 ? '' : 's'}`
              : 'No profiles match your search'}
          </h2>
          <span className={styles.rankingTip}>
            💡 Profiles are ranked by completeness and engagement.
          </span>
        </div>

        {/* Error notification */}
        {error && <div className={styles.error}>Failed to search: {error}</div>}

        {/* Grid of Profile Cards */}
        <div className={styles.grid}>
          {items.map((p: any) => {
            const initials = p.display_name
              ?.split(' ')
              .map((w: string) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || '?'

            return (
              <div key={p.id} className={styles.card}>
                {p.plan === 'plus' && <span className={styles.plusBadge}>CASE+ PRO</span>}
                <div className={styles.cardHeader}>
                  <div className={styles.avatarWrap}>
                    {p.avatar_url ? (
                      <img src={getMediaUrl(p.avatar_url)} alt={p.display_name} className={styles.avatarImg} />
                    ) : (
                      <span className={styles.avatarInitials}>{initials}</span>
                    )}
                  </div>
                  <div className={styles.cardNames}>
                    <h3 className={styles.displayName}>{p.display_name}</h3>
                    <span className={styles.handle}>@{p.handle}</span>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.roleLine}>{p.role_line || 'Case Member'}</p>
                  <div className={styles.metaRow}>
                    {p.category && <span className={`stamp stamp--did ${styles.catStamp}`}>{p.category}</span>}
                    {p.location_area && <span className={styles.location}>📍 {p.location_area}</span>}
                  </div>
                </div>

                <div className={styles.cardStats}>
                  <div className={styles.statMetric} title="Profile completeness score">
                    <span className={styles.statMetricLabel}>Completeness</span>
                    <div className={styles.progressRow}>
                      <div className={styles.progressBar}>
                        <div className={styles.progressBarFill} style={{ width: `${p.completeness_score}%` }} />
                      </div>
                      <span className={styles.statMetricValue}>{p.completeness_score}%</span>
                    </div>
                  </div>
                  <div className={styles.statMetric} title="Total profile views recorded">
                    <span className={styles.statMetricLabel}>Engagement</span>
                    <span className={styles.statMetricValue}>{p.view_count} views</span>
                  </div>
                </div>

                <Link href={`/@${p.handle}`} className={`btn btn--outline btn--sm ${styles.viewBtn}`}>
                  View Profile →
                </Link>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
