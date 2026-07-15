import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app'
import { getMessaging, Messaging } from 'firebase-admin/messaging'

let messagingInstance: Messaging | null = null

try {
  const apps = getApps()
  let app
  if (apps.length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey)
      app = initializeApp({
        credential: cert(serviceAccount),
      })
    } else {
      // Fallback/local development: init with default options / projectId
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'case-pow-99',
      })
    }
  } else {
    app = getApp()
  }

  messagingInstance = getMessaging(app)
} catch (err) {
  console.error('Firebase Admin initialization error:', err)
}

export const adminMessaging = messagingInstance
