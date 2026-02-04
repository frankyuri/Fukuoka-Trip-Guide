const CACHE_NAME = 'fukuoka-trip-v2';
const STATIC_ASSETS = [
  '/Fukuoka-Trip-Guide/',
  '/Fukuoka-Trip-Guide/index.html',
];

// Tile URLs to cache for offline map support
const MAP_TILE_CACHE = 'fukuoka-map-tiles-v1';

// URLs to skip (don't intercept these)
const SKIP_URLS = [
  'maps.googleapis.com',
  'maps.gstatic.com',
  'google.com',
  'googleusercontent.com',
  'esm.sh',
  'cdn.tailwindcss.com',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
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

  // Skip external APIs and CDNs to avoid CORS issues
  if (SKIP_URLS.some(domain => url.hostname.includes(domain))) {
    return; // Let the browser handle these requests normally
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

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
            // Only cache successful, non-opaque responses
            if (networkResponse.ok && networkResponse.type !== 'opaque') {
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

  // For JS/CSS assets, use network-first strategy to avoid stale bundles
  if (url.pathname.includes('/assets/') && 
      (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || new Response('離線中 - 無法載入資源', { status: 503 });
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
        // Cache successful GET requests for static assets (non-opaque only)
        if (networkResponse.ok && networkResponse.type !== 'opaque') {
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
