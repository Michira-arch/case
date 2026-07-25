import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
  const supabase = createClient();
  const { data: payouts, error } = await supabase
    .from('agency_payout_ledger')
    .select('*')
    .eq('agency_id', params.agencyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payouts });
}

export async function POST(request: Request, { params }: { params: { agencyId: string } }) {
  const supabase = createClient();
  const body = await request.json();
  const { user_id, amount, currency } = body;

  const { data: ledger, error: ledgerError } = await supabase
    .from('agency_payout_ledger')
    .select('available_balance')
    .eq('agency_id', params.agencyId)
    .eq('user_id', user_id)
    .single();

  if (ledgerError || !ledger || ledger.available_balance < amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  const { error: txError } = await supabase
    .from('agency_transactions')
    .insert({
      agency_id: params.agencyId,
      type: 'payout',
      amount,
      currency,
      debit_account: `talent_payable_${user_id}`,
      credit_account: 'escrow_outbound',
      reference_id: `payout_${Date.now()}`
    });

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

  const { data: updated, error: updateError } = await supabase
    .from('agency_payout_ledger')
    .update({ 
      available_balance: ledger.available_balance - amount,
      last_payout_at: new Date().toISOString()
    })
    .eq('agency_id', params.agencyId)
    .eq('user_id', user_id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ payout: updated });
}
