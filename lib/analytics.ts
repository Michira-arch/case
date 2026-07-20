import { createClient } from '@/lib/supabase/client'
import { getFirebaseAnalytics } from './firebase'
import { logEvent } from 'firebase/analytics'

export interface LogEventOptions {
  proofItemId?: string
  referrerHost?: string
  country?: string
  [key: string]: any
}

/**
 * Log analytics event to both Supabase (database analytics) and Firebase Analytics (cloud analytics)
 */
export async function logAnalyticsEvent(
  profileId: string | null | undefined,
  eventType: string,
  opts: LogEventOptions = {}
) {
  // 1. Log to Supabase (keeps in-app Weekly/Monthly reports accurate) if profileId is present
  if (profileId) {
    try {
      const supabase = createClient()

      // Determine device type
      let deviceType = 'desktop'
      if (typeof window !== 'undefined' && window.navigator) {
        const ua = window.navigator.userAgent.toLowerCase()
        if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
          deviceType = 'mobile'
        } else if (/tablet|ipad/i.test(ua)) {
          deviceType = 'tablet'
        }
      }

      await supabase.rpc('log_event', {
        p_profile_id:     profileId,
        p_event_type:     eventType,
        p_device_type:    deviceType,
        p_proof_item_id:  opts.proofItemId || null,
        p_referrer_host:  opts.referrerHost || null,
        p_country:        opts.country || null,
      })
    } catch (err) {
      console.warn('Supabase log_event failed:', err)
    }
  }

  // 2. Log to Firebase Analytics (for cloud-based user behavior & conversion tracking)
  try {
    const analytics = await getFirebaseAnalytics()
    if (analytics) {
      logEvent(analytics, eventType, {
        profile_id:     profileId || 'anonymous',
        device_type:    typeof window !== 'undefined' ? window.navigator?.userAgent : 'unknown',
        ...opts,
      })
    }
  } catch (err) {
    console.warn('Firebase logEvent failed:', err)
  }
}

/**
 * Log standard GA4 purchase event to Firebase Analytics for monetization tracking
 */
export async function logPurchaseEvent(opts: {
  transactionId: string
  value: number
  currency: string
  planId: string
  planName: string
}) {
  try {
    const analytics = await getFirebaseAnalytics()
    if (analytics) {
      logEvent(analytics, 'purchase', {
        transaction_id: opts.transactionId,
        value: opts.value,
        currency: opts.currency,
        items: [
          {
            item_id: opts.planId,
            item_name: opts.planName,
            price: opts.value,
            quantity: 1
          }
        ]
      })
    }
  } catch (err) {
    console.warn('Firebase logPurchaseEvent failed:', err)
  }
}
