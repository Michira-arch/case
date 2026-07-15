import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { adminMessaging } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authorization or source (e.g. check API key or secure service header)
    // To allow developer-friendly broadcasts while preventing abuse in production:
    const authHeader = request.headers.get('Authorization')
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { profileId, title, body, data } = await request.json()
    if (!profileId || !title || !body) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (!adminMessaging) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 })
    }

    // 2. Fetch FCM tokens for the profile
    const supabase = createServiceClient()
    const { data: tokenRecords, error: dbError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('profile_id', profileId)

    if (dbError) throw dbError
    if (!tokenRecords || tokenRecords.length === 0) {
      return NextResponse.json({ success: true, message: 'No registered tokens for this profile' })
    }

    const tokens = tokenRecords.map((r: { token: string }) => r.token)

    // 3. Send multicast push notification
    const response = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data: data || {},
    })

    // 4. Clean up invalid/expired tokens reported by Firebase
    const tokensToRemove: string[] = []
    response.responses.forEach((resp: any, idx: number) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code
        // Token is no longer valid
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(tokens[idx])
        }
      }
    })

    if (tokensToRemove.length > 0) {
      await supabase
        .from('fcm_tokens')
        .delete()
        .in('token', tokensToRemove)
    }

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    })
  } catch (err: any) {
    console.error('Failed to send push notification:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
