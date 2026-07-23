// Service Worker for Case PWA
// Uses Network-First for navigation & Next.js assets to ensure smooth app updates while preserving offline capability

const CACHE_VERSION = 'case-v2'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const DATA_CACHE  = `${CACHE_VERSION}-data`

const SHELL_URLS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/offline.html',
]

// Install — cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

// Activate — clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('case-') && k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Listen for SKIP_WAITING message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Fetch — Network-First for HTML & Next.js build assets, Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never intercept Supabase or external API calls
  if (url.hostname.includes('supabase') ||
      url.hostname.includes('paystack') ||
      url.hostname.includes('r2.cloudflarestorage')) {
    return
  }

  // API routes: network-only
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Navigation (HTML pages) and Next.js JS/CSS chunks: Network-First with cache fallback
  if (request.mode === 'navigate' || url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          if (request.mode === 'navigate') {
            return (await caches.match('/dashboard')) || (await caches.match('/offline.html'))
          }
          return Promise.reject('offline')
        })
    )
    return
  }

  // Static assets (images, icons, styles): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok && networkResponse.type === 'basic') {
            const clone = networkResponse.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone))
          }
          return networkResponse
        })
        .catch(() => cached)

      return cached || fetchPromise
    })
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Case', {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      data: data.url ? { url: data.url } : undefined,
      tag: data.tag || 'case-notification',
    })
  )
})

// Notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

// Background sync for queued uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-queue') {
    event.waitUntil(processUploadQueue())
  }
})

async function processUploadQueue() {
  const clients_list = await clients.matchAll({ type: 'window' })
  for (const client of clients_list) {
    client.postMessage({ type: 'PROCESS_UPLOAD_QUEUE' })
  }
}

