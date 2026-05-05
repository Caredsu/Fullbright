// Service Worker for Flutter Web PWA
// Caches static assets for faster loading
const CACHE_NAME = 'teacher-eval-app-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently fail if some assets can't be cached
      });
    })
  );
  self.skipWaiting();
});

// Activate - remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - serve static assets from cache, API calls go to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // For API calls, always use network (internet required anyway)
  if (url.pathname.includes('/api/') || url.host !== self.location.host) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      });
    })
  );
});
