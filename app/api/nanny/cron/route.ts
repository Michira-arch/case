import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { org_id, prompt, schedule } = await req.json()
    
    if (!org_id || !prompt || !schedule) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user owns org
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const { data: org } = await supabase
      .from('nanny_orgs')
      .select('id')
      .eq('id', org_id)
      .eq('owner_profile_id', profile.id)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Unauthorized org' }, { status: 403 })
    }

    let cron_expression = schedule;
    if (schedule === 'daily') cron_expression = '0 0 * * *';
    else if (schedule === 'weekly') cron_expression = '0 0 * * 0';
    else if (schedule === 'monthly') cron_expression = '0 0 1 * *';

    const { data: job, error } = await supabase
      .from('nanny_ai_cron_jobs')
      .insert({
        org_id,
        prompt,
        cron_expression
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Include schedule so client can display it without mapping
    return NextResponse.json({ job: { ...job, schedule } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
