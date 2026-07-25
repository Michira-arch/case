import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
  const supabase = createClient();
  const { data: pitches, error } = await supabase
    .from('agency_pitches')
    .select('*')
    .eq('agency_id', params.agencyId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pitches });
}

export async function POST(request: Request, { params }: { params: { agencyId: string } }) {
  const supabase = createClient();
  const body = await request.json();
  const token = crypto.randomBytes(16).toString('hex');

  const { data: pitch, error } = await supabase
    .from('agency_pitches')
    .insert({
      agency_id: params.agencyId,
      created_by: body.created_by,
      client_email: body.client_email,
      token,
      status: 'draft',
      payload: body.payload,
      total_value: body.total_value,
      currency: body.currency || 'USD'
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pitch });
}
