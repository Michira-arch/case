import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SubscribeClient from './SubscribeClient'

interface Props {
  params: any
}

export default async function AgencySubscribePage({ params }: Props) {
  const p = await params
  const rawHandle = decodeURIComponent(p?.handle || '');
  const handle = rawHandle.startsWith('@') ? rawHandle.slice(1) : rawHandle;

  const supabase = createClient()

  const { data: org } = await supabase
    .from('nanny_orgs')
    .select('id, name, paystack_subaccount_code')
    .eq('slug', handle)
    .single()

  if (!org) {
    notFound()
  }

  if (!org.paystack_subaccount_code) {
    return (
      <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', background: 'var(--card)', padding: '32px', borderRadius: 'var(--radius-lg)' }}>
          <h1 style={{ fontSize: '20px', marginBottom: '16px' }}>Subscriptions not enabled</h1>
          <p style={{ color: 'var(--ink-soft)' }}>{org.name} has not enabled subscriptions yet.</p>
        </div>
      </div>
    )
  }

  // Assuming 1000 KES monthly by default for agencies, 
  // since nanny_orgs doesn't have subscription_amount_kes
  const amountKes = 1000
  const interval = 'monthly'

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Subscribe to {org.name}</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '32px', lineHeight: '1.5' }}>
        You are subscribing to {org.name}'s services. You will be billed KES {amountKes} {interval}.
      </p>
      <SubscribeClient 
        orgId={org.id}
        displayName={org.name}
        amountKes={amountKes}
        subaccount={org.paystack_subaccount_code}
      />
    </div>
  )
}
