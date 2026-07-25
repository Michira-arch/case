import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: clientProfile } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()

    return NextResponse.json({ clientProfile })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { company_name, tagline, industry, website_url, tax_id, logo_url } = body

    const { data: existing } = await supabase
      .from('client_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (existing) {
      const { data: updated, error } = await supabase
        .from('client_profiles')
        .update({
          company_name,
          tagline,
          industry,
          website_url,
          tax_id,
          logo_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, clientProfile: updated })
    } else {
      const handle = (company_name || 'brand').toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.floor(Math.random() * 1000)
      const { data: created, error } = await supabase
        .from('client_profiles')
        .insert({
          owner_id: user.id,
          company_name: company_name || 'My Brand',
          handle,
          tagline,
          industry,
          website_url,
          tax_id,
          logo_url,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, clientProfile: created })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
