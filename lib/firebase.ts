import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getMessaging, Messaging, getToken } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'case-pow-99.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'case-pow-99',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'case-pow-99.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '5247771290',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:5247771290:web:d87b38466e33df4d1c3ea2',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-7L9JBD8T36',
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const getFirebaseAnalytics = async () => {
  if (typeof window !== 'undefined') {
    const supported = await isSupported()
    if (supported) {
      return getAnalytics(app)
    }
  }
  return null
}

export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (typeof window !== 'undefined') {
    try {
      return getMessaging(app)
    } catch (err) {
      console.warn('Firebase Messaging is not supported or failed to initialize:', err)
    }
  }
  return null
}

/**
 * Request notification permission and return the FCM registration token.
 */
export async function requestNotificationPermissionAndGetToken(vapidKey?: string): Promise<string | null> {
  if (typeof window === 'undefined') return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission not granted:', permission)
      return null
    }

    const messaging = await getFirebaseMessaging()
    if (!messaging) return null

    // VAPID Key can be obtained from Firebase Console Cloud Messaging settings.
    // If not provided, it falls back to standard.
    const token = await getToken(messaging, {
      vapidKey: vapidKey || process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })

    return token
  } catch (err) {
    console.error('Error getting FCM token:', err)
    return null
  }
}

export { app as firebaseApp }
