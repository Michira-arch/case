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

    // Email sending has been removed per user acquisition/onboarding policy.
    // Instead of auto-sending, we just generate the link and return it for the admin to copy and share manually.

    return NextResponse.json({ success: true, inviteLink });
  } catch (error: any) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
