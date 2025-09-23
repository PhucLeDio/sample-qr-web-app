// Enhanced service worker with offline fallback, sync, periodicSync and push handlers
const CACHE_NAME = 'qr-app-cache-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [ '/', OFFLINE_URL, '/favicon.ico' ];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // clean up old caches if any
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => k !== CACHE_NAME && caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // For navigation requests, serve the cached shell or offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          // optionally update cache with the latest navigation response
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return resp;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For other requests, try cache-first then network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => {
      // fallback to offline page for HTML responses
      if (request.headers.get('accept')?.includes('text/html')) {
        return caches.match(OFFLINE_URL);
      }
      return null;
    }))
  );
});

// Background sync (one-off)
self.addEventListener('sync', (event) => {
  console.log('[SW] sync event', event.tag);
  if (event.tag === 'sync-requests') {
    event.waitUntil(
      (async () => {
        // Placeholder: implement replay of queued requests here (IndexedDB)
        console.log('[SW] performing queued sync tasks (placeholder)');
      })()
    );
  }
});

// Periodic background sync (requires browser support and permission)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] periodicsync', event.tag);
  if (event.tag === 'content-sync') {
    event.waitUntil(
      (async () => {
        try {
          const resp = await fetch('/');
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/', resp.clone());
          console.log('[SW] content-sync completed');
        } catch (err) {
          console.error('[SW] content-sync failed', err);
        }
      })()
    );
  }
});

// Push notifications handler
self.addEventListener('push', (event) => {
  console.log('[SW] push received');
  let data = { title: 'Notification', body: 'You have a new message' };
  try {
    if (event.data) data = event.data.json();
  } catch (err) {
    data = { title: 'Notification', body: event.data?.text() || 'You have a new message' };
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.url || '/',
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const hadWindow = clientsArr.some((windowClient) => {
        if (windowClient.url === url) {
          windowClient.focus();
          return true;
        }
        return false;
      });
      if (!hadWindow) self.clients.openWindow(url);
    })
  );
});
