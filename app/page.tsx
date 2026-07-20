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
            <span className="stamp stamp--vouched">Proof-of-work · mobile-first</span>
          </div>
          <h1 className={styles.heroTitle}>
            Prove you've got the skills.<br />
            <span className={styles.heroAccent}>Not just a CV line.</span>
          </h1>
          <p className={styles.heroSub}>
            Case helps you present yourself professionally with a single shareable link. 
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
                placeholder="Search for chefs, tailors, nurses, or search by name..."
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
            <a href="/@a.njoroge" className="btn btn--outline btn--lg">
              See example
            </a>
          </div>
          <p className={styles.heroNote}>
            Free forever · takes 5 minutes · share via WhatsApp
          </p>
        </div>
      </section>



      {/* Value Propositions */}
      <section className={styles.valuePropSection}>
        <div className={styles.valuePropContainer}>
          <div className={styles.valuePropHeader}>
            <h2 className={styles.valuePropMainTitle}>How Case works for you</h2>
            <p className={styles.valuePropSubtitle}>
              Whether you are showcasing your abilities to get booked, or verifying candidates to hire with confidence.
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
                Instead of sending your résumé, certificates, project files, photos, and videos separately, Case brings everything together into one convincing profile that you can share anywhere — WhatsApp, social media, email, or in person.
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
                    <p className={styles.valItemDesc}>No papers needed to get a job if you can prove your skill. If you don't have formal qualifications, your work speaks for itself. If you do, Case showcases them with real evidence.</p>
                  </div>
                </div>

                <div className={styles.valItem}>
                  <span className={styles.valItemIcon}>📈</span>
                  <div className={styles.valItemContent}>
                    <h4 className={styles.valItemTitle}>Multiply your visibility</h4>
                    <p className={styles.valItemDesc}>Vastly increase your reach. You don't have to 'tarmac' much or keep calling every contact. Let your profile do the work.</p>
                  </div>
                </div>

                <div className={styles.valItem}>
                  <span className={styles.valItemIcon}>🌐</span>
                  <div className={styles.valItemContent}>
                    <h4 className={styles.valItemTitle}>Google Rankable Webpage</h4>
                    <p className={styles.valItemDesc}>Your Case profile is fully SEO-optimized, meaning it can rank on Google searches and bring organic leads or job offers directly to you.</p>
                  </div>
                </div>

                <div className={styles.valItem}>
                  <span className={styles.valItemIcon}>📇</span>
                  <div className={styles.valItemContent}>
                    <h4 className={styles.valItemTitle}>Premium Business Card</h4>
                    <p className={styles.valItemDesc}>
                      Get a custom-designed, premium business card you can use to share about yourself or leave your contacts behind professionally.{' '}
                      <Link href="/card-builder" style={{ textDecoration: 'underline', color: 'var(--brass-deep)', fontWeight: 500 }}>
                        Create a card now →
                      </Link>
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.valColFooter}>
                <span className={styles.valColCtaText}>Ready to build your credibility?</span>
                <Link href="/signup" className="btn btn--brass btn--full" style={{ marginBottom: 8 }}>
                  Create your profile free
                </Link>
                <Link href="/card-builder" className="btn btn--outline btn--full">
                  Make a Free Business Card (No Signup)
                </Link>
              </div>
            </div>

            {/* For Employers */}
            <div className={`${styles.valCol} ${styles.valColEmployers}`}>
              <div className={styles.valColHeader}>
                <div className={`${styles.valColIconBadge} ${styles.valColIconBadgeEmployers}`}>
                  💼
                </div>
                <div>
                  <span className={styles.valColFor}>For Employers & Clients</span>
                  <h3 className={styles.valColTitle}>Verify skills instantly with evidence.</h3>
                </div>
              </div>

              <p className={styles.valColIntro}>
                Every applicant claims they have skills. Case is built around Proof of Skill, allowing you to make hiring decisions based on actual evidence rather than claims in a CV alone.
              </p>

              <div className={styles.valList}>
                <div className={styles.valItem}>
                  <span className={styles.valItemIcon}>🔍</span>
                  <div className={styles.valItemContent}>
                    <h4 className={styles.valItemTitle}>Hiring based on Proof of Skill</h4>
                    <p className={styles.valItemDesc}>Give candidates the opportunity to demonstrate what they can do. See the actual quality of their work before making a decision.</p>
                  </div>
                </div>

                <div className={styles.valItem}>
                  <span className={styles.valItemIcon}>⚡</span>
                  <div className={styles.valItemContent}>
                    <h4 className={styles.valItemTitle}>Review everything that matters</h4>
                    <p className={styles.valItemDesc}>With a single link, quickly review all the critical candidate details in one place:</p>
                    <div className={styles.evidenceGrid}>
                      <div className={styles.evidenceItem}><span className={styles.evidenceDot}>•</span> Résumé & credentials</div>
                      <div className={styles.evidenceItem}><span className={styles.evidenceDot}>•</span> Certificates</div>
                      <div className={styles.evidenceItem}><span className={styles.evidenceDot}>•</span> Portfolios & projects</div>
                      <div className={styles.evidenceItem}><span className={styles.evidenceDot}>•</span> Skill videos</div>
                      <div className={styles.evidenceItem}><span className={styles.evidenceDot}>•</span> Professional photos</div>
                      <div className={styles.evidenceItem}><span className={styles.evidenceDot}>•</span> Contact information & documents</div>
                    </div>
                  </div>
                </div>

                <div className={styles.valItem}>
                  <span className={styles.valItemIcon}>🤝</span>
                  <div className={styles.valItemContent}>
                    <h4 className={styles.valItemTitle}>Hire with greater confidence</h4>
                    <p className={styles.valItemDesc}>Whether a candidate has years of experience, formal education, or raw ability, Case helps present the strongest evidence available.</p>
                  </div>
                </div>
              </div>

              <div className={styles.valColFooter}>
                <span className={styles.valColCtaText}>Don't ask candidates to tell you they're qualified.</span>
                <Link href="/search" className="btn btn--outline btn--full">
                  Ask them to show you (Search Candidates)
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
