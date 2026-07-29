import { createClient } from '@supabase/supabase-js'
import { getMediaUrl } from '@/lib/r2'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import styles from './pay.module.css'
import PayClient from './PayClient'

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function AgencyPaywallPage({
  params,
  searchParams
}: {
  params: { handle: string }
  searchParams: { amount?: string }
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: org } = await supabase
    .from('nanny_orgs')
    .select('id, slug, name, logo_url, paystack_subaccount_code, tagline')
    .eq('slug', params.handle)
    .single()

  if (!org) {
    notFound()
  }

  if (!org.paystack_subaccount_code) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.errorTitle}>Not Ready</h1>
          <p className={styles.errorText}>
            This agency hasn't set up their digital wallet yet to receive payments.
          </p>
          <Link href={`/agency/${org.slug}`} className="btn btn--outline" style={{ marginTop: 24, display: 'inline-block' }}>
            Return to Agency
          </Link>
        </div>
      </div>
    )
  }

  const initialAmount = searchParams.amount ? searchParams.amount : ''
  const isLocked = !!searchParams.amount

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.profileInfo}>
          {org.logo_url ? (
            <img 
              src={getMediaUrl(org.logo_url)} 
              alt={org.name} 
              className={styles.avatar} 
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {org.name?.charAt(0) || '🏢'}
            </div>
          )}
          <h1 className={styles.name}>{org.name}</h1>
          {org.tagline && <p className={styles.role}>{org.tagline}</p>}
        </div>

        <PayClient 
          handle={org.slug} 
          initialAmount={initialAmount} 
          isLocked={isLocked}
          isAgency={true}
        />
        
        <div className={styles.footer}>
          <p>Payments powered securely by <a href="https://paystack.com" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'underline'}}>Paystack</a></p>
        </div>
      </div>
    </div>
  )
}
