import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(body).digest('hex');

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.event === 'charge.success') {
    const supabase = createClient();
    const data = event.data;
    
    const { error: rpcError } = await supabase.rpc('execute_client_payment_split', {
      payload: data
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (data.metadata?.pitch_id) {
      await supabase
        .from('agency_pitches')
        .update({ status: 'accepted' })
        .eq('id', data.metadata.pitch_id);
    }
  }

  return NextResponse.json({ received: true });
}
