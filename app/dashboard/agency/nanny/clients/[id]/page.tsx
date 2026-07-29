import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner } from '@/lib/nanny-data'
import styles from '../../nanny-dashboard.module.css'
import ChatUI from '@/components/ChatUI'

export const revalidate = 60

interface PageProps {
  params: { id: string }
}

export default async function ClientDetailPage({ params }: PageProps): Promise<JSX.Element> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const orgs = await getNannyOrgsByOwner(profile.id)
  if (orgs.length === 0) redirect('/dashboard/agency/nanny/new')

  const org = orgs[0]

  // Fetch client details
  const { data: client, error } = await supabase
    .from('nanny_clients')
    .select('*')
    .eq('id', params.id)
    .eq('org_id', org.id)
    .single()

  if (error || !client) {
    return notFound()
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <div style={{ marginBottom: 10 }}>
            <Link href="/dashboard/agency/nanny/clients" style={{ fontSize: 13, color: 'var(--brass)', textDecoration: 'none' }}>
              &larr; Back to Clients
            </Link>
          </div>
          <h1 className={styles.pageTitle}>{client.client_name}</h1>
          <p className={styles.pageSubtitle}>
            {client.client_email} {client.client_phone ? `| ${client.client_phone}` : ''}
          </p>
        </div>
      </div>

      <div className={styles.content} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <div className={styles.sectionTitle} style={{ marginBottom: 16 }}>Client Details</div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, fontSize: 14 }}>
              <div style={{ color: 'var(--ink-muted)' }}>Type</div>
              <div style={{ textTransform: 'capitalize' }}>{client.client_type}</div>
              
              <div style={{ color: 'var(--ink-muted)' }}>Status</div>
              <div>{client.status}</div>
              
              <div style={{ color: 'var(--ink-muted)' }}>Since</div>
              <div>{new Date(client.created_at).toLocaleDateString()}</div>
              
              <div style={{ color: 'var(--ink-muted)' }}>Children</div>
              <div>{client.details?.children?.length || '0'}</div>
            </div>
          </div>
        </div>
        
        <div>
          <div className={styles.sectionTitle} style={{ marginBottom: 16 }}>Communication</div>
          <ChatUI 
            clientId={client.id}
            orgId={org.id}
            senderType="agency"
            senderId={profile.id}
          />
        </div>
      </div>
    </>
  )
}
