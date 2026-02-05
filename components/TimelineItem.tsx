import React, { useState } from 'react';
import {
  MapPin,
  Copy,
  CheckCheck,
  Utensils,
  MapPinned,
  Clock,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  CalendarPlus,
  Loader2,
  X
} from 'lucide-react';
import { ItineraryItem, TransportType } from '../types';
import { TransportIcon } from './TransportIcon';
import { NearbyRestaurants } from './NearbyRestaurants';
import { getPlaceInsight } from '../utils/gemini';
import { searchNearbyRestaurants } from '../utils/places';
import { downloadICS } from '../utils/calendar';
import { ITINERARY_DATA } from '../constants'; // Need to access date context
import { ProgressCheckbox } from './ProgressTracker';

interface TimelineItemProps {
  item: ItineraryItem;
  isLast: boolean;
  isActive?: boolean;
  onActive?: (id: string | null) => void;
  onRestaurantHover?: (location: { lat: number, lng: number } | null) => void;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
}

export const TimelineItem = React.memo<TimelineItemProps>(({
  item,
  isLast,
  isActive = false,
  onActive,
  onRestaurantHover,
  isCompleted = false,
  onToggleComplete
}) => {
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showNearbyRestaurants, setShowNearbyRestaurants] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.address_jp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardClick = () => {
    if (isActive) {
      // Already active? Open maps
      const query = encodeURIComponent(item.googleMapsQuery || item.address_jp);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    } else {
      // Not active? Set as active (focus map)
      onActive?.(item.id);
    }
  };

  const handleAiInsight = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiInsight) {
      setAiInsight(null); // Toggle off
      return;
    }

    setAiLoading(true);

    // 同時搜尋附近餐廳，一起丟給 AI 做諮詢
    try {
      const { restaurants } = await searchNearbyRestaurants(
        item.coordinates.lat,
        item.coordinates.lng,
        500
      );
      const insight = await getPlaceInsight(item.title, restaurants);
      setAiInsight(insight);
    } catch (error) {
      const insight = await getPlaceInsight(item.title);
      setAiInsight(insight);
    }

    setAiLoading(false);
  };

  const handleCalendarExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Find the date for this item. In a real app, this might be passed down via props.
    // Here we search the constants for simplicity of the demo structure.
    const day = ITINERARY_DATA.find(d => d.items.some(i => i.id === item.id));
    if (day) {
      downloadICS(item, day.date);
    }
  };

  return (
    <div
      id={`item-${item.id}`}
      className={`relative pl-4 md:pl-8 pb-10 md:pb-12 group scroll-mt-24 md:scroll-mt-32 transition-all duration-300 ${isActive ? 'z-10' : ''}`}
    // Removed onMouseEnter auto-focus to prevent accidental map movements
    // onMouseEnter={() => onActive?.(item.id)}
    // onMouseLeave={() => onActive?.(null)}
    >
      {/* Timeline Connector */}
      {!isLast && (
        <div className="absolute left-[9px] md:left-[15px] top-6 bottom-0 w-[2px] bg-gradient-to-b from-primary-200 to-transparent group-hover:from-primary-400 transition-colors duration-500"></div>
      )}

      {/* Timeline Node - Now clickable for progress tracking */}
      <div
        className={`absolute left-0 top-6 w-5 h-5 md:w-8 md:h-8 rounded-full shadow-sm z-10 flex items-center justify-center transition-all duration-300 cursor-pointer
          ${isCompleted
            ? 'bg-green-500 border-2 border-green-500'
            : 'bg-surface-50 border-2 border-primary-200 group-hover:border-primary-500 group-hover:scale-110 group-hover:bg-primary-50'
          }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete?.();
        }}
        title={isCompleted ? '標記為未完成' : '標記為已完成'}
      >
        {isCompleted ? (
          <CheckCheck size={14} className="text-white" />
        ) : (
          <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 bg-primary-500 rounded-full"></div>
        )}
      </div>

      {/* Main Card */}
      <div
        onClick={handleCardClick}
        className={`relative rounded-xl md:rounded-2xl shadow-sm hover:shadow-card border p-4 md:p-6 transition-all duration-300 transform md:hover:-translate-y-1 cursor-pointer group/card active:scale-[0.99]
          ${isActive ? 'ring-2 ring-primary-400 ring-offset-2' : ''}
          ${isCompleted
            ? 'bg-green-50/50 border-green-200'
            : 'bg-white border-gray-100'
          }`}
      >
        {/* Completed Badge */}
        {isCompleted && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <CheckCheck size={10} />
            已完成
          </div>
        )}
        {/* Header: Time & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
          <div className="flex items-start md:items-center gap-2 md:gap-3 flex-col md:flex-row">
            <div className="flex items-center gap-1.5 text-primary-600 font-bold bg-primary-50 px-2 py-1 md:px-2.5 md:py-1 rounded-md text-xs md:text-sm whitespace-nowrap">
              <Clock size={12} className="md:w-[14px] md:h-[14px]" />
              {item.time}
            </div>
            <h3 className="text-lg md:text-2xl font-black text-gray-800 leading-tight">
              {item.title}
            </h3>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <button
              onClick={handleAiInsight}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] md:text-xs font-bold border transition-all ${aiInsight
                ? 'bg-purple-100 text-purple-700 border-purple-200'
                : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50'
                }`}
              title="AI 隱藏密技"
            >
              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              <span className="hidden md:inline">AI 密技</span>
            </button>
            <button
              onClick={handleCalendarExport}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] md:text-xs font-bold bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 transition-all"
              title="加入行事曆"
            >
              <CalendarPlus size={12} />
              <span className="hidden md:inline">行事曆</span>
            </button>
            <div className="hidden md:flex opacity-0 group-hover/card:opacity-100 transition-opacity text-primary-400 text-xs items-center gap-1 ml-2">
              {isActive ? (
                <>Open Map <ArrowRight size={12} /></>
              ) : (
                <>Click to Focus <MapPinned size={12} /></>
              )}
            </div>
          </div>
        </div>

        {/* AI Insight Content */}
        {aiInsight && (
          <div className="mb-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-lg p-3 animate-in fade-in slide-in-from-top-2 relative">
            <button
              onClick={(e) => { e.stopPropagation(); setAiInsight(null); }}
              className="absolute top-2 right-2 text-purple-300 hover:text-purple-500"
            >
              <X size={14} />
            </button>
            <div className="flex gap-2 items-start">
              <Sparkles size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
              <div
                className="text-sm text-purple-800 leading-relaxed font-medium prose prose-sm prose-purple max-w-none
                  [&>p]:mb-2 [&>p:last-child]:mb-0
                  [&_strong]:text-purple-900 [&_strong]:font-bold
                  [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-1
                  [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1"
                dangerouslySetInnerHTML={{
                  __html: aiInsight
                    // 轉換換行
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/\n/g, '<br/>')
                    // 轉換粗體
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    // 包裝成段落
                    .replace(/^/, '<p>')
                    .replace(/$/, '</p>')
                }}
              />
            </div>
          </div>
        )}

        {/* Description & Transport */}
        <div className="mb-4 md:mb-5 pl-1">
          <p className="text-gray-600 text-sm md:text-base font-medium mb-3 border-l-2 border-accent-red pl-3 py-0.5 leading-relaxed">
            {item.description}
          </p>

          <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs font-semibold text-gray-500">
            <TransportIcon type={item.transportType} />
            {item.transportDetail}
          </div>
        </div>

        {/* Info Grid (Food/Nearby/Shopping) */}
        <div className="space-y-4 border-t border-dashed border-gray-100 pt-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Food */}
            {item.recommendedFood.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Utensils size={12} /> 美食推薦
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.recommendedFood.map((food, i) => (
                    <span key={i} className="text-xs text-gray-700 bg-orange-50/80 px-2 py-1 rounded border border-orange-100/50">
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby */}
            {item.nearbySpots.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPinned size={12} /> 順遊景點
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.nearbySpots.map((spot, i) => (
                    <span key={i} className="text-xs text-gray-700 bg-indigo-50/80 px-2 py-1 rounded border border-indigo-100/50">
                      {spot}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shopping Quest */}
          {item.shoppingSideQuests && item.shoppingSideQuests.length > 0 && (
            <div className="bg-gradient-to-r from-rose-50/50 to-transparent p-3 rounded-lg border border-rose-100/50">
              <div className="text-[10px] font-bold text-accent-red uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <ShoppingBag size={12} className="fill-current" />
                必買支線
              </div>
              <div className="flex flex-col gap-2">
                {item.shoppingSideQuests.map((shop, i) => (
                  <div key={i} className="flex flex-wrap md:flex-nowrap items-baseline gap-1 md:gap-2 text-xs leading-relaxed">
                    <span className="font-bold text-rose-700 whitespace-nowrap">{shop.name}</span>
                    <span className="text-rose-400 hidden md:inline">•</span>
                    <span className="text-gray-600 block md:inline w-full md:w-auto pl-2 md:pl-0 border-l-2 md:border-l-0 border-rose-200 md:border-none">{shop.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Restaurants */}
          <NearbyRestaurants
            lat={item.coordinates.lat}
            lng={item.coordinates.lng}
            locationName={item.title}
            isExpanded={showNearbyRestaurants}
            onToggle={() => setShowNearbyRestaurants(!showNearbyRestaurants)}
            onHover={onRestaurantHover}
          />
        </div>

        {/* Footer: Address */}
        <div className="mt-4 md:mt-5 pt-3 md:pt-4 border-t border-gray-100 flex items-center justify-between group/addr">
          <div className="flex items-center gap-2 text-xs text-gray-400 overflow-hidden pr-2">
            <MapPin size={12} className="flex-shrink-0" />
            <span className="truncate font-mono group-hover/addr:text-primary-600 transition-colors">{item.address_jp}</span>
          </div>
          <button
            onClick={handleCopy}
            className={`p-2 md:p-1.5 rounded-md transition-all flex-shrink-0 ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
            title="複製地址"
          >
            {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
          </button>
        </div>

      </div>
    </div>
  );
});