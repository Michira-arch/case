import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: { agencyId: string } }
) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if current user is an admin or manager
  const { data: member, error: memberError } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', params.agencyId)
    .eq('user_id', user.id)
    .single();

  if (memberError || (member?.role !== 'admin' && member?.role !== 'manager')) {
    return NextResponse.json({ error: 'Forbidden. Admin or manager access required.' }, { status: 403 });
  }

  const { name, primary_color, secondary_color, location, logo_url, banner_url, showcase_type } = await request.json();

  // Create update object
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (primary_color !== undefined) updates.primary_color = primary_color;
  if (secondary_color !== undefined) updates.secondary_color = secondary_color;
  if (location !== undefined) updates.location = location; // JSONB
  // Depending on schema, logo_url, banner_url, showcase_type might be top-level or in a settings/brand json column
  // Assuming top-level for now
  if (logo_url !== undefined) updates.logo_url = logo_url;
  if (banner_url !== undefined) updates.banner_url = banner_url;
  if (showcase_type !== undefined) updates.showcase_type = showcase_type;

  const { data, error } = await supabase
    .from('agencies')
    .update(updates)
    .eq('id', params.agencyId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log the event
  await supabase.from('agency_events_log').insert({
    agency_id: params.agencyId,
    actor_id: user.id,
    event_type: 'rule_changed',
    metadata: { action: 'branding_updated', updates }
  });

  return NextResponse.json(data);
}
