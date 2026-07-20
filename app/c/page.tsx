import Link from 'next/link'
import styles from './c.module.css'

interface Props {
  searchParams: any
}

export const metadata = {
  title: 'Connected Card — Case',
  description: 'View contacts and verified credentials via Case.',
}

export default async function ScanLandingPage({ searchParams }: Props) {
  const params = await searchParams
  const name = params?.n || 'Case Member'
  const profession = params?.p || 'Professional Member'
  const whatsapp = params?.w || ''
  const phone = params?.ph || ''
  const email = params?.e || ''
  const website = params?.s || ''
  const bio = params?.b || ''

  const initials = name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'C'

  const waLink = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : null

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <span className={styles.wordmark}>Case</span>
          <span className={styles.badge}>QR Connection</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.stripe} />
          
          <div className={styles.avatarFallback}>{initials}</div>
          
          <h1 className={styles.name}>{name}</h1>
          <p className={styles.profession}>{profession}</p>
          
          {bio && <p className={styles.bio}>“{bio}”</p>}

          <div className={styles.actions}>
            {waLink ? (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn--brass btn--lg btn--full">
                Chat on WhatsApp
              </a>
            ) : (
              <p className={styles.noContact}>No primary WhatsApp contact was encoded in this card.</p>
            )}

            {/* Secondary Contacts List */}
            {(phone || email || website) && (
              <div className={styles.secondaryContacts}>
                <h3 className={styles.secondaryTitle}>Other Contact Info</h3>
                <div className={styles.contactsGrid}>
                  {phone && (
                    <a href={`tel:${phone.replace(/\D/g, '')}`} className={styles.contactLink}>
                      <span className={styles.contactLabel}>Phone</span>
                      <span className={styles.contactVal}>{phone}</span>
                    </a>
                  )}
                  {email && (
                    <a href={`mailto:${email}`} className={styles.contactLink}>
                      <span className={styles.contactLabel}>Email</span>
                      <span className={styles.contactVal}>{email}</span>
                    </a>
                  )}
                  {website && (
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.contactLink}
                    >
                      <span className={styles.contactLabel}>Web/Social</span>
                      <span className={styles.contactVal}>{website}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Viral Growth conversion box */}
        <div className={styles.growthPanel}>
          <h2 className={styles.growthTitle}>Want your own business card?</h2>
          <p className={styles.growthText}>
            Case lets you create premium, shareable business cards with a built-in QR code. 
            No signup or database required — it is completely free.
          </p>
          <div className={styles.growthActions}>
            <Link href="/card-builder" className="btn btn--outline btn--full">
              Build Free Business Card
            </Link>
          </div>

          <div className={styles.divider} />

          <h3 className={styles.growthTitleSub}>Prove your skills to employers</h3>
          <p className={styles.growthText}>
            Go beyond a business card. Build a complete online portfolio with project photos, 
            accreditation files, and supervisor recommendations to land bookings and jobs.
          </p>
          <div className={styles.growthActions}>
            <Link href="/" className="btn btn--brass btn--full">
              Explore Case Features
            </Link>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>Powered by Case — Prove your skills and get hired.</p>
      </footer>
    </div>
  )
}
