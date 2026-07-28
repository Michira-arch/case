import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    // Verify user owns the org for this job
    const { data: job } = await supabase
      .from('nanny_ai_cron_jobs')
      .select('org_id')
      .eq('id', params.id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const { data: org } = await supabase
      .from('nanny_orgs')
      .select('id')
      .eq('id', job.org_id)
      .eq('owner_profile_id', profile.id)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Unauthorized to delete this job' }, { status: 403 })
    }

    const { error } = await supabase
      .from('nanny_ai_cron_jobs')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
