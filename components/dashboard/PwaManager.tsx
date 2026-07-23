'use client'

import { useState, useEffect } from 'react'
import { requestNotificationPermissionAndGetToken } from '@/lib/firebase'
import { createClient } from '@/lib/supabase/client'
import styles from './PwaManager.module.css'

interface PwaManagerProps {
  profileId: string
}

export default function PwaManager({ profileId }: PwaManagerProps) {
  // PWA installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  // Network state
  const [isOffline, setIsOffline] = useState(false)

  // Notification state
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default')
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Track online/offline status
    setIsOffline(!navigator.onLine)
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 1. Check current notification permission
    if ('Notification' in window) {
      setPermissionState(Notification.permission)
      
      if (Notification.permission === 'granted') {
        // Auto-sync token to Supabase if permission is already granted
        const syncToken = async () => {
          try {
            const token = await requestNotificationPermissionAndGetToken()
            if (token) {
              const supabase = createClient()
              await supabase.from('fcm_tokens').upsert({
                profile_id: profileId,
                token: token,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'token' })
            }
          } catch (err) {
            console.error('Failed to auto-sync push token:', err)
          }
        }
        syncToken()
      } else {
        const dismissed = localStorage.getItem('push_prompt_dismissed')
        if (Notification.permission === 'default' && dismissed !== 'true') {
          // Show soft prompt after 3 seconds
          const timer = setTimeout(() => setShowPushPrompt(true), 3000)
          return () => clearTimeout(timer)
        }
      }
    }

    // 2. Service Worker registration & PWA update management
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered successfully:', reg.scope)
          
          // Check for background updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Tell new SW to skip waiting so clients update smoothly
                  newWorker.postMessage({ type: 'SKIP_WAITING' })
                }
              })
            }
          })
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err)
        })

      // When the controlling Service Worker changes, smoothly refresh without losing auth cookies
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }

    // Check if PWA is running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    setIsInstalled(isStandalone)

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Detect iOS Safari
  const isIosSafari = () => {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent
    const isIos = /iPhone|iPad|iPod/i.test(ua)
    const isSafari = /Safari/i.test(ua) && !/CriOS/i.test(ua) && !/FxiOS/i.test(ua)
    return isIos && isSafari
  }

  // Handle native install prompt (Desktop/Android)
  const handleInstallClick = async () => {
    if (isIosSafari()) {
      setShowIosGuide(true)
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to install prompt: ${outcome}`)

    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  // Trigger browser notification request after user accepts soft prompt
  const handleEnableNotifications = async () => {
    setRegistering(true)
    setShowPushPrompt(false)
    try {
      const token = await requestNotificationPermissionAndGetToken()
      if (token) {
        const supabase = createClient()
        await supabase.from('fcm_tokens').upsert({
          profile_id: profileId,
          token: token,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'token' })
        setPermissionState('granted')
      } else {
        // Permission was denied or failed
        if ('Notification' in window) {
          setPermissionState(Notification.permission)
        }
      }
    } catch (err) {
      console.error('Failed to enable push notifications:', err)
    } finally {
      setRegistering(false)
    }
  }

  const handleDismissNotifications = () => {
    setShowPushPrompt(false)
    localStorage.setItem('push_prompt_dismissed', 'true')
  }

  return (
    <>
      {/* 1. Soft Push Notification Prompt (Modal) */}
      {showPushPrompt && (
        <div className={styles.promptOverlay}>
          <div className={styles.promptCard} role="dialog" aria-modal="true">
            <div className={styles.iconCircle}>🔔</div>
            <h3 className={styles.promptTitle}>Enable Real-time Updates</h3>
            <p className={styles.promptText}>
              Get instant push notifications when clients view your proof items, submit recommendations, or look at your dossier.
            </p>
            <div className={styles.actions}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={handleDismissNotifications}
              >
                Not now
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleEnableNotifications}
              >
                Yes, notify me
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Download / Install Banner */}
      {(!isInstalled && (isInstallable || isIosSafari())) && (
        <div className={styles.installBanner}>
          <div className={styles.bannerContent}>
            <span className={styles.bannerIcon}>📱</span>
            <div>
              <p className={styles.bannerTitle}>Install Case App</p>
              <p className={styles.bannerText}>
                Access your proof of work dashboard instantly from your home screen, offline.
              </p>
            </div>
          </div>
          <button className={styles.installBtn} onClick={handleInstallClick}>
            Download App
          </button>
        </div>
      )}

      {/* 3. iOS Add to Home Screen Instructions Modal */}
      {showIosGuide && (
        <div className={styles.guideOverlay} onClick={() => setShowIosGuide(false)}>
          <div className={styles.guideCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.guideHeader}>
              <h3>Install Case on iPhone</h3>
              <button className={styles.closeBtn} onClick={() => setShowIosGuide(false)}>✕</button>
            </div>
            <div className={styles.guideBody}>
              <p className={styles.guideIntro}>
                Safari requires manual installation for PWAs on iOS. Follow these steps:
              </p>
              <ol className={styles.steps}>
                <li>
                  Tap the **Share** button <span className={styles.actionIcon}>📤</span> at the bottom of Safari.
                </li>
                <li>
                  Scroll down the share menu and select **Add to Home Screen** <span className={styles.actionIcon}>➕</span>.
                </li>
                <li>
                  Tap **Add** in the top right corner to complete.
                </li>
              </ol>
            </div>
            <div className={styles.guideFooter}>
              <button className={styles.doneBtn} onClick={() => setShowIosGuide(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Offline Toast Banner */}
      {isOffline && (
        <div className={styles.offlineToast} role="status">
          <span>📡</span>
          <span>You are currently offline. Saved data remains accessible.</span>
        </div>
      )}
    </>
  )
}
