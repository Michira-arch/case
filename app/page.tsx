import Link from 'next/link'
import type { Metadata } from 'next'
import PricingCard from '@/components/billing/PricingCard'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Case — prove you\'ve got it',
  description: 'A proof-of-work profile for people who don\'t have a traditional resume. Show your work, back it with evidence, get vouched — and get hired or booked.',
}

export default function LandingPage() {
  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <span className={styles.wordmark}>Case</span>
          <div className={styles.navActions}>
            <Link href="/search" className="btn btn--outline btn--sm" style={{ marginRight: 4 }}>Search Cases</Link>
            <Link href="/agency/new" className="btn btn--outline btn--sm" style={{ marginRight: 4 }}>🏢 For Agencies</Link>
            <Link href="/login" className="btn btn--outline btn--sm">Log in</Link>
            <Link href="/signup" className="btn btn--brass btn--sm">Start free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className="stamp stamp--vouched">Proof-of-work · mobile-first · B2B agencies</span>
          </div>
          <h1 className={styles.heroTitle}>
            Prove you've got the skills.<br />
            <span className={styles.heroAccent}>Not just a CV line.</span>
          </h1>
          <p className={styles.heroSub}>
            Case helps individuals and agency rosters present themselves professionally. 
            Showcase your projects, certificates, photos, and recommendations in one convincing profile.
          </p>

          {/* Big Search Bar */}
          <form method="GET" action="/search" className={styles.heroSearchForm}>
            <div className={styles.heroSearchInputGroup}>
              <div className={styles.searchIconWrap}>
                <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input
                type="text"
                name="q"
                placeholder="Search for chefs, tailors, nurses, or agencies..."
                className={styles.heroSearchInput}
              />
              <button type="submit" className={`btn btn--brass ${styles.heroSearchButton}`}>
                Search
              </button>
            </div>
          </form>

          <div className={styles.heroCtas}>
            <Link href="/signup" className="btn btn--brass btn--lg">
              Build your Case — free
            </Link>
            <Link href="/dashboard/agency/new" className="btn btn--outline btn--lg">
              Launch an Agency →
            </Link>
          </div>
          <p className={styles.heroNote}>
            Free forever for individuals · B2B Agency subscriptions · share via WhatsApp
          </p>
        </div>
      </section>

      {/* Value Propositions */}
      <section className={styles.valuePropSection}>
        <div className={styles.valuePropContainer}>
          <div className={styles.valuePropHeader}>
            <h2 className={styles.valuePropMainTitle}>How Case works for you</h2>
            <p className={styles.valuePropSubtitle}>
              Whether you are showcasing your abilities to get booked, running a talent agency, or verifying candidates to hire with confidence.
            </p>
          </div>

          <div className={styles.valuePropGrid}>
            {/* For Candidates */}
            <div className={`${styles.valCol} ${styles.valColCandidates}`}>
              <div className={styles.valColHeader}>
                <div className={`${styles.valColIconBadge} ${styles.valColIconBadgeCandidates}`}>
                  👤
                </div>
                <div>
                  <span className={styles.valColFor}>For Job Seekers & Service Providers</span>
                  <h3 className={styles.valColTitle}>Present yourself professionally with one link.</h3>
                </div>
              </div>

              <p className={styles.valColIntro}>
                Instead of sending your résumé, certificates, project files, photos, and videos separately, Case brings everything together into one convincing profile that you can share anywhere.
              </p>

              <div className={styles.valList}>
                <div className={styles.valItem}>
                  <span className={styles.valItemIcon}>🔗</span>
                  <div className={styles.valItemContent}>
                    <h4 className={styles.valItemTitle}>One link. One profile.</h4>
                    <p className={styles.valItemDesc}>Everything someone needs to know about you, organized in a beautiful, mobile-friendly landing page.</p>
                  </div>
                </div>

                <div className={styles.valItem}>
                  <span className={styles.valItemIcon}>🛠️</span>
                  <div className={styles.valItemContent}>
                    <h4 className={styles.valItemTitle}>Built on Proof of Work</h4>
                    <p className={styles.valItemDesc}>No papers needed to get a job if you can prove your skill. If you don't have formal qualifications, your work speaks for itself.</p>
                  </div>
                </div>
              </div>

              <div className={styles.valColFooter}>
                <Link href="/signup" className="btn btn--brass btn--full" style={{ marginBottom: 8 }}>
                  Create your profile free
                </Link>
              </div>
            </div>

            {/* For Agencies (B2B) */}
            <div className={`${styles.valCol} ${styles.valColEmployers}`}>
              <div className={styles.valColHeader}>
                <div className={`${styles.valColIconBadge} ${styles.valColIconBadgeEmployers}`}>
                  🏢
                </div>
                <div>
                  <span className={styles.valColFor}>For Agencies & Talent Pools (B2B)</span>
                  <h3 className={styles.valColTitle}>Run your entire agency effortlessly.</h3>
                </div>
              </div>

              <p className={styles.valColIntro}>
                Build verified talent rosters, issue client invoices, and collect split payouts automatically via Paystack sub-accounts or internal escrow.
              </p>

              <div className={styles.valList}>
                <div className={styles.valItem}>
                  <span className={styles.valItemIcon}>⚡</span>
                  <div className={styles.valItemContent}>
                    <h4 className={styles.valItemTitle}>Automated Payment Splits</h4>
                    <p className={styles.valItemDesc}>Client payments automatically split between agency and talent bank/M-Pesa accounts instantly.</p>
                  </div>
                </div>

                <div className={styles.valItem}>
                  <span className={styles.valItemIcon}>🛡️</span>
                  <div className={styles.valItemContent}>
                    <h4 className={styles.valItemTitle}>Data Sovereignty Guarantee</h4>
                    <p className={styles.valItemDesc}>Talent retain their personal profiles intact even if an agency closes down. Members can join up to 4 agencies.</p>
                  </div>
                </div>
              </div>

              <div className={styles.valColFooter}>
                <Link href="/dashboard/agency/new" className="btn btn--brass btn--full">
                  Create an Agency (from 1k KSH/mo)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section className={styles.examples}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Explore example profiles</h2>
          <p className={styles.sectionSub} style={{ textAlign: 'center', marginBottom: 32 }}>
            See how real workers from Nairobi showcase their skills, training, and customer reviews.
          </p>
          <div className={styles.examplesGrid}>
            <ExampleCard
              handle="a.njoroge"
              name="Aisha Njoroge"
              role="Chef & Event Caterer"
              avatar="AN"
              emoji="🍳"
              snippet="Has 4 recommendations and 5 pieces of photo evidence showing client dishes."
            />
            <ExampleCard
              handle="m.obwaka"
              name="Dr. Moses Obwaka"
              role="ICU Nurse Practitioner"
              avatar="MO"
              emoji="🏥"
              snippet="Showcases credential documents and university degrees."
            />
            <ExampleCard
              handle="j.kimani"
              name="Joy Kimani"
              role="Digital Marketing Specialist"
              avatar="JK"
              emoji="📈"
              snippet="Features campaign screenshots, analytics links, and supervisor recommendations."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <span className={styles.wordmark}>Case</span>
            <p className={styles.footerSub}>Built for the worker who proves their worth.</p>
            <div className={styles.footerLinks}>
              <Link href="/dashboard/agency">Agency Platform</Link>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ExampleCard({ handle, name, role, avatar, emoji, snippet }: {
  handle: string; name: string; role: string; avatar: string; emoji: string; snippet: string;
}) {
  return (
    <Link href={`/@${handle}`} className={`card ${styles.exampleCard}`}>
      <div className={styles.exampleHeader}>
        <div className={styles.exampleAvatar}>{avatar}</div>
        <div>
          <h3 className={styles.exampleName}>{name} {emoji}</h3>
          <p className={styles.exampleRole}>{role}</p>
        </div>
      </div>
      <p className={styles.exampleSnippet}>{snippet}</p>
      <span className={styles.exampleLink}>View Profile →</span>
    </Link>
  )
}
