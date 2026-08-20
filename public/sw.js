const CACHE_NAME = 'rummikub-pwa-v1.0.1787253316359';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-192x192.svg',
  './pwa-512x512.svg',
  './pwa-maskable.svg',
  './favicon.svg',
];

// Service Worker Installation: Immediate takeover
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Service Worker Activation: Delete ALL old caches immediately
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating new version:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Message listener for instant skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] SKIP_WAITING received, skipping waiting...');
    self.skipWaiting();
  }
});

// Smart Fetch Strategy:
// - version.json: Always Network (bypass cache completely for upgrade checks)
// - Navigation / HTML: Network First (always load latest online, fall back to cache offline)
// - Assets: Cache First (fast loading, fall back to network)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Never cache version.json so live update polling is 100% instant
  if (event.request.url.includes('version.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => new Response('{}', { status: 200 }))
    );
    return;
  }

  const isHTML =
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request) || caches.match('./index.html');
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        });
      })
    );
  }
});
