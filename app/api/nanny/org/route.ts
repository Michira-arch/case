import { NextRequest, NextResponse } from 'next/server'
import { createNannyOrg, updateNannyOrg } from '@/lib/nanny-data'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get owner profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    const body = await req.json()
    const { name, slug, vertical, tagline, description, location_area, contact_email, contact_phone } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const { org, error } = await createNannyOrg({
      owner_profile_id: profile.id,
      name,
      slug: slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-'),
      vertical: vertical || 'caregiving',
      tagline,
      description,
      location_area,
      contact_email,
      contact_phone,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true, org })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { org_id, ...delta } = body

    if (!org_id) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 })
    }

    const { error } = await updateNannyOrg(org_id, delta)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
