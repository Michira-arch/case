// Service Worker for Case PWA
// Caches the dashboard app shell and queues uploads for offline retry

const CACHE_VERSION = 'case-v1'
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

// Activate — clean up old caches
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

// Fetch — network-first for API, cache-first for shell
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

  // Dashboard navigation: serve shell from cache, fill content via network
  if (url.pathname.startsWith('/dashboard') && request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/dashboard') || caches.match('/offline.html')
      )
    )
    return
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(SHELL_CACHE).then((c) => c.put(request, clone))
        }
        return response
      }).catch(() => caches.match('/offline.html'))
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
  // The upload queue is stored in IndexedDB by the app
  // This sync event fires when connectivity is restored
  const clients_list = await clients.matchAll({ type: 'window' })
  for (const client of clients_list) {
    client.postMessage({ type: 'PROCESS_UPLOAD_QUEUE' })
  }
}
