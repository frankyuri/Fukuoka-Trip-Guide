import React, { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, CloudSun, CloudDrizzle, Snowflake, CloudLightning, Loader2, WifiOff } from 'lucide-react';

interface WeatherWidgetProps {
  date: string;
}

interface WeatherState {
  tempHigh: number;
  tempLow: number;
  currentTemp?: number;
  condition: string;
  icon: React.ReactNode;
  precip: number;
  isForecastMatch: boolean;
}

const getWeatherIcon = (code: number, className: string = "text-slate-500") => {
  const iconProps = { className, size: 28 }; // Slightly smaller base size for mobile
  if (code === 0) return <Sun className="text-orange-500" {...iconProps} />;
  if (code === 1 || code === 2 || code === 3) return <CloudSun className="text-amber-400" {...iconProps} />;
  if (code >= 45 && code <= 48) return <Cloud className="text-slate-400" {...iconProps} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className="text-blue-400" {...iconProps} />;
  if (code >= 61 && code <= 67) return <CloudRain className="text-blue-500" {...iconProps} />;
  if (code >= 71 && code <= 77) return <Snowflake className="text-cyan-300" {...iconProps} />;
  if (code >= 80 && code <= 82) return <CloudRain className="text-blue-600" {...iconProps} />;
  if (code >= 85 && code <= 86) return <Snowflake className="text-cyan-400" {...iconProps} />;
  if (code >= 95) return <CloudLightning className="text-purple-500" {...iconProps} />;
  return <Sun className="text-orange-500" {...iconProps} />;
};

const getWeatherConditionText = (code: number): string => {
  if (code === 0) return '晴朗';
  if (code === 1) return '大致晴朗';
  if (code === 2) return '多雲時晴';
  if (code === 3) return '陰天';
  if (code >= 45 && code <= 48) return '起霧';
  if (code >= 51 && code <= 55) return '毛毛雨';
  if (code >= 56 && code <= 57) return '凍雨';
  if (code >= 61 && code <= 65) return '下雨';
  if (code >= 66 && code <= 67) return '冰雨';
  if (code >= 71 && code <= 77) return '下雪';
  if (code >= 80 && code <= 82) return '陣雨';
  if (code >= 85 && code <= 86) return '陣雪';
  if (code >= 95) return '雷雨';
  return '晴時多雲';
};

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ date }) => {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // LocalStorage Cache Implementation
    const CACHE_KEY = `weather_cache_fukuoka`;
    const CACHE_duration = 4 * 60 * 60 * 1000; // 4 hours

    const getCachedWeather = () => {
      try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          if (Date.now() - timestamp < CACHE_duration) {
            return data;
          }
        }
      } catch (e) {
        console.warn('Weather cache read error', e);
      }
      return null;
    };

    const cachedDt = getCachedWeather();
    if (cachedDt) {
      processWeatherData(cachedDt, date);
      setLoading(false); // Ensure loading is set to false immediately if cached
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=33.5902&longitude=130.4017&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo'
        );

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();

        // Cache the response to LocalStorage
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('Weather cache write error', e);
        }

        processWeatherData(data, date);
      } catch (err) {
        console.error("Weather fetch error:", err);
        setError(true);
        setLoading(false);
      }
    };

    fetchWeather();
  }, [date]);

  const processWeatherData = (data: any, dateToMatch: string) => {
    const dateMatch = dateToMatch.match(/(\d{1,2})\/(\d{1,2})/);
    let targetIndex = -1;

    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      const targetDateString = `-${month}-${day}`;
      targetIndex = data.daily.time.findIndex((t: string) => t.endsWith(targetDateString));
    }

    if (targetIndex !== -1) {
      const code = data.daily.weather_code[targetIndex];
      setWeather({
        tempHigh: Math.round(data.daily.temperature_2m_max[targetIndex]),
        tempLow: Math.round(data.daily.temperature_2m_min[targetIndex]),
        condition: getWeatherConditionText(code),
        icon: getWeatherIcon(code),
        precip: data.daily.precipitation_probability_max[targetIndex],
        isForecastMatch: true
      });
    } else {
      const currentCode = data.current.weather_code;
      const todayMax = data.daily.temperature_2m_max[0];
      const todayMin = data.daily.temperature_2m_min[0];

      setWeather({
        tempHigh: Math.round(todayMax),
        tempLow: Math.round(todayMin),
        currentTemp: Math.round(data.current.temperature_2m),
        condition: getWeatherConditionText(currentCode),
        icon: getWeatherIcon(currentCode),
        precip: data.daily.precipitation_probability_max[0],
        isForecastMatch: false
      });
    }
    setLoading(false);
  }
  if (loading) {
    return (
      <div className="inline-flex bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-2 md:p-3 pr-4 md:pr-5 shadow-sm items-center gap-3 h-[60px] md:h-[72px] justify-center w-full max-w-[200px]">
        <Loader2 className="animate-spin text-primary-400" size={20} />
        <span className="text-xs text-slate-500 font-medium">Updating...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="inline-flex bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-2 md:p-3 pr-4 md:pr-5 shadow-sm items-center gap-3">
        <div className="bg-slate-100 rounded-full p-2">
          <WifiOff className="text-slate-400" size={20} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] md:text-xs font-bold text-slate-400">Fukuoka</span>
          <span className="text-xs md:text-sm font-medium text-slate-500">無法連線</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-2 md:p-3 pr-4 md:pr-5 shadow-sm items-center gap-3 md:gap-4 transition-all hover:bg-white/80 hover:shadow-md max-w-full">
      <div className="bg-blue-50 rounded-full p-2 md:p-2.5 shadow-inner flex-shrink-0">
        {weather.icon}
      </div>
      <div className="flex flex-col items-start min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            {weather.isForecastMatch ? 'Forecast' : 'Live Now'}
          </span>
          {weather.precip > 0 && (
            <span className="text-[10px] font-bold text-blue-500 flex items-center bg-blue-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              <CloudRain size={10} className="mr-1" /> {weather.precip}%
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-1 md:gap-1.5">
          {weather.isForecastMatch ? (
            <>
              <span className="text-xl md:text-2xl font-black text-slate-700 tracking-tight">{weather.tempHigh}°</span>
              <span className="text-xs md:text-sm font-semibold text-slate-400">/ {weather.tempLow}°</span>
            </>
          ) : (
            <>
              <span className="text-xl md:text-2xl font-black text-slate-700 tracking-tight">{weather.currentTemp}°</span>
              <span className="text-[10px] md:text-xs font-semibold text-slate-400 ml-0.5 whitespace-nowrap">(目前)</span>
            </>
          )}

          <span className="text-xs md:text-sm font-medium text-slate-600 ml-1 border-l border-slate-200 pl-2 truncate">
            {weather.condition}
          </span>
        </div>
      </div>
    </div>
  );
};
