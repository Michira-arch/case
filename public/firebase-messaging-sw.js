// Service worker for Firebase Cloud Messaging background notifications
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js')

firebase.initializeApp({
  projectId: 'case-pow-99',
  messagingSenderId: '5247771290',
  appId: '1:5247771290:web:d87b38466e33df4d1c3ea2',
})

const messaging = firebase.messaging()

// Background messaging handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)

  const notificationTitle = payload.notification?.title || 'Case App Update'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/logo.png', // Fallback to public folder logo
    data: payload.data,
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})
