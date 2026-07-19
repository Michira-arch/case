import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { adminMessaging } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authorization (similar to send/route.ts)
    const authHeader = request.headers.get('Authorization')
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse campaign parameters
    const bodyParams = await request.json().catch(() => ({}))
    const campaign = bodyParams.campaign || 'daily' // 'daily' | 'weekly'

    if (!adminMessaging) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 })
    }

    const supabase = createServiceClient()

    // 3. Fetch active FCM tokens grouped by profile
    const { data: tokenRecords, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('profile_id, token, profiles:profile_id(id, display_name)')

    if (tokenError) throw tokenError
    if (!tokenRecords || tokenRecords.length === 0) {
      return NextResponse.json({ success: true, message: 'No registered devices to notify.' })
    }

    // Group tokens and profile details by profile_id
    const profileMap = new Map<string, { displayName: string; tokens: string[] }>()
    for (const record of tokenRecords) {
      const profile = record.profiles as any
      if (!profile) continue

      if (!profileMap.has(record.profile_id)) {
        profileMap.set(record.profile_id, {
          displayName: profile.display_name || 'there',
          tokens: [],
        })
      }
      profileMap.get(record.profile_id)!.tokens.push(record.token)
    }

    const profileIds = Array.from(profileMap.keys())

    // 4. Batch query analytics events for all target profiles
    const sinceDate = campaign === 'weekly'
      ? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours

    const { data: events, error: eventsError } = await supabase
      .from('analytics_events')
      .select('profile_id, event_type, created_at')
      .in('profile_id', profileIds)
      .gte('created_at', sinceDate)

    if (eventsError) throw eventsError

    // Group events by profile_id
    const eventsByProfile: Record<string, typeof events> = {}
    for (const id of profileIds) {
      eventsByProfile[id] = []
    }
    if (events) {
      for (const event of events) {
        eventsByProfile[event.profile_id]?.push(event)
      }
    }

    const sendPromises = []
    const results: any[] = []

    // 5. Build and send notifications for each profile
    for (const [profileId, info] of profileMap.entries()) {
      const profileEvents = eventsByProfile[profileId] || []
      let title = ''
      let body = ''
      let shouldSend = false

      if (campaign === 'weekly') {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const viewsThisWeek = profileEvents.filter(
          (e: any) => e.event_type === 'profile_view' && new Date(e.created_at).getTime() > oneWeekAgo
        ).length
        const viewsLastWeek = profileEvents.filter(
          (e: any) => e.event_type === 'profile_view' && new Date(e.created_at).getTime() <= oneWeekAgo
        ).length
        const tapsThisWeek = profileEvents.filter(
          (e: any) => e.event_type === 'evidence_tap' && new Date(e.created_at).getTime() > oneWeekAgo
        ).length

        const diff = viewsThisWeek - viewsLastWeek
        const trendSymbol = diff > 0 ? '📈' : diff < 0 ? '📉' : '➖'
        const diffText = diff >= 0 ? `+${diff}` : `${diff}`

        title = 'Your Case Weekly Report Card 📊'
        if (viewsThisWeek === 0) {
          body = `Hey ${info.displayName}, no views this week. Share your Case profile bio link to start getting noticed!`
        } else {
          body = `Hi ${info.displayName}! You got ${viewsThisWeek} profile views (${trendSymbol} ${diffText} vs last week) and ${tapsThisWeek} evidence taps. Check out your stats!`;
        }
        shouldSend = true // Always send weekly encouraging stats
      } else {
        // Daily campaign
        const viewsToday = profileEvents.filter((e: any) => e.event_type === 'profile_view').length
        const tapsToday = profileEvents.filter((e: any) => e.event_type === 'evidence_tap').length
        const clicksToday = profileEvents.filter((e: any) => e.event_type === 'social_click').length

        // Only notify daily if there was actual client activity, to avoid notification spam
        if (viewsToday > 0 || tapsToday > 0 || clicksToday > 0) {
          title = 'Your Daily Case Stats ⚡'
          body = `Today: ${viewsToday} view${viewsToday !== 1 ? 's' : ''}`
          if (tapsToday > 0) body += `, ${tapsToday} evidence tap${tapsToday !== 1 ? 's' : ''}`
          if (clicksToday > 0) body += `, ${clicksToday} social click${clicksToday !== 1 ? 's' : ''}`
          body += `. Keep up the great work!`
          shouldSend = true
        }
      }

      if (shouldSend) {
        const promise = adminMessaging.sendEachForMulticast({
          tokens: info.tokens,
          notification: { title, body },
          android: {
            priority: 'high',
            ttl: 604800 * 1000,
          },
          webpush: {
            headers: {
              Urgency: 'high',
              TTL: '604800',
            },
            notification: {
              requireInteraction: true,
              icon: '/icons/icon-192.png',
            },
          },
          data: {
            url: '/dashboard',
            campaign,
          },
        }).then(response => {
          results.push({
            profileId,
            successCount: response.successCount,
            failureCount: response.failureCount,
          })

          // Async cleanup of invalid tokens in background
          const invalidTokens: string[] = []
          response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error) {
              const errCode = resp.error.code
              if (
                errCode === 'messaging/invalid-registration-token' ||
                errCode === 'messaging/registration-token-not-registered'
              ) {
                invalidTokens.push(info.tokens[idx])
              }
            }
          })

          if (invalidTokens.length > 0) {
            supabase
              .from('fcm_tokens')
              .delete()
              .in('token', invalidTokens)
              .catch((err: any) => console.error('Failed to prune stale tokens:', err))
          }
        }).catch((err: any) => {
          console.error(`Failed to send campaign notification to profile ${profileId}:`, err)
          results.push({ profileId, error: err.message })
        })

        sendPromises.push(promise)
      }
    }

    await Promise.all(sendPromises)

    return NextResponse.json({
      success: true,
      campaign,
      notifiedProfilesCount: results.length,
      results,
    })
  } catch (err: any) {
    console.error('Failed to execute notification campaigns:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
