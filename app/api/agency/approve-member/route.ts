import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const { requestId, action } = body;

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get the request and verify the user is the owner of the agency
    const { data: joinRequest } = await supabase
      .from('agency_join_requests')
      .select('*, nanny_orgs(id, name, owner_profile_id), profiles(id, owner_id, email, full_name, display_name)')
      .eq('id', requestId)
      .single();

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
    }

    // Check if the current user is the owner of the agency
    if (joinRequest.nanny_orgs.owner_profile_id !== userProfile.id) {
      return NextResponse.json({ error: 'Unauthorized: Only agency owners can approve or reject members' }, { status: 403 });
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request is already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the request status
    const { error: updateError } = await supabase
      .from('agency_join_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateError) {
      throw updateError;
    }

    if (newStatus === 'approved') {
      // Add the user to the agency members
      const { error: memberError } = await supabase
        .from('nanny_org_members')
        .insert({
          org_id: joinRequest.nanny_orgs.id,
          profile_id: joinRequest.profiles.id,
          role: 'dispatcher' // default role
        });
      
      if (memberError && memberError.code !== '23505') {
        console.error('Failed to add member to agency:', memberError);
      }
    }

    const targetEmail = joinRequest.profiles?.email;
    if (targetEmail) {
      const emailResult = await sendAgencyEmail({
        orgId: joinRequest.nanny_orgs.id,
        to: targetEmail,
        subject: `Your Join Request for ${joinRequest.nanny_orgs.name}`,
        htmlBody: `
          <h2>Join Request ${action === 'approve' ? 'Approved' : 'Rejected'}</h2>
          <p>Your request to join the agency <strong>${joinRequest.nanny_orgs.name}</strong> has been <strong>${newStatus}</strong>.</p>
        `,
        preheader: `Join request ${newStatus}.`
      });

      if (!emailResult.success) {
        console.error('Failed to send status update email:', emailResult.error);
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error('Approve member error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
