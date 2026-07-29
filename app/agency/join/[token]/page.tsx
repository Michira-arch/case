import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: { token: string }
}

export default async function ClaimWorkerPage({ params }: Props) {
  const supabase = createClient()
  
  // 1. Check if token is valid
  const { data: worker } = await supabase
    .from('nanny_workers')
    .select('id, org_id, shadow_name, org:nanny_orgs(name, slug)')
    .eq('claim_token', params.token)
    .gt('claim_token_expires', new Date().toISOString())
    .single()

  if (!worker) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Invalid or Expired Link</h1>
        <p style={{ color: 'var(--ink-muted)', marginBottom: 24 }}>This invitation link is no longer valid or has already been claimed.</p>
        <Link href="/" className="btn btn--dark">Go Home</Link>
      </div>
    )
  }

  // 2. Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Redirect to login with a returnTo param
    const returnTo = encodeURIComponent(`/agency/join/${params.token}`)
    redirect(`/login?returnTo=${returnTo}`)
  }

  // 3. Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('owner_id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  // 4. Handle Claim via form submission (Server Action)
  async function claimProfile() {
    'use server'
    const supabaseServer = createClient()
    const { error } = await supabaseServer.rpc('nanny_claim_shadow_worker', {
      p_claim_token: params.token,
      p_profile_id: profile!.id
    })

    if (!error) {
      redirect('/dashboard') // Redirect to their personal dashboard
    } else {
      console.error('Claim error:', error)
      redirect(`/agency/join/${params.token}?error=true`)
    }
  }

  const orgName = Array.isArray(worker.org) ? worker.org[0]?.name : worker.org?.name

  return (
    <div style={{ maxWidth: 480, margin: '100px auto', padding: 32, fontFamily: 'var(--font-sans)', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--card)' }}>
      <h1 style={{ fontSize: 24, marginBottom: 16, fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em' }}>You've been invited!</h1>
      <p style={{ color: 'var(--ink-muted)', marginBottom: 24, lineHeight: 1.5 }}>
        <strong>{orgName}</strong> has invited you to join their agency. 
        When you accept, your profile will be linked to their agency roster.
      </p>
      
      <div style={{ padding: 16, background: 'var(--paper)', borderRadius: 8, marginBottom: 24, border: '1px solid var(--line)' }}>
        <p style={{ fontSize: 14, margin: 0, color: 'var(--ink)' }}>
          You will join as: <br/>
          <strong style={{ fontSize: 16 }}>{profile.display_name}</strong>
        </p>
      </div>

      <form action={claimProfile}>
        <button type="submit" className="btn btn--dark" style={{ width: '100%', padding: '12px', fontSize: 15 }}>
          Accept Invitation
        </button>
      </form>
    </div>
  )
}
