import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

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
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Agency Platform</h1>
        <p style={{ color: '#9ca3af', margin: '1rem 0 2rem' }}>
          You are not currently running or belonging to an agency. Create an agency to start recruiting talent and managing split client bookings.
        </p>
        <Link
          href="/dashboard/agency/new"
          style={{
            display: 'inline-block',
            backgroundColor: '#6366f1',
            color: '#ffffff',
            padding: '0.85rem 1.75rem',
            borderRadius: '12px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          + Create Your Agency
        </Link>
      </div>
    )
  }

  // Fetch pending join requests for owned agency
  const { data: pendingRequests } = currentAgency ? await supabase
    .from('agency_join_requests')
    .select('*, profiles(*)')
    .eq('agency_id', currentAgency.id)
    .eq('status', 'pending') : { data: [] }

  // Fetch roster members
  const { data: rosterMembers } = currentAgency ? await supabase
    .from('agency_members')
    .select('*, profiles(*)')
    .eq('agency_id', currentAgency.id)
    .eq('status', 'active') : { data: [] }

  return (
    <div style={{ maxWidth: '1000px', margin: '3rem auto', padding: '0 1.5rem', color: '#f3f4f6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>
            {currentAgency ? currentAgency.name : 'Agency Roster'}
          </h1>
          {currentAgency && (
            <p style={{ color: '#9ca3af', margin: '0.25rem 0 0' }}>
              case.app/agency/@{currentAgency.handle} · {currentAgency.country_code} ({currentAgency.currency})
            </p>
          )}
        </div>
        <div>
          {currentAgency && (
            <Link
              href={`/agency/${currentAgency.handle}`}
              target="_blank"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: '#f3f4f6',
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              View Public Page ↗
            </Link>
          )}
        </div>
      </div>

      {/* Roster & Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ backgroundColor: '#161a22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>Active Roster</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>{rosterMembers?.length || 0}</div>
        </div>

        <div style={{ backgroundColor: '#161a22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>Pending Join Requests</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: pendingRequests && pendingRequests.length > 0 ? '#f59e0b' : '#f3f4f6' }}>
            {pendingRequests?.length || 0}
          </div>
        </div>

        <div style={{ backgroundColor: '#161a22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>Membership Limits</div>
          <div style={{ fontSize: '0.9rem', color: '#e5e7eb', marginTop: '0.5rem' }}>
            Max 4 Agencies per user active trigger enforced
          </div>
        </div>
      </div>

      {/* Pending Join Requests Section */}
      {currentAgency && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>Pending Join Requests</h2>
          {(!pendingRequests || pendingRequests.length === 0) ? (
            <div style={{ backgroundColor: '#161a22', padding: '1.5rem', borderRadius: '12px', color: '#9ca3af', textAlign: 'center' }}>
              No pending join requests right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingRequests.map((req: any) => (
                <div key={req.id} style={{ backgroundColor: '#161a22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{req.profiles?.display_name || 'Applicant'}</div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>@{req.profiles?.handle} · {req.profiles?.category || 'Talent'}</div>
                    {req.message && <div style={{ fontSize: '0.9rem', color: '#e5e7eb', marginTop: '0.4rem' }}>"{req.message}"</div>}
                  </div>
                  <div>
                    <form action="/api/agency/approve-member" method="POST">
                      <input type="hidden" name="request_id" value={req.id} />
                      <button type="submit" style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Approve & Provision Subaccount
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Roster Members Section */}
      {currentAgency && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>Roster Members</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {rosterMembers?.map((m: any) => (
              <div key={m.id} style={{ backgroundColor: '#161a22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontWeight: 700 }}>{m.profiles?.display_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>@{m.profiles?.handle} · Role: {m.role}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Paystack Subaccount: {m.paystack_subaccount || 'Manual/Pending'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Data Sovereignty Safeguards Notice */}
      <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '14px', padding: '1.25rem', color: '#c7d2fe', fontSize: '0.9rem' }}>
        <strong>Data Sovereignty Guarantee:</strong> All talent proof items, evidence, and personal profiles remain 100% owned by the individual. Leaving an agency or dissolving an agency keeps personal Case profiles intact.
      </div>
    </div>
  )
}
