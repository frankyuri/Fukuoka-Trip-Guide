const CACHE_NAME = 'fukuoka-trip-v1';
const STATIC_ASSETS = [
  '/Fukuoka-Trip-Guide/',
  '/Fukuoka-Trip-Guide/index.html',
];

// Tile URLs to cache for offline map support
const MAP_TILE_CACHE = 'fukuoka-map-tiles-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== MAP_TILE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache map tiles for offline use
  if (url.hostname.includes('tile') || 
      url.hostname.includes('basemaps') || 
      url.hostname.includes('openstreetmap') ||
      url.hostname.includes('arcgisonline')) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((networkResponse) => {
            // Only cache successful responses
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return a placeholder for failed tile requests
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache successful GET requests for static assets
        if (event.request.method === 'GET' && networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/Fukuoka-Trip-Guide/index.html') || new Response('離線中', { status: 503 });
        }
        return new Response('離線中', { status: 503 });
      });
    })
  );
});
