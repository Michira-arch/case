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

  const { data, error } = await supabase
    .from('agency_rules')
    .select('*')
    .eq('agency_id', params.agencyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: { agencyId: string } }
) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if current user is an admin or manager (depending on rule type)
  // For simplicity, let's say admin/manager can update rules
  const { data: member, error: memberError } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', params.agencyId)
    .eq('user_id', user.id)
    .single();

  if (memberError || (member?.role !== 'admin' && member?.role !== 'manager')) {
    return NextResponse.json({ error: 'Forbidden. Admin or manager access required.' }, { status: 403 });
  }

  const { rule_type, configuration, is_active } = await request.json();

  if (!rule_type || !configuration) {
    return NextResponse.json({ error: 'Missing rule_type or configuration' }, { status: 400 });
  }

  // Upsert the rule
  const { data, error } = await supabase
    .from('agency_rules')
    .upsert({
      agency_id: params.agencyId,
      rule_type,
      configuration,
      is_active: is_active ?? true
    }, { onConflict: 'agency_id, rule_type' })
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
    metadata: { action: 'upsert', rule_type, configuration, is_active }
  });

  return NextResponse.json(data);
}
