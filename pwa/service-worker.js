// Service Worker for Flutter Web PWA
// SIMPLIFIED: Pass-through only - no caching to avoid response clone errors
// This prevents all the "Response body is already used" errors

const CACHE_NAME = 'teacher-eval-app-v1';

// Install - skip caching on install
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate - claim all clients immediately
self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Fetch - SIMPLE PASS-THROUGH: Always use network, never cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // SIMPLE: Just fetch from network, no caching
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Return response as-is, don't clone or cache
        return response;
      })
      .catch((error) => {
        // Network error - return offline error
        console.error('ServiceWorker fetch error:', error);
        return new Response(
          'Network unavailable',
          { status: 503, statusText: 'Service Unavailable' }
        );
      })
  );
});
