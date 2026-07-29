import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendAgencyEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return NextResponse.json({ error: 'Missing agency ID (org_id)' }, { status: 400 });
    }

    // Check if the request already exists
    const { data: existingRequest } = await supabase
      .from('agency_join_requests')
      .select('id')
      .eq('org_id', org_id)
      .eq('profile_id', userProfile.id)
      .single();

    if (existingRequest) {
      return NextResponse.json({ error: 'Join request already sent' }, { status: 400 });
    }

    // Create the join request bypassing RLS due to profiles table UUID mismatch bug
    const adminSupabase = createServiceClient();
    const { error: insertError } = await adminSupabase
      .from('agency_join_requests')
      .insert({
        org_id,
        profile_id: userProfile.id,
        status: 'pending'
      });

    if (insertError) {
      throw insertError;
    }

    // Notify the agency owner
    const { data: org } = await supabase
      .from('nanny_orgs')
      .select('name, owner_profile_id')
      .eq('id', org_id)
      .single();

    if (org) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', org.owner_profile_id)
        .single();

      if (ownerProfile?.email) {
        const emailResult = await sendAgencyEmail({
          orgId: org_id,
          to: ownerProfile.email,
          subject: `New Request to Join ${org.name}`,
          htmlBody: `
            <h2>New Join Request</h2>
            <p><strong>${userProfile.full_name || userProfile.display_name || 'A user'}</strong> has requested to join your agency: ${org.name}.</p>
            <p>Please log in to your dashboard to review and approve this request.</p>
          `,
          preheader: `You have a new join request from ${userProfile.full_name || userProfile.display_name || 'a user'}.`
        });

        if (!emailResult.success) {
          console.error('Failed to send join request notification email to agency owner:', emailResult.error);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Join request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
