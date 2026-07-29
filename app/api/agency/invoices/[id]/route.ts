import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invoice_state, notes } = await req.json()

    // 1. Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    // 2. Get user's orgs
    const { data: orgs } = await supabase
      .from('nanny_orgs')
      .select('id')
      .eq('owner_profile_id', profile.id)

    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ error: 'No agency found' }, { status: 403 })
    }
    
    const orgIds = orgs.map((o: any) => o.id)

    // 3. Verify the invoice belongs to one of their orgs
    const { data: invoice } = await supabase
      .from('nanny_invoices')
      .select('id')
      .eq('id', params.id)
      .in('org_id', orgIds)
      .single()

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found or unauthorized' }, { status: 404 })
    }

    // 4. Update
    const { error: updateError } = await supabase
      .from('nanny_invoices')
      .update({
        invoice_state,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error updating invoice:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
