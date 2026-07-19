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
            <Link href="/login" className="btn btn--outline btn--sm">Log in</Link>
            <Link href="/signup" className="btn btn--brass btn--sm">Start free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className="stamp stamp--vouched">Kenya-first · mobile-first</span>
          </div>
          <h1 className={styles.heroTitle}>
            Prove you've got it.<br />
            <span className={styles.heroAccent}>Not just a CV line.</span>
          </h1>
          <p className={styles.heroSub}>
            Case is a proof-of-work profile — show what you've done, how you learned it,
            who'll vouch for you, and what you're aiming for next. Every claim backed by
            real evidence: photos, certificates, videos.
          </p>

          <form action="/search" method="GET" className={styles.heroSearchForm}>
            <div className={styles.heroSearchPill}>
              <svg className={styles.heroSearchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                name="q" 
                placeholder="Search professionals, skills, or roles..." 
                className={styles.heroSearchInput}
              />
              <button type="submit" className={`btn btn--brass ${styles.heroSearchBtn}`}>
                Search
              </button>
            </div>
          </form>

          <div className={styles.heroCtas}>
            <Link href="/signup" className="btn btn--brass btn--lg">
              Build your Case — free
            </Link>
            <Link href="/search" className="btn btn--outline btn--lg">
              Search Cases
            </Link>
            <a href="/@a.njoroge" className="btn btn--outline btn--lg">
              See example
            </a>
          </div>
          <p className={styles.heroNote}>
            Free forever · takes 5 minutes · share via WhatsApp
          </p>
        </div>
      </section>

      {/* Social proof bar */}
      <div className={styles.proofBar}>
        <p className={styles.proofBarText}>Used by caterers, nurses, electricians, tailors, and job seekers across Nairobi</p>
      </div>

      {/* Features */}
      <section className={styles.features}>
        <div className="container">
          <div className={styles.featuresGrid}>
            <Feature
              stamp="did"
              title="Show your work"
              body="Add the jobs, projects, and gigs you've actually done. Attach photos, receipts, or screenshots — not just a job title."
            />
            <Feature
              stamp="trained"
              title="Back your skills"
              body="List your training, courses, and apprenticeships. Scan your certificate and attach it. Real credentials, not just a bullet point."
            />
            <Feature
              stamp="vouched"
              title="Get vouched"
              body="Send a vouch link to a client or employer. They submit a testimonial directly — it lands on your Case, visible for anyone checking you."
            />
            <Feature
              stamp="aiming"
              title="Signal what you want"
              body="Tell the people reading your Case what you're looking for. Open to bookings? Relocating? On a career switch? Say it clearly."
            />
          </div>
        </div>
      </section>

      {/* Personas */}
      <section className={styles.personas}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Built for real work</h2>
          <div className={styles.personasGrid}>
            <PersonaCard
              emoji="🛠️"
              title="Service providers"
              desc="Caterers, electricians, plumbers, tailors — prove your bookings, show your work, get repeat clients."
            />
            <PersonaCard
              emoji="🏥"
              title="Credentialed professionals"
              desc="Nurses, accountants, teachers — prove your licenses are real and current. One link replaces a folder of documents."
            />
            <PersonaCard
              emoji="📋"
              title="Job seekers"
              desc="Stand out from the CV pile. Show the recruiter exactly what you've done, who'll speak for you, and why you're ready."
            />
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

      {/* Pricing */}
      <section className={styles.pricing}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Simple, fair pricing</h2>
          <p className={styles.sectionSub}>Free forever for the basics. Case+ for serious professionals.</p>
          <div className={styles.pricingGrid}>
            <PricingCard
              name="Free"
              isFree={true}
              features={[
                'Public proof-of-work profile',
                'Up to 4 proof items per pillar',
                '2 evidence files per item',
                '3 open vouch requests',
                'Basic analytics',
                'QR code download',
              ]}
              cta="Start free"
              href="/signup"
              highlight={false}
            />
            <PricingCard
              name="Case+"
              isFree={false}
              features={[
                'Everything in free',
                'Unlimited proof items',
                'Unlimited evidence files',
                'Unlimited vouch requests',
                'Full analytics + referrer breakdown',
                'Remove "Built with Case" footer',
                'Priority in Case Search',
              ]}
              cta="Get Case+"
              href="/signup?plan=plus"
              highlight={true}
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
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Feature({ stamp, title, body }: { stamp: string; title: string; body: string }) {
  return (
    <div className={styles.feature}>
      <span className={`stamp stamp--${stamp}`}>{stamp}</span>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureBody}>{body}</p>
    </div>
  )
}

function PersonaCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className={`card ${styles.personaCard}`}>
      <div className={styles.personaEmoji}>{emoji}</div>
      <h3 className={styles.personaTitle}>{title}</h3>
      <p className={styles.personaDesc}>{desc}</p>
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
