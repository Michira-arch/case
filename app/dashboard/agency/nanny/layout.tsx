import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NannyLayoutClient from './NannyLayoutClient'

export default async function NannyAgencyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  let org = null
  if (profile) {
    const { data: orgData } = await supabase
      .from('nanny_orgs')
      .select('*')
      .eq('owner_profile_id', profile.id)
      .single()
    org = orgData
  }

  return <NannyLayoutClient org={org}>{children}</NannyLayoutClient>
}
