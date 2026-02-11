import React, { useEffect, useState } from 'react';
import { useWeather } from '../hooks/useWeather';
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
  const { data: weatherData, loading, error } = useWeather();

  useEffect(() => {
    if (!weatherData) return;

    const dateMatch = date.match(/(\d{1,2})\/(\d{1,2})/);
    let targetIndex = -1;

    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      const targetDateString = `-${month}-${day}`;
      targetIndex = weatherData.daily.dates.findIndex((t: string) => t.endsWith(targetDateString));
    }

    if (targetIndex !== -1) {
      const code = weatherData.daily.weatherCodes[targetIndex];
      setWeather({
        tempHigh: weatherData.daily.maxTemps[targetIndex],
        tempLow: weatherData.daily.minTemps[targetIndex],
        condition: getWeatherConditionText(code),
        icon: getWeatherIcon(code),
        precip: weatherData.daily.precipProbabilities[targetIndex],
        isForecastMatch: true
      });
    } else if (weatherData.current) {
      setWeather({
        tempHigh: weatherData.daily.maxTemps[0],
        tempLow: weatherData.daily.minTemps[0],
        currentTemp: weatherData.current.temperature,
        condition: getWeatherConditionText(weatherData.current.weatherCode),
        icon: getWeatherIcon(weatherData.current.weatherCode),
        precip: weatherData.daily.precipProbabilities[0],
        isForecastMatch: false
      });
    }
  }, [weatherData, date]);
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
