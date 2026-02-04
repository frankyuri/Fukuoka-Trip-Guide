const CACHE_NAME = 'fukuoka-trip-v3';
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
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    })
  );
  // Force the new service worker to activate immediately
  self.skipWaiting();
});

// Activate event - clean up ALL old caches aggressively
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version, clearing old caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== MAP_TILE_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Also clear any cached assets from the current cache
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.keys().then((requests) => {
          return Promise.all(
            requests
              .filter((request) => request.url.includes('/assets/'))
              .map((request) => {
                console.log('[SW] Clearing cached asset:', request.url);
                return cache.delete(request);
              })
          );
        });
      });
    })
  );
  // Take control of all clients immediately
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

  // For JS/CSS assets with hash in filename, use NETWORK ONLY
  // These files have unique hashes, so caching old versions causes issues
  if (url.pathname.includes('/assets/') && 
      (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(
      fetch(event.request)
        .catch((error) => {
          console.error('[SW] Failed to fetch asset:', url.pathname, error);
          return new Response('離線中 - 無法載入資源', { 
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // For HTML documents, use network-first
  if (event.request.destination === 'document') {
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
            return cachedResponse || caches.match('/Fukuoka-Trip-Guide/index.html');
          });
        })
    );
    return;
  }

  // For other requests (images, fonts, etc.), try cache first, then network
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        // Only cache successful, same-origin responses
        if (networkResponse.ok && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return new Response('離線中', { status: 503 });
      });
    })
  );
});

