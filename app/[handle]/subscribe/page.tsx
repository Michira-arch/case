import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SubscribeClient from './SubscribeClient'

interface Props {
  params: any
}

export default async function SubscribePage({ params }: Props) {
  const p = await params
  const rawHandle = decodeURIComponent(p?.handle || '');
  const handle = rawHandle.startsWith('@') ? rawHandle.slice(1) : rawHandle;

  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, paystack_subaccount_code, subscription_amount_kes, subscription_interval')
    .eq('handle', handle)
    .single()

  if (!profile) {
    notFound()
  }

  if (!profile.paystack_subaccount_code) {
    return (
      <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', background: 'var(--card)', padding: '32px', borderRadius: 'var(--radius-lg)' }}>
          <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>Subscriptions not enabled</h1>
          <p style={{ color: 'var(--ink-soft)' }}>{profile.display_name} has not enabled subscriptions yet.</p>
        </div>
      </div>
    )
  }

  const amountKes = profile.subscription_amount_kes || 1000
  const interval = profile.subscription_interval || 'monthly'

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Subscribe to {profile.display_name}</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '32px', lineHeight: '1.5' }}>
        You are subscribing to {profile.display_name}'s services. You will be billed KES {amountKes} {interval}.
      </p>
      <SubscribeClient 
        profileId={profile.id}
        displayName={profile.display_name}
        amountKes={amountKes}
        subaccount={profile.paystack_subaccount_code}
      />
    </div>
  )
}
