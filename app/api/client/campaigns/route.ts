import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(req.url)
    const handle = searchParams.get('handle')

    if (handle) {
      // Public query by client handle
      const { data: client } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('handle', handle)
        .maybeSingle()

      if (!client) return NextResponse.json({ campaigns: [] })

      const { data: campaigns } = await supabase
        .from('client_campaigns')
        .select('*, agency:agencies(name, handle, logo_url)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })

      return NextResponse.json({ campaigns: campaigns || [] })
    }

    // Auth query for client dashboard
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: clientProfile } = await supabase
      .from('client_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!clientProfile) return NextResponse.json({ campaigns: [] })

    const { data: campaigns } = await supabase
      .from('client_campaigns')
      .select('*, agency:agencies(name, handle, primary_color)')
      .eq('client_id', clientProfile.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
