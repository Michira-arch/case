import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AgencyOSDashboard from './AgencyOSDashboard'

export default async function AgencyDashboardPage() {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    redirect('/login')
  }

  // Fetch owned agencies
  const { data: agencies } = await supabase
    .from('agencies')
    .select('*')
    .eq('owner_id', user.id)

  // Fetch agencies where user is a member
  const { data: memberships } = await supabase
    .from('agency_members')
    .select('*, agencies(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const currentAgency = agencies?.[0]

  if (!currentAgency && (!memberships || memberships.length === 0)) {
    return (
      <div style={{ maxWidth: '720px', margin: '4rem auto', padding: '0 1.5rem', color: '#f3f4f6', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800 }}>Agency Operating System</h1>
        <p style={{ color: '#9ca3af', margin: '1rem 0 2rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
          You are not currently running or belonging to an agency. Create an agency to start building verified rosters, issuing split invoices, and automating talent payouts.
        </p>
        <Link
          href="/dashboard/agency/new"
          style={{
            display: 'inline-block',
            backgroundColor: '#6366f1',
            color: '#ffffff',
            padding: '0.9rem 2rem',
            borderRadius: '14px',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
          }}
        >
          + Create Your Agency Now
        </Link>
      </div>
    )
  }

  // Fetch pending join requests
  const { data: pendingRequests } = currentAgency ? await supabase
    .from('agency_join_requests')
    .select('*, profiles(*)')
    .eq('agency_id', currentAgency.id)
    .eq('status', 'pending') : { data: [] }

  // Fetch active roster members
  const { data: rosterMembers } = currentAgency ? await supabase
    .from('agency_members')
    .select('*, profiles(*)')
    .eq('agency_id', currentAgency.id)
    .eq('status', 'active') : { data: [] }

  // Fetch transactions
  const { data: transactions } = currentAgency ? await supabase
    .from('agency_transactions')
    .select('*')
    .eq('agency_id', currentAgency.id)
    .order('created_at', { ascending: false }) : { data: [] }

  return (
    <AgencyOSDashboard
      agency={currentAgency || memberships?.[0]?.agencies}
      rosterMembers={rosterMembers || []}
      pendingRequests={pendingRequests || []}
      transactions={transactions || []}
    />
  )
}
