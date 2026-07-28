import { NextResponse } from 'next/server';
import { sendAgencyEmail } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, agencyId, agencyName } = body;

    if (!email || !agencyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Optional: check if the user is an admin of the agency
    const { data: agencyProfile } = await supabase
      .from('agency_profiles')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!agencyProfile) {
      return NextResponse.json({ error: 'Unauthorized to invite for this agency' }, { status: 403 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/agency/join?agency_id=${agencyId}`;

    const htmlBody = `
      <h2>You have been invited to join ${agencyName || 'an agency'}!</h2>
      <p>We're excited to have you on board. Click the link below to accept your invitation and join the agency dashboard:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" class="btn">Accept Invitation →</a>
      </p>
      <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser: <br/>
      <a href="${inviteLink}">${inviteLink}</a></p>
    `;

    const result = await sendAgencyEmail({
      orgId: agencyId,
      to: email,
      subject: `Invitation to join ${agencyName || 'Agency'}`,
      htmlBody,
      preheader: `You've been invited to join ${agencyName || 'an agency'} on Case.`,
    });

    if (!result.success) {
      console.error('Failed to send invite email:', result.error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
