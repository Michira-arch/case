import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { subscription, orgId, org_id, userId } = await req.json();

    // Accept both key spellings (older clients sent org_id)
    const resolvedOrgId = orgId || org_id;

    if (!subscription || !resolvedOrgId) {
      return NextResponse.json({ error: 'Missing subscription or orgId' }, { status: 400 });
    }

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 });
    }

    const supabase = createClient();

    // nanny_push_subscriptions schema: id, org_id, endpoint, keys, created_at
    const { error } = await supabase.from('nanny_push_subscriptions').upsert(
      {
        org_id: resolvedOrgId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        // keep a stable created_at on conflict (upsert keyed by unique endpoint)
        created_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push Subscribe Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
