import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { handle, name, tagline, description, logo_url, banner_url, country_code, currency, rules } = body

    if (!handle || !name) {
      return NextResponse.json({ error: 'Handle and name are required' }, { status: 400 })
    }

    // Insert Agency
    const { data: agency, error: agencyErr } = await supabase
      .from('agencies')
      .insert({
        owner_id: user.id,
        handle: handle.toLowerCase().trim(),
        name: name.trim(),
        tagline: tagline || null,
        description: description || null,
        logo_url: logo_url || null,
        banner_url: banner_url || null,
        country_code: country_code || 'KE',
        currency: currency || 'KES',
        rules: rules || {
          auto_approve_members: false,
          min_completeness_score: 70,
          default_agency_split_pct: 20.0,
          require_vouched_proofs: true,
        },
      })
      .select()
      .single()

    if (agencyErr) {
      return NextResponse.json({ error: agencyErr.message }, { status: 400 })
    }

    // Add Founder as Admin in agency_members
    const { error: memberErr } = await supabase
      .from('agency_members')
      .insert({
        agency_id: agency.id,
        user_id: user.id,
        role: 'admin',
        status: 'active',
      })

    if (memberErr) {
      console.error('Error creating admin member:', memberErr)
    }

    // Initialize Subscription as trialing/active
    await supabase.from('agency_subscriptions').insert({
      agency_id: agency.id,
      plan_period: '1m',
      status: 'active',
      currency: currency || 'KES',
      amount_paid: 0,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return NextResponse.json({ success: true, agency })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
