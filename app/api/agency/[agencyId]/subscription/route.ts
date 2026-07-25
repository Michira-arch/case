import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: { agencyId: string } }) {
  try {
    const supabase = createClient()
    const { agencyId } = params

    const { data: subscription } = await supabase
      .from('agency_subscriptions')
      .select('*')
      .eq('agency_id', agencyId)
      .maybeSingle()

    if (!subscription) {
      // Default tier fallback
      return NextResponse.json({
        subscription: {
          agency_id: agencyId,
          tier: 'tier1',
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          region: 'US/EU',
        },
      })
    }

    return NextResponse.json({ subscription })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
