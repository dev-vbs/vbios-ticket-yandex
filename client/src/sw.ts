/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(event.request, { ignoreSearch: true })) || (await caches.match('/index.html')) || (await caches.match('/offline.html')) || Response.error()))
})

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; icon?: string; badge?: string; url?: string; tag?: string } = {}
  try {
    data = event.data?.json() || {}
  } catch {
    data = { body: event.data?.text() || '' }
  }

  const { title = 'Новое уведомление', body = 'Откройте кабинет, чтобы узнать подробности.', url = '/notifications', tag } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...(tag ? { tag } : {}),
      data: { url, title, body },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const notifData = event.notification.data as { url?: string; title?: string; body?: string }
  const path = notifData?.url || '/'
  let target: URL
  try { target = new URL(path, self.location.origin) } catch { target = new URL('/notifications', self.location.origin) }
  if (target.origin !== self.location.origin) target = new URL('/notifications', self.location.origin)

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        if ('focus' in client) {
          const w = await (client as WindowClient).focus()
          return w.navigate(target.href)
        }
      }
      return self.clients.openWindow(target.href)
    })()
  )
})
