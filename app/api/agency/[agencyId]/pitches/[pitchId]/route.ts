import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: { agencyId: string, pitchId: string } }) {
  const supabase = createClient();
  const { data: pitch, error } = await supabase
    .from('agency_pitches')
    .select('*')
    .eq('agency_id', params.agencyId)
    .eq('id', params.pitchId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pitch });
}

export async function PATCH(request: Request, { params }: { params: { agencyId: string, pitchId: string } }) {
  const supabase = createClient();
  const body = await request.json();

  const { data: pitch, error } = await supabase
    .from('agency_pitches')
    .update({ status: body.status })
    .eq('agency_id', params.agencyId)
    .eq('id', params.pitchId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pitch });
}
