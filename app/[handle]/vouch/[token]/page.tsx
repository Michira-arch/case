import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VouchForm from './VouchForm'

interface Props {
  params: any
}

export const metadata = {
  title: 'Leave a vouch',
  robots: { index: false, follow: false },
}

export default async function VouchPage({ params }: Props) {
  const supabase = createClient()
  const p = await params

  // Get the vouch request by token
  const { data: vouchReq } = await supabase
    .from('vouch_requests')
    .select('*, profiles(display_name, handle, role_line)')
    .eq('token', p.token)
    .eq('status', 'pending')
    .single()

  if (!vouchReq) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>This vouch link is invalid or expired</h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 12 }}>
          It may have already been used or expired (links are valid for 30 days).
        </p>
      </div>
    )
  }

  return <VouchForm vouchRequest={vouchReq} />
}
