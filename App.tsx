import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ITINERARY_DATA } from './constants';
import { TimelineItem } from './components/TimelineItem';
import { Footer } from './components/Footer';
import { WeatherWidget } from './components/WeatherWidget';
import { ShareButton } from './components/ShareButton';
import { Plane, Map as MapIcon, List, Loader2 } from 'lucide-react';

// Lazy load heavy components for code splitting
const DayMap = lazy(() => import('./components/DayMap').then(m => ({ default: m.DayMap })));
const CurrencyWidget = lazy(() => import('./components/CurrencyWidget').then(m => ({ default: m.CurrencyWidget })));

// Loading fallback component
const MapLoadingFallback = () => (
  <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center">
    <div className="flex flex-col items-center gap-2 text-slate-400">
      <Loader2 className="animate-spin" size={32} />
      <span className="text-sm font-medium">載入地圖中...</span>
    </div>
  </div>
);

const WidgetLoadingFallback = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm animate-pulse">
    <div className="h-24 bg-gray-100 rounded"></div>
  </div>
);

const App: React.FC = () => {
  // Read initial day from URL for share link support
  const getInitialDayIndex = () => {
    const params = new URLSearchParams(window.location.search);
    const dayParam = params.get('day');
    if (dayParam) {
      const index = parseInt(dayParam, 10);
      if (!isNaN(index) && index >= 0 && index < ITINERARY_DATA.length) {
        return index;
      }
    }
    return 0;
  };

  const [activeDayIndex, setActiveDayIndex] = useState(getInitialDayIndex);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [highlightedLocation, setHighlightedLocation] = useState<{ lat: number, lng: number } | null>(null);

  // Mobile View State: 'list' or 'map'. Default to 'list' on mobile.
  // On Desktop, this state is ignored as we show both.
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'map'>('list');

  // Update URL when day changes (for shareable links)
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('day', activeDayIndex.toString());
    window.history.replaceState({}, '', url.toString());
  }, [activeDayIndex]);

  useEffect(() => {
    // Scroll to top when day changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Reset view to list on day change for mobile natural flow
    setMobileViewMode('list');
  }, [activeDayIndex]);

  const activeDay = ITINERARY_DATA[activeDayIndex];

  return (
    <div className="min-h-screen font-sans bg-surface-50 text-slate-800 pb-20 md:pb-12">

      {/* Immersive Hero Header */}
      <header className="relative bg-gradient-to-br from-primary-800 via-primary-900 to-sakura-500/30 text-white overflow-hidden pb-8 md:pb-12 rounded-b-[32px] md:rounded-b-[40px] shadow-2xl z-20">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-sakura-400 rounded-full blur-[80px] md:blur-[100px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-sunset-coral rounded-full blur-[80px] md:blur-[100px] animate-pulse-slow"></div>
          <div className="absolute top-[30%] right-[20%] w-[100px] h-[100px] md:w-[200px] md:h-[200px] bg-primary-400 rounded-full blur-[60px] md:blur-[80px]"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-12 md:pt-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-[10px] md:text-xs font-bold tracking-widest uppercase mb-4 md:mb-6 shadow-glow-pink">
            <Plane size={12} className="text-sakura-300" /> 2025 Fukuoka Trip
          </div>

          <h1 className="text-3xl md:text-6xl font-black mb-3 md:mb-4 leading-tight tracking-tight">
            福岡<span className="bg-gradient-to-r from-sakura-300 to-sunset-gold bg-clip-text text-transparent">充實</span>之旅
          </h1>
          <p className="text-white/80 max-w-lg mx-auto text-xs md:text-lg font-light mb-6 md:mb-8 px-4 leading-relaxed">
            從博多地標到門司港懷舊，為您量身打造的 4 天 3 夜完美行程。
          </p>
        </div>

        {/* Day Selector - Horizontal Scroll on Mobile */}
        <div className="relative z-20 px-4 max-w-5xl mx-auto mt-2 md:mt-4">
          <div className="flex gap-3 md:justify-center overflow-x-auto no-scrollbar pb-2 px-2 snap-x snap-mandatory">
            {ITINERARY_DATA.map((day, index) => {
              const isActive = activeDayIndex === index;
              return (
                <button
                  key={day.dayTitle}
                  onClick={() => setActiveDayIndex(index)}
                  className={`snap-center flex-shrink-0 group relative flex flex-col items-start justify-center p-3 md:p-4 min-w-[100px] md:min-w-[120px] rounded-2xl border transition-all duration-300 ${isActive
                    ? 'bg-white text-primary-900 shadow-float scale-105 border-sakura-200'
                    : 'bg-white/10 text-white border-white/10 hover:bg-white/20 hover:border-white/30'
                    }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-sakura-500' : 'text-sakura-200'}`}>
                    {day.date}
                  </span>
                  <span className={`text-lg md:text-xl font-bold ${isActive ? 'text-primary-800' : 'text-white'}`}>
                    {day.dayTitle}
                  </span>
                  {/* Active Indicator Dot */}
                  {isActive && (
                    <div className="absolute top-3 right-3 w-2 h-2 bg-gradient-to-r from-sakura-400 to-sunset-coral rounded-full animate-pulse shadow-glow-pink"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 mt-6 md:mt-12">

        {/* Day Context Title & Weather */}
        <div className="mb-6 md:mb-8 flex flex-col items-center justify-center relative gap-4 md:gap-6">
          <div className="text-center px-2">
            <h2 className="text-xl md:text-3xl font-bold text-slate-800 flex flex-wrap items-center justify-center gap-2 md:gap-3 leading-snug">
              <span className="hidden md:block w-8 h-1 bg-gradient-to-r from-primary-500 to-primary-300 rounded-full"></span>
              {activeDay.theme}
              <span className="hidden md:block w-8 h-1 bg-gradient-to-l from-primary-500 to-primary-300 rounded-full"></span>
            </h2>
            <p className="mt-2 md:mt-3 text-xs md:text-base text-slate-500 font-medium bg-white inline-block px-3 py-1.5 rounded-full shadow-sm border border-slate-100 max-w-full truncate">
              {activeDay.focus}
            </p>
          </div>

          {/* Weather & Share */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <WeatherWidget date={activeDay.date} />
            <ShareButton dayIndex={activeDayIndex} dayTitle={activeDay.dayTitle} />
          </div>
        </div>

        {/* 
          Split View Container 
          - Mobile: Toggles between Map/List using `mobileViewMode`
          - Desktop: Always split view (flex-row)
        */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative">

          {/* Left: Timeline (Visible on Desktop OR when Mobile View is 'list') */}
          <div className={`order-2 lg:order-1 lg:w-3/5 ${mobileViewMode === 'map' ? 'hidden lg:block' : 'block'}`}>
            <div className="relative md:px-4">
              {activeDay.items.map((item, index) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  isLast={index === activeDay.items.length - 1}
                  onActive={setActiveItemId}
                  onRestaurantHover={setHighlightedLocation}
                />
              ))}
            </div>

            {/* Currency Widget - At bottom of timeline */}
            <div className="mt-8 px-4">
              <Suspense fallback={<WidgetLoadingFallback />}>
                <CurrencyWidget />
              </Suspense>
            </div>

            <Footer />
          </div>

          {/* Right: Map (Visible on Desktop OR when Mobile View is 'map') */}
          <div className={`order-1 lg:order-2 lg:w-2/5 ${mobileViewMode === 'list' ? 'hidden lg:block' : 'block'}`}>

            {/* Desktop Layout: Sticky Sidebar with Map + Widget */}
            <div className={`
              flex flex-col gap-4
              ${mobileViewMode === 'map'
                ? 'h-[85vh] w-full'
                : 'lg:sticky lg:top-8 lg:h-[calc(100vh-60px)]'}
            `}>

              {/* Map Container - Grows to fill space */}
              <div className="flex-grow w-full rounded-3xl shadow-float overflow-hidden relative min-h-[300px]">
                <Suspense fallback={<MapLoadingFallback />}>
                  <DayMap
                    items={activeDay.items}
                    activeItemId={activeItemId}
                    highlightedLocation={highlightedLocation}
                  />
                </Suspense>
              </div>

              {/* Mobile-only Hint */}
              {mobileViewMode === 'map' && (
                <p className="text-center text-xs text-slate-400 lg:hidden">
                  點擊地標查看詳情，或切換回列表模式瀏覽行程
                </p>
              )}



            </div>
          </div>

        </div>
      </main>

      {/* Mobile Floating Action Button (FAB) for View Toggle */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 lg:hidden">
        <button
          onClick={() => setMobileViewMode(prev => prev === 'list' ? 'map' : 'list')}
          className="flex items-center gap-2 bg-primary-900 text-white px-6 py-3 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all border border-white/20 backdrop-blur-md"
        >
          {mobileViewMode === 'list' ? (
            <>
              <MapIcon size={18} />
              <span className="text-sm font-bold">地圖模式</span>
            </>
          ) : (
            <>
              <List size={18} />
              <span className="text-sm font-bold">列表模式</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default App;