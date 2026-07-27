import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { subscription, orgId, userId } = await req.json();
    
    if (!subscription || !orgId) {
      return NextResponse.json({ error: 'Missing subscription or orgId' }, { status: 400 });
    }

    const supabase = createClient();
    
    // We assume nanny_push_subscriptions has: id, org_id, user_id, subscription_json, created_at
    const { error } = await supabase.from('nanny_push_subscriptions').insert({
      org_id: orgId,
      user_id: userId || null,
      subscription_json: subscription,
      created_at: new Date().toISOString()
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push Subscribe Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
