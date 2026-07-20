'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getFirebaseAnalytics } from '@/lib/firebase'
import { logEvent } from 'firebase/analytics'

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const logPageView = async () => {
      try {
        const analytics = await getFirebaseAnalytics()
        if (analytics) {
          logEvent(analytics, 'page_view', {
            page_path: pathname,
            page_search: searchParams?.toString() || '',
            page_title: document.title || 'Case',
          })
        }
      } catch (err) {
        console.warn('Failed to log page view event:', err)
      }
    }

    logPageView()
  }, [pathname, searchParams])

  return null
}
