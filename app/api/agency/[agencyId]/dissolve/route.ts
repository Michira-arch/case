import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: { agencyId: string } }
) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if current user is the owner/founder (admin)
  const { data: member, error: memberError } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', params.agencyId)
    .eq('user_id', user.id)
    .single();

  if (memberError || member?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
  }

  const { confirmation_string } = await request.json();

  // Basic "2FA" check via confirmation string (agency handle)
  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('handle')
    .eq('id', params.agencyId)
    .single();

  if (agencyError || !agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  if (confirmation_string !== agency.handle) {
    return NextResponse.json({ error: 'Invalid confirmation string' }, { status: 400 });
  }

  // Call the dissolve_agency_safe RPC
  const { data, error } = await supabase.rpc('dissolve_agency_safe', {
    p_agency_id: params.agencyId
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log the event (if not logged by the RPC)
  await supabase.from('agency_events_log').insert({
    agency_id: params.agencyId,
    actor_id: user.id,
    event_type: 'agency_dissolved',
    metadata: { action: 'dissolve' }
  });

  return NextResponse.json({ success: true, message: 'Agency dissolved successfully' });
}
