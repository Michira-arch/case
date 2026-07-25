import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
  const supabase = createClient();
  const { data: transactions, error } = await supabase
    .from('agency_transactions')
    .select('*')
    .eq('agency_id', params.agencyId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transactions });
}
