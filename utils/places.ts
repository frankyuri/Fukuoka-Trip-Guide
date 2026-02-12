/**
 * places.ts - Google Places API 整合工具
 * 
 * 功能：
 * - 搜尋指定座標附近的餐廳
 * - 使用 Google Maps JavaScript SDK（自動處理 CORS）
 * - 快取搜尋結果以減少 API 呼叫
 * - 提供格式化函數（價格等級、距離）
 * 
 * 注意：需要在 index.html 載入 Google Maps API 才能使用
 */

// ======================================
// 型別定義
// ======================================

/**
 * 附近餐廳的資料結構
 */
export interface NearbyRestaurant {
  placeId: string;                              // Google Place ID（唯一識別碼）
  name: string;                                 // 餐廳名稱
  rating?: number;                              // 評分（1-5）
  userRatingsTotal?: number;                    // 評論數量
  priceLevel?: number;                          // 價格等級（1-4）
  address: string;                              // 地址
  isOpen?: boolean;                             // 是否營業中
  todayHours?: string;                          // 當天營業時間（如 "11:00 - 22:00"）
  distance?: number;                            // 距離（公尺）
  photoUrl?: string;                            // 照片 URL
  types: string[];                              // 類型標籤（如 restaurant, cafe）
  location?: { lat: number, lng: number };      // 座標
}

/**
 * searchNearbyRestaurants 的回傳型別
 */
export interface NearbyRestaurantsResult {
  restaurants: NearbyRestaurant[];   // 餐廳列表
  apiUnavailable: boolean;           // API 是否無法使用（用於顯示友善提示）
}

// ======================================
// 距離計算工具
// ======================================

/**
 * 使用 Haversine 公式計算兩點之間的球面距離
 * 
 * 原理：假設地球是完美球體，計算兩個經緯度座標之間的最短距離
 * 
 * @param lat1 - 起點緯度
 * @param lng1 - 起點經度
 * @param lat2 - 終點緯度
 * @param lng2 - 終點經度
 * @returns 距離（公尺）
 * 
 * @example
 * const distance = calculateDistance(33.5902, 130.4017, 33.5855, 130.4265);
 * // 回傳約 2700（公尺）
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // 地球半徑（公尺）
  
  // 將角度轉換為弧度
  const φ1 = lat1 * Math.PI / 180;  // 起點緯度（弧度）
  const φ2 = lat2 * Math.PI / 180;  // 終點緯度（弧度）
  const Δφ = (lat2 - lat1) * Math.PI / 180;  // 緯度差（弧度）
  const Δλ = (lng2 - lng1) * Math.PI / 180;  // 經度差（弧度）

  // Haversine 公式
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;  // 距離 = 地球半徑 × 弧度
};

// ======================================
// 快取機制
// ======================================

/**
 * 餐廳搜尋結果的快取介面
 */
interface CacheEntry {
  data: NearbyRestaurantsResult;
  timestamp: number;
}

/**
 * 記憶體快取 (Level 1)
 */
const memoryCache = new Map<string, CacheEntry>();

/**
 * 快取有效期限（24 小時）- 延長快取時間以節省 API
 */
const CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * LocalStorage Key Prefix
 */
const CACHE_PREFIX = 'fuka_places_cache_';

/**
 * 嘗試從快取讀取
 */
const getFromCache = (key: string): NearbyRestaurantsResult | null => {
  // 1. Try Memory
  if (memoryCache.has(key)) {
    const entry = memoryCache.get(key)!;
    if (Date.now() - entry.timestamp < CACHE_DURATION) {
      return entry.data;
    } else {
      memoryCache.delete(key); // Expired
    }
  }

  // 2. Try LocalStorage
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (stored) {
      const entry = JSON.parse(stored) as CacheEntry;
      if (Date.now() - entry.timestamp < CACHE_DURATION) {
        // Hydrate memory cache
        memoryCache.set(key, entry);
        return entry.data;
      } else {
        localStorage.removeItem(CACHE_PREFIX + key); // Expired
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }

  return null;
};

/**
 * 寫入快取
 */
const saveToCache = (key: string, data: NearbyRestaurantsResult) => {
  const entry: CacheEntry = { data, timestamp: Date.now() };
  
  // 1. Memory
  memoryCache.set(key, entry);

  // 2. LocalStorage
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    console.warn('LocalStorage write error (quota exceeded?):', e);
  }
};

// ======================================
// Google Maps 載入檢測
// ======================================

/**
 * 等待 Google Maps API 載入完成
 * 
 * 由於 Google Maps API 是非同步載入的，
 * 這個函數會持續檢查直到 API 可用，或超時（10 秒）
 * 
 * @returns Promise（當 API 準備好時 resolve）
 */
const waitForGoogleMaps = (): Promise<void> => {
  return new Promise((resolve) => {
    // 如果已經載入，直接 resolve
    if ((window as any).google?.maps?.places) {
      resolve();
      return;
    }
    
    let expired = false;

    // 輪詢檢查 API 是否載入
    const checkLoaded = () => {
      if (expired) return; // 超時後停止輪詢
      if ((window as any).google?.maps?.places) {
        resolve();
      } else {
        // 每 100 毫秒檢查一次
        setTimeout(checkLoaded, 100);
      }
    };
    
    // 如果全域標記顯示正在載入，開始檢查
    if ((window as any).googleMapsLoaded) {
      checkLoaded();
    } else {
      // 監聯自訂事件（在 index.html 中觸發）
      window.addEventListener('google-maps-loaded', checkLoaded);
    }
    
    // 10 秒後超時，避免無限等待
    setTimeout(() => {
      expired = true;
      resolve();
    }, 10000);
  });
};

// ======================================
// 主要搜尋函數
// ======================================

/**
 * 搜尋指定座標附近的餐廳
 * 
 * 使用 Google Maps Places API 的 nearbySearch 功能
 * 
 * @param lat - 中心點緯度
 * @param lng - 中心點經度
 * @param radius - 搜尋半徑（公尺），預設 500
 * @returns 搜尋結果（包含餐廳列表和 API 狀態）
 * 
 * @example
 * const result = await searchNearbyRestaurants(33.5902, 130.4017, 500);
 * if (result.apiUnavailable) {
 *   // 顯示 API 不可用的提示
 * } else {
 *   // 使用 result.restaurants
 * }
 */
export const searchNearbyRestaurants = async (
  lat: number, 
  lng: number, 
  radius: number = 500
): Promise<NearbyRestaurantsResult> => {
  
  // ====== 座標驗證 ======
  // 在呼叫 API 前先確認座標有效，避免 NaN 錯誤
  if (typeof lat !== 'number' || typeof lng !== 'number' || 
      isNaN(lat) || isNaN(lng) || 
      !isFinite(lat) || !isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn('Invalid coordinates provided to searchNearbyRestaurants:', { lat, lng });
    return { restaurants: [], apiUnavailable: true };
  }

  // ====== 快取檢查 ======
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${radius}`;
  const cachedData = getFromCache(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  try {
    // ====== 等待 API 載入 ======
    await waitForGoogleMaps();
    
    const google = (window as any).google;
    
    // 如果 API 沒有成功載入，回傳不可用狀態
    if (!google?.maps?.places) {
      console.warn('Google Maps Places library not loaded');
      return { restaurants: [], apiUnavailable: true };
    }

    // ====== 建立 Places Service ======
    // PlacesService 需要一個 DOM 元素（即使不顯示地圖也需要）
    const mapDiv = document.createElement('div');
    const service = new google.maps.places.PlacesService(mapDiv);
    
    // 建立搜尋中心點
    const location = new google.maps.LatLng(lat, lng);
    
    // ====== 建立搜尋請求 ======
    const request = {
      location: location,      // 搜尋中心點
      radius: radius,          // 搜尋半徑（公尺）
      type: 'restaurant',      // 只搜尋餐廳
      language: 'ja'           // 使用日文回傳結果
    };

    // ====== 執行搜尋 ======
    return new Promise((resolve) => {
      service.nearbySearch(request, (results: any[], status: string) => {
        
        // 搜尋成功且有結果
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          
          // 取得今天是星期幾（0 = 週日, 1 = 週一, ...）
          const today = new Date().getDay();
          // Google Places API 的 weekday_text 順序是週一(0)到週日(6)
          // 轉換：JS 的 0(Sun) -> API 的 6, JS 的 1(Mon) -> API 的 0, ...
          const apiDayIndex = today === 0 ? 6 : today - 1;
          
          // 轉換 API 回傳的資料格式
          const restaurants: NearbyRestaurant[] = results.slice(0, 10).map((place: any) => {
            // 解析當天營業時間
            let todayHours: string | undefined;
            if (place.opening_hours?.weekday_text) {
              const todayText = place.opening_hours.weekday_text[apiDayIndex];
              if (todayText) {
                // 格式通常是 "星期一: 11:00 – 22:00" 或 "Monday: 11:00 AM – 10:00 PM"
                const colonIndex = todayText.indexOf(':');
                if (colonIndex !== -1) {
                  todayHours = todayText.substring(colonIndex + 1).trim();
                }
              }
            }
            
            return {
              placeId: place.place_id,
              name: place.name,
              rating: place.rating,
              userRatingsTotal: place.user_ratings_total,
              priceLevel: place.price_level,
              address: place.vicinity || '',
              
              // 判斷是否營業中（API 可能用函數或屬性回傳）
              isOpen: place.opening_hours 
                ? (typeof place.opening_hours.isOpen === 'function' 
                    ? place.opening_hours.isOpen() 
                    : place.opening_hours.open_now) 
                : undefined,
              
              // 當天營業時間
              todayHours,
              
              // 計算與搜尋中心點的距離
              distance: calculateDistance(
                lat, lng, 
                place.geometry.location.lat(), 
                place.geometry.location.lng()
              ),
              
              // 取得第一張照片的 URL
              photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 200 }),
              types: place.types || [],
              
              // 餐廳座標（用於地圖標記）
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              }
            };
          });

          // 按距離排序（近的在前）
          restaurants.sort((a, b) => (a.distance || 0) - (b.distance || 0));

          const result = { restaurants, apiUnavailable: false };
          
          // 儲存到快取
          saveToCache(cacheKey, result);

          resolve(result);
          
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          // 搜尋成功但沒有結果（附近沒有餐廳）
          resolve({ restaurants: [], apiUnavailable: false });
          
        } else {
          // 其他錯誤狀態
          console.error('Places API error:', status);
          resolve({ restaurants: [], apiUnavailable: true });
        }
      });
    });
    
  } catch (error) {
    // 捕捉任何未預期的錯誤
    console.error('Error fetching nearby restaurants:', error);
    return { restaurants: [], apiUnavailable: true };
  }
};

// ======================================
// 格式化工具函數
// ======================================

/**
 * 將價格等級轉換為日圓符號
 * 
 * @param level - 價格等級（1-4）
 * @returns 日圓符號字串
 * 
 * @example
 * formatPriceLevel(1) // "¥"
 * formatPriceLevel(3) // "¥¥¥"
 */
export const formatPriceLevel = (level?: number): string => {
  if (level === undefined) return '';
  return '¥'.repeat(level);
};

/**
 * 將距離轉換為可讀字串
 * 
 * @param meters - 距離（公尺）
 * @returns 格式化後的距離字串
 * 
 * @example
 * formatDistance(350)  // "350m"
 * formatDistance(1500) // "1.5km"
 */
export const formatDistance = (meters?: number): string => {
  if (meters === undefined) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * 搜尋特定地點（用於自動補全地址）
 * @param query - 地點名稱（如 "福岡塔"）
 * @returns 地點資訊 (座標、地址、Place ID)
 */
export const searchPlaceByName = async (query: string): Promise<{
  lat: number;
  lng: number;
  address: string;
  name: string;
  placeId: string;
} | null> => {
  try {
    await waitForGoogleMaps();
    const google = (window as any).google;
    
    if (!google?.maps?.places) return null;

    const mapDiv = document.createElement('div');
    const service = new google.maps.places.PlacesService(mapDiv);
    
    // 使用 TextSearch (比 FindPlaceFromQuery 更有彈性) 
    // 或者 FindPlaceFromQuery (fields: name, geometry, formatted_address)
    // 這裡用 TextSearch 可以取得更多細節，但 FindPlaceFromQuery 較便宜且精確
    const request = {
      query: query,
      fields: ['name', 'geometry', 'formatted_address', 'place_id'],
    };

    return new Promise((resolve) => {
      service.findPlaceFromQuery(request, (results: any[], status: string) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          const place = results[0];
          resolve({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address || '',
            name: place.name,
            placeId: place.place_id
          });
        } else {
          resolve(null);
        }
      });
    });

  } catch (error) {
    console.error('Error searching place:', error);
    return null;
  }
};
