import { createClient } from '@supabase/supabase-js'
import { getMediaUrl } from '@/lib/r2'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import styles from './pay.module.css'
import PayClient from './PayClient'

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function PaywallPage({
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url, paystack_subaccount_code, role_line')
    .eq('handle', params.handle)
    .single()

  if (!profile) {
    notFound()
  }

  if (!profile.paystack_subaccount_code) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.errorTitle}>Not Ready</h1>
          <p className={styles.errorText}>
            This user hasn't set up their digital wallet yet to receive payments.
          </p>
          <Link href={`/${profile.handle}`} className="btn btn--outline" style={{ marginTop: 24, display: 'inline-block' }}>
            Return to Profile
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
          {profile.avatar_url ? (
            <img 
              src={getMediaUrl(profile.avatar_url)} 
              alt={profile.display_name} 
              className={styles.avatar} 
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {profile.display_name?.charAt(0) || '👤'}
            </div>
          )}
          <h1 className={styles.name}>{profile.display_name}</h1>
          {profile.role_line && <p className={styles.role}>{profile.role_line}</p>}
        </div>

        <PayClient 
          handle={profile.handle} 
          initialAmount={initialAmount} 
          isLocked={isLocked}
        />
        
        <div className={styles.footer}>
          <p>Payments powered securely by <a href="https://paystack.com" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'underline'}}>Paystack</a></p>
        </div>
      </div>
    </div>
  )
}
