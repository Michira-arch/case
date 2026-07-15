import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app'
import { getMessaging, Messaging } from 'firebase-admin/messaging'

let messagingInstance: Messaging | null = null

try {
  const apps = getApps()
  let app
  if (apps.length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (serviceAccountKey) {
      let credentialsStr = serviceAccountKey.trim()

      // Handle Base64 decoding automatically if it's encoded
      if (!credentialsStr.startsWith('{')) {
        try {
          const cleanBase64 = credentialsStr.replace(/\s+/g, '')
          credentialsStr = Buffer.from(cleanBase64, 'base64').toString('utf8')
        } catch (e) {
          console.error('Failed to decode Base64 Firebase credentials:', e)
        }
      }

      // Safeguard: handle literal unescaped newlines in copy-pasted keys
      // (replacing raw newlines inside JSON with \n is standard)
      try {
        const serviceAccount = JSON.parse(credentialsStr)
        app = initializeApp({
          credential: cert(serviceAccount),
        })
      } catch (parseError) {
        // Fallback for copy-pasted raw private keys with raw newline control characters
        // Escape newlines inside quotes safely
        const sanitized = credentialsStr.replace(/\n/g, '\\n').replace(/\r/g, '')
        const serviceAccount = JSON.parse(sanitized)
        app = initializeApp({
          credential: cert(serviceAccount),
        })
      }
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
