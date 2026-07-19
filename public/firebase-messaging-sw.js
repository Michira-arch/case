// Service worker for Firebase Cloud Messaging background notifications
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyC1oh4-GS3-x6NUSqGJQA4lxQnY4R1H194',
  projectId: 'case-pow-99',
  messagingSenderId: '5247771290',
  appId: '1:5247771290:web:225ccef2dd88c42aecf523',
})

const messaging = firebase.messaging()

// Background messaging handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)

  const notificationTitle = payload.notification?.title || 'Case App Update'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icons/icon-192.png', // Fallback to public folder logo
    data: payload.data,
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})
