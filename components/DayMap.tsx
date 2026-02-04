/**
 * DayMap.tsx - 互動式地圖元件
 * 
 * 功能：
 * - 使用 Leaflet 顯示互動式地圖
 * - 顯示行程中每個景點的標記
 * - 支援交通工具篩選（計程車、步行、火車等）
 * - 支援多種地圖樣式（標準、衛星、地形）
 * - 點擊標記可跳轉到對應的時間軸項目
 * - 支援高亮顯示特定位置（如附近餐廳）
 */

import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { ItineraryItem, TransportType } from '../types';
import { Filter, X } from 'lucide-react';
import { TransportIcon, getTransportLabel } from './TransportIcon';

// ======================================
// 型別定義
// ======================================

/**
 * DayMap 元件的 Props
 * @property items - 當日的行程項目陣列
 * @property activeItemId - 目前選中的項目 ID（用於高亮標記）
 * @property highlightedLocation - 要高亮的座標（如從餐廳列表 hover 時）
 */
interface DayMapProps {
  items: ItineraryItem[];
  activeItemId?: string | null;
  highlightedLocation?: { lat: number, lng: number } | null;
}

// ======================================
// 座標驗證工具
// ======================================

/**
 * 驗證座標是否有效
 * 
 * 檢查項目：
 * - 是否為數字型別
 * - 是否為 NaN
 * - 是否為有限數（非 Infinity）
 * - 緯度是否在 -90 ~ 90 範圍
 * - 經度是否在 -180 ~ 180 範圍
 * 
 * @param lat - 緯度
 * @param lng - 經度
 * @returns 是否為有效座標
 */
const isValidCoordinate = (lat: any, lng: any): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

// ======================================
// 地圖圖層設定
// ======================================

/**
 * 可用的地圖磚塊圖層
 * 使用者可以在地圖上切換不同的樣式
 */
const TILE_LAYERS = {
  /** 標準地圖 - CARTO Voyager（清晰、現代風格） */
  Standard: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  /** 衛星影像 - ESRI World Imagery */
  Satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  /** 地形圖 - OpenTopoMap */
  Terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  }
};

/**
 * 渲染交通工具圖示（用於篩選選單）
 */
const renderTransportIcon = (type: TransportType) => <TransportIcon type={type} size={16} />;

// ======================================
// 主元件
// ======================================

/**
 * DayMap 互動式地圖元件
 * 
 * 使用方式：
 * ```tsx
 * <DayMap 
 *   items={dayItems} 
 *   activeItemId={selectedId}
 *   highlightedLocation={hoveredRestaurantLocation}
 * />
 * ```
 */
export const DayMap: React.FC<DayMapProps> = ({ items, activeItemId, highlightedLocation }) => {
  // ====== Refs ======
  /** 地圖容器的 DOM 參考 */
  const mapContainerRef = useRef<HTMLDivElement>(null);
  /** Leaflet Map 實例的參考 */
  const mapInstanceRef = useRef<L.Map | null>(null);

  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const highlightMarkerRef = useRef<L.CircleMarker | null>(null);

  const [activeFilter, setActiveFilter] = useState<TransportType | 'ALL'>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ====== 載入狀態（用於顯示骨架動畫） ======
  const [isMapLoading, setIsMapLoading] = useState(true);

  // Initialize Map and Layer Controls
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // ====== 建立圖層（使用較快的 CDN） ======
    // 使用 updateWhenIdle 和 updateWhenZooming 優化手機效能
    const tileOptions = {
      attribution: TILE_LAYERS.Standard.attribution,
      updateWhenIdle: true,        // 只在停止移動時更新磚塊
      updateWhenZooming: false,    // 縮放時不更新（減少請求）
      keepBuffer: 2,               // 保留周圍 2 塊磚塊的快取
      maxZoom: 18,
      crossOrigin: true,           // 允許快取跨域磚塊
    };

    const standardLayer = L.tileLayer(TILE_LAYERS.Standard.url, tileOptions);
    const satelliteLayer = L.tileLayer(TILE_LAYERS.Satellite.url, {
      ...tileOptions,
      attribution: TILE_LAYERS.Satellite.attribution
    });
    const terrainLayer = L.tileLayer(TILE_LAYERS.Terrain.url, {
      ...tileOptions,
      attribution: TILE_LAYERS.Terrain.attribution
    });

    // ====== 建立地圖實例 ======
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,          // 手動設定位置
      attributionControl: false,
      layers: [standardLayer],     // 預設圖層
      preferCanvas: true,          // 使用 Canvas 渲染（比 SVG 快）
      fadeAnimation: false,        // 關閉淡入動畫（加快顯示）
      zoomAnimation: true,         // 保留縮放動畫
      markerZoomAnimation: true,
    }).setView([33.5902, 130.4017], 13); // 福岡市中心

    mapInstanceRef.current = map;

    // ====== 監聽磚塊載入完成 ======
    standardLayer.on('load', () => {
      setIsMapLoading(false);
    });

    // 如果 3 秒後還沒載入完成，也隱藏 loading（避免卡住）
    setTimeout(() => setIsMapLoading(false), 3000);

    // Add Controls - Position bottom-right to avoid conflict with top filters on mobile
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Use localized labels for the layer control
    const baseMaps = {
      "標準地圖": standardLayer,
      "衛星影像": satelliteLayer,
      "地形圖": terrainLayer
    };
    L.control.layers(baseMaps, undefined, { position: 'bottomright' }).addTo(map);

    // Invalidate size after a slight delay to ensure correct rendering if container resized
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Markers rendering based on Items and Filter
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();

      // Custom Icon Factory
      const createCustomIcon = (index: number) => L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="custom-marker-pin transition-all duration-300"></div><div style="position: absolute; top: -45px; width: 100px; text-align: center; left: -35px; font-weight: bold; color: #4338CA; text-shadow: 0 1px 2px white; pointer-events: none;">${index + 1}</div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -35]
      });

      const validCoords: [number, number][] = [];

      items.forEach((item, index) => {
        // Apply Filter
        if (activeFilter !== 'ALL' && item.transportType !== activeFilter) {
          return;
        }

        const { lat, lng } = item.coordinates || {};

        // Skip items with invalid coordinates
        if (!isValidCoordinate(lat, lng)) {
          console.warn(`Invalid coordinates for item: ${item.title}`, item.coordinates);
          return;
        }

        try {
          const marker = L.marker([lat, lng], { icon: createCustomIcon(index) })
            .addTo(map)
            .bindPopup(`
              <div class="font-sans w-48 p-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold tracking-wide border border-indigo-100">
                    ${item.time}
                  </span>
                </div>
                <h3 class="font-bold text-slate-800 text-sm leading-snug mb-2">${item.title}</h3>
                <p class="text-slate-500 text-[10px] leading-relaxed border-t border-slate-100 pt-2 flex items-start gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 shrink-0 mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  ${item.address_jp}
                </p>
              </div>
            `, {
              closeButton: false,
              className: 'custom-popup',
              minWidth: 200
            });

          // Mobile: Don't auto-scroll timeline if we are in map-only mode (logic handled in App.tsx)
          marker.on('click', () => {
            const element = document.getElementById(`item-${item.id}`);
            // Only scroll if element is visible (desktop or mobile list mode)
            if (element && element.offsetParent !== null) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2');
              setTimeout(() => {
                element.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2');
              }, 2000);
            }
          });

          markersRef.current.set(item.id, marker);
          validCoords.push([lat, lng]);
        } catch (markerError) {
          console.error('Error creating marker for item:', item.title, markerError);
        }
      });

      // Fit bounds to visible markers (only if we have valid coordinates)
      if (validCoords.length > 0) {
        try {
          const bounds = L.latLngBounds(validCoords);
          if (bounds.isValid()) {
            map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
          }
        } catch (boundsError) {
          console.error('Error fitting bounds:', boundsError);
        }
      }

      // Force resize calculation when items change (often implies view change)
      map.invalidateSize();
    } catch (error) {
      console.error('Error in marker rendering:', error);
    }
  }, [items, activeFilter]);

  // Handle Highlighted Location (e.g. from nearby restaurants)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing highlight marker
    if (highlightMarkerRef.current) {
      try {
        highlightMarkerRef.current.remove();
      } catch (e) {
        // Ignore removal errors
      }
      highlightMarkerRef.current = null;
    }

    if (highlightedLocation) {
      const { lat, lng } = highlightedLocation;

      // Validate coordinates before using with Leaflet
      if (!isValidCoordinate(lat, lng)) {
        console.warn('Invalid highlighted location coordinates:', highlightedLocation);
        return;
      }

      try {
        // Fly to location with high zoom
        map.flyTo([lat, lng], 17, {
          duration: 1.0,
          easeLinearity: 0.25
        });

        // Add a temporary highlight marker
        highlightMarkerRef.current = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#F97316', // Orange-500
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map);
      } catch (error) {
        console.error('Error handling highlighted location:', error);
      }
    }
  }, [highlightedLocation]);

  // Handle External Highlight (Hover from Timeline)
  useEffect(() => {
    if (!activeItemId) {
      mapInstanceRef.current?.closePopup();
      return;
    }

    const marker = markersRef.current.get(activeItemId);
    // Only open popup if the marker is actually visible (not filtered out)
    if (marker) {
      marker.openPopup();
      // On mobile map view, we might want to pan to it
      mapInstanceRef.current?.panTo(marker.getLatLng());
    }
  }, [activeItemId]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-card border border-white/50 relative z-0 group">
      {/* 地圖容器 */}
      <div ref={mapContainerRef} className="w-full h-full bg-slate-100" />

      {/* ====== Loading 骨架動畫 ====== */}
      {isMapLoading && (
        <div className="absolute inset-0 bg-slate-100 z-[500] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            {/* 脈動圓圈動畫 */}
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary-200 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-primary-500 rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-medium text-slate-500">載入地圖中...</span>
          </div>
        </div>
      )}

      {/* Custom Filter UI Overlay */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col items-start gap-2">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`p-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 ${isFilterOpen ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          {isFilterOpen ? <X size={20} /> : <Filter size={20} />}
          <span className="text-sm font-bold hidden md:block">
            {activeFilter === 'ALL' ? '交通篩選' : getTransportLabel(activeFilter)}
          </span>
        </button>

        {isFilterOpen && (
          <div className="bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-xl border border-gray-100 flex flex-col gap-1 w-40 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => { setActiveFilter('ALL'); setIsFilterOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${activeFilter === 'ALL' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>全部顯示</span>
              {activeFilter === 'ALL' && <div className="w-2 h-2 bg-primary-500 rounded-full"></div>}
            </button>
            <hr className="border-gray-100 my-1" />
            {Object.values(TransportType).map((type) => (
              <button
                key={type}
                onClick={() => { setActiveFilter(type); setIsFilterOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${activeFilter === type ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {renderTransportIcon(type)}
                {getTransportLabel(type)}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
         .leaflet-popup-content-wrapper {
           border-radius: 12px;
           box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
           padding: 0;
           overflow: hidden;
         }
         .leaflet-popup-content {
           margin: 12px;
         }
         .leaflet-popup-tip {
           box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
         }
         /* Fix Z-index for mobile controls */
         .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
         }
       `}</style>
    </div>
  );
};
