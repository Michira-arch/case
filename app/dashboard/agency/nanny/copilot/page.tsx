import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CopilotClient from './CopilotClient'

export default async function CopilotPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  const { data: org } = await supabase
    .from('nanny_orgs')
    .select('*')
    .eq('owner_profile_id', profile.id)
    .single()

  if (!org) redirect('/dashboard/agency/nanny')

  // Fetch Action Inbox
  const { data: inboxItems } = await supabase
    .from('nanny_action_inbox')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  return <CopilotClient org={org} initialInbox={inboxItems || []} />
}
