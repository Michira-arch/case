import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNannyOrgsByOwner, createShadowWorker } from '@/lib/nanny-data'
import { sendAgencyEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
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

    const orgs = await getNannyOrgsByOwner(profile.id)
    if (orgs.length === 0) {
      return NextResponse.json({ error: 'No agency found for this user' }, { status: 400 })
    }

    const org = orgs[0]
    const body = await req.json()
    const { mode, shadow_name, shadow_email, shadow_phone, role_type, hourly_rate, invite_handle } = body

    if (!role_type) {
      return NextResponse.json({ error: 'role_type is required' }, { status: 400 })
    }

    if (mode === 'invite') {
      // Invite flow: create a shadow worker with invite handle and generate claim link
      if (!invite_handle) {
        return NextResponse.json({ error: 'invite_handle is required for invite mode' }, { status: 400 })
      }

      const { worker, error } = await createShadowWorker({
        org_id: org.id,
        shadow_name: invite_handle, // use handle as placeholder name
        role_type,
      })

      if (error) {
        return NextResponse.json({ error }, { status: 400 })
      }

      const claimUrl = worker?.claim_token
        ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/agency/join/${worker.claim_token}`
        : null

      // Email sending has been removed. The UI will present the link to the admin to manually share.

      return NextResponse.json({
        success: true,
        worker_id: worker?.id,
        claim_url: claimUrl,
        mode: 'invite',
      })
    }

    // Shadow mode (default)
    if (!shadow_name) {
      return NextResponse.json({ error: 'shadow_name is required for shadow mode' }, { status: 400 })
    }

    const { worker, error } = await createShadowWorker({
      org_id: org.id,
      shadow_name,
      shadow_email: shadow_email || undefined,
      shadow_phone: shadow_phone || undefined,
      role_type,
      hourly_rate: hourly_rate ? parseFloat(String(hourly_rate)) : undefined,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      worker_id: worker?.id,
      mode: 'shadow',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
