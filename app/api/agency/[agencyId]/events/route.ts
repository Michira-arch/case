import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { agencyId: string } }
) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is part of the agency
  const { data: member, error: memberError } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', params.agencyId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch last 50 events
  // Assuming actor_id joins to user_profiles or similar, we'll try to join with `profiles` assuming standard supabase auth pattern or a custom table.
  // Using a simplified join on `users` or `profiles` table. Assuming `profiles` table exists for actor profiles.
  const { data, error } = await supabase
    .from('agency_events_log')
    .select(`
      *,
      actor:actor_id(id, full_name, avatar_url, handle)
    `)
    .eq('agency_id', params.agencyId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    // If join fails due to schema difference, fallback to just events
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('agency_events_log')
      .select('*')
      .eq('agency_id', params.agencyId)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }
    return NextResponse.json(fallbackData);
  }

  return NextResponse.json(data);
}
