/**
 * ServiceWorker (sw.js) - 離線快取與資源管理
 * 
 * 功能：
 * - 快取靜態資源（HTML、圖片）供離線使用
 * - 快取地圖磚塊（map tiles）實現離線地圖
 * - 使用 Network-First 策略處理 JS/CSS 避免舊版本問題
 * - 跳過外部 API 請求避免 CORS 錯誤
 * 
 * 版本更新時會自動清除舊快取
 */

// ======================================
// 快取設定
// ======================================

/**
 * 主快取名稱
 * 更新版本號會觸發舊快取的清除
 */
const CACHE_NAME = 'fukuoka-trip-v3';

/**
 * 預先快取的靜態資源
 * 這些資源會在 ServiceWorker 安裝時立即下載
 */
const STATIC_ASSETS = [
  '/Fukuoka-Trip-Guide/',           // 首頁
  '/Fukuoka-Trip-Guide/index.html', // HTML 檔案
];

/**
 * 地圖磚塊專用快取
 * 分開管理是因為地圖磚塊數量龐大，避免影響主快取
 */
const MAP_TILE_CACHE = 'fukuoka-map-tiles-v1';

/**
 * 要跳過攔截的外部網域
 * 這些網域的請求會直接由瀏覽器處理，不經過 ServiceWorker
 * 避免 CORS 問題和不必要的快取
 */
const SKIP_URLS = [
  'maps.googleapis.com',      // Google Maps API
  'maps.gstatic.com',         // Google Maps 靜態資源
  'google.com',               // Google 服務
  'googleusercontent.com',    // Google 使用者內容
  'esm.sh',                   // ESM CDN
  'cdn.tailwindcss.com',      // Tailwind CDN
  'fonts.googleapis.com',     // Google Fonts
  'fonts.gstatic.com',        // Google Fonts 靜態資源
];

// ======================================
// 安裝事件 (Install Event)
// ======================================

/**
 * ServiceWorker 安裝時觸發
 * 
 * 工作內容：
 * 1. 開啟快取
 * 2. 預先下載並快取靜態資源
 * 3. 立即接管（skipWaiting）
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version...');
  
  event.waitUntil(
    // 開啟或建立快取
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      // 將靜態資源加入快取
      // 使用 catch 避免單一資源失敗導致整個安裝失敗
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    })
  );
  
  // 強制新的 ServiceWorker 立即啟用（不等待舊版本關閉）
  self.skipWaiting();
});

// ======================================
// 啟用事件 (Activate Event)
// ======================================

/**
 * ServiceWorker 啟用時觸發（通常在版本更新後）
 * 
 * 工作內容：
 * 1. 刪除所有舊版本的快取
 * 2. 清除當前快取中的舊資產檔案（因為有 hash）
 * 3. 立即接管所有客戶端
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version, clearing old caches...');
  
  event.waitUntil(
    // 取得所有快取名稱
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          // 篩選出不是當前版本的快取
          .filter((name) => name !== CACHE_NAME && name !== MAP_TILE_CACHE)
          // 刪除這些舊快取
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // 額外步驟：清除當前快取中的 /assets/ 檔案
      // 因為這些檔案名稱包含 hash，舊版本的檔案不應該被保留
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
  
  // 立即接管所有客戶端（已開啟的頁面）
  self.clients.claim();
});

// ======================================
// 請求攔截事件 (Fetch Event)
// ======================================

/**
 * 攔截所有網路請求
 * 
 * 策略說明：
 * 1. 外部 API → 跳過，讓瀏覽器處理
 * 2. 地圖磚塊 → 快取優先，網路回退
 * 3. JS/CSS 資產 → 純網路（避免快取舊版本）
 * 4. HTML 文件 → 網路優先，快取回退
 * 5. 其他資源 → 快取優先，網路回退
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ====== 策略 1：跳過外部 API 和 CDN ======
  // 避免 CORS 問題，也避免不必要地快取動態內容
  if (SKIP_URLS.some(domain => url.hostname.includes(domain))) {
    return; // 不攔截，讓瀏覽器正常處理
  }

  // ====== 策略 2：跳過非 GET 請求 ======
  // POST、PUT、DELETE 等請求不應該被快取
  if (event.request.method !== 'GET') {
    return;
  }

  // ====== 策略 3：地圖磚塊（Cache First） ======
  // 地圖磚塊很少變化，使用快取優先策略
  if (url.hostname.includes('tile') || 
      url.hostname.includes('basemaps') || 
      url.hostname.includes('openstreetmap') ||
      url.hostname.includes('arcgisonline')) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            // 快取命中，直接回傳
            return response;
          }
          // 快取未命中，從網路取得
          return fetch(event.request).then((networkResponse) => {
            // 只快取成功且非跨域的回應
            if (networkResponse.ok && networkResponse.type !== 'opaque') {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // 網路失敗，回傳空回應（地圖會顯示空白磚塊）
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // ====== 策略 4：JS/CSS 資產（Network Only） ======
  // 這些檔案名稱包含 hash，快取舊版本會導致問題
  // 所以不快取，每次都從網路取得
  if (url.pathname.includes('/assets/') && 
      (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(
      fetch(event.request)
        .catch((error) => {
          // 網路失敗時顯示錯誤訊息
          console.error('[SW] Failed to fetch asset:', url.pathname, error);
          return new Response('離線中 - 無法載入資源', { 
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // ====== 策略 5：HTML 文件（Network First） ======
  // HTML 需要保持最新，但離線時可以使用快取
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            // 網路成功，更新快取
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 網路失敗，嘗試使用快取
          return caches.match(event.request).then((cachedResponse) => {
            // 如果沒有快取，回傳 index.html 作為 fallback
            return cachedResponse || caches.match('/Fukuoka-Trip-Guide/index.html');
          });
        })
    );
    return;
  }

  // ====== 策略 6：其他資源（Cache First） ======
  // 圖片、字體等資源使用快取優先策略
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // 快取命中
        return response;
      }
      // 快取未命中，從網路取得
      return fetch(event.request).then((networkResponse) => {
        // 只快取成功的同源回應
        if (networkResponse.ok && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 所有都失敗，回傳離線訊息
        return new Response('離線中', { status: 503 });
      });
    })
  );
});
