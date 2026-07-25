import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: { agencyId: string; memberId: string } }
) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role } = await request.json();

  if (!['admin', 'manager', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Check if current user is an admin
  const { data: currentMember, error: currentMemberError } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', params.agencyId)
    .eq('user_id', user.id)
    .single();

  if (currentMemberError || currentMember?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
  }

  // Prevent demoting the last admin
  if (role !== 'admin') {
    const { data: targetMember } = await supabase
      .from('agency_members')
      .select('role')
      .eq('id', params.memberId)
      .single();

    if (targetMember?.role === 'admin') {
      const { count } = await supabase
        .from('agency_members')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', params.agencyId)
        .eq('role', 'admin');

      if (count && count <= 1) {
        return NextResponse.json({ error: 'Cannot demote the last admin' }, { status: 400 });
      }
    }
  }

  const { data, error } = await supabase
    .from('agency_members')
    .update({ role })
    .eq('id', params.memberId)
    .eq('agency_id', params.agencyId)
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
    metadata: { action: 'role_update', target_member: params.memberId, new_role: role }
  });

  return NextResponse.json(data);
}
