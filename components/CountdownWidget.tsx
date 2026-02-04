import React, { useState, useEffect } from 'react';
import { Calendar, Plane, Thermometer, Shirt, Umbrella, Sun, CloudSnow, Wind } from 'lucide-react';

interface CountdownWidgetProps {
    tripStartDate: string; // Format: "M/D" e.g., "2/27"
    tripYear?: number; // Optional, defaults to current/next year
}

interface ClothingSuggestion {
    icon: React.ReactNode;
    item: string;
    reason: string;
}

const getClothingSuggestions = (tempHigh: number, tempLow: number, precipChance: number): ClothingSuggestion[] => {
    const suggestions: ClothingSuggestion[] = [];
    const avgTemp = (tempHigh + tempLow) / 2;

    // Base layer suggestions based on temperature
    if (avgTemp < 5) {
        suggestions.push({
            icon: <Shirt size={14} />,
            item: '厚羽絨外套',
            reason: '氣溫極低，需要保暖'
        });
        suggestions.push({
            icon: <Shirt size={14} />,
            item: '發熱衣 + 毛衣',
            reason: '多層穿搭防寒'
        });
    } else if (avgTemp < 10) {
        suggestions.push({
            icon: <Shirt size={14} />,
            item: '中厚度外套',
            reason: '早晚溫差大'
        });
        suggestions.push({
            icon: <Shirt size={14} />,
            item: '薄毛衣 / 衛衣',
            reason: '室內較暖可脫'
        });
    } else if (avgTemp < 18) {
        suggestions.push({
            icon: <Shirt size={14} />,
            item: '輕薄外套 / 風衣',
            reason: '舒適溫度但需備外套'
        });
        suggestions.push({
            icon: <Shirt size={14} />,
            item: '長袖上衣',
            reason: '適合步行觀光'
        });
    } else if (avgTemp < 25) {
        suggestions.push({
            icon: <Sun size={14} />,
            item: '短袖 + 薄外套',
            reason: '白天熱但冷氣房需備'
        });
    } else {
        suggestions.push({
            icon: <Sun size={14} />,
            item: '輕便透氣衣物',
            reason: '天氣炎熱'
        });
    }

    // Rain suggestions
    if (precipChance > 60) {
        suggestions.push({
            icon: <Umbrella size={14} />,
            item: '雨傘 / 雨衣',
            reason: `降雨機率 ${precipChance}%`
        });
    } else if (precipChance > 30) {
        suggestions.push({
            icon: <Umbrella size={14} />,
            item: '摺疊傘備用',
            reason: `可能會下雨 (${precipChance}%)`
        });
    }

    // Wind/cold suggestions
    if (tempLow < 8) {
        suggestions.push({
            icon: <Wind size={14} />,
            item: '圍巾 / 手套',
            reason: `最低溫 ${tempLow}°C`
        });
    }

    return suggestions;
};

export const CountdownWidget: React.FC<CountdownWidgetProps> = ({ tripStartDate, tripYear }) => {
    const [daysUntilTrip, setDaysUntilTrip] = useState<number | null>(null);
    const [tripStatus, setTripStatus] = useState<'upcoming' | 'ongoing' | 'past'>('upcoming');
    const [weather, setWeather] = useState<{ high: number; low: number; precip: number } | null>(null);

    useEffect(() => {
        // Parse trip start date
        const dateMatch = tripStartDate.match(/(\d{1,2})\/(\d{1,2})/);
        if (!dateMatch) return;

        const month = parseInt(dateMatch[1], 10);
        const day = parseInt(dateMatch[2], 10);

        const now = new Date();
        const currentYear = now.getFullYear();

        // Determine the year for the trip
        let year = tripYear || currentYear;
        const tentativeDate = new Date(year, month - 1, day);

        // If date has passed this year and no explicit year given, assume next year
        if (!tripYear && tentativeDate < now) {
            year = currentYear + 1;
        }

        const tripDate = new Date(year, month - 1, day);
        const tripEnd = new Date(year, month - 1, day + 4); // Assume 4-day trip

        // Calculate days difference
        const timeDiff = tripDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (daysDiff > 0) {
            setDaysUntilTrip(daysDiff);
            setTripStatus('upcoming');
        } else if (now >= tripDate && now <= tripEnd) {
            setDaysUntilTrip(0);
            setTripStatus('ongoing');
        } else {
            setTripStatus('past');
        }

        // Fetch weather data
        fetchWeather();
    }, [tripStartDate, tripYear]);

    const fetchWeather = async () => {
        try {
            const cached = (window as any).__weatherCache?.['weather_fukuoka'];
            let data = cached?.data;

            if (!data || Date.now() - cached.timestamp > 10 * 60 * 1000) {
                const response = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=33.5902&longitude=130.4017&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo'
                );
                if (response.ok) {
                    data = await response.json();
                }
            }

            if (data?.daily) {
                // Get first day forecast as representative
                setWeather({
                    high: Math.round(data.daily.temperature_2m_max[0]),
                    low: Math.round(data.daily.temperature_2m_min[0]),
                    precip: data.daily.precipitation_probability_max[0] || 0
                });
            }
        } catch (error) {
            console.error('Failed to fetch weather for clothing suggestions');
        }
    };

    const clothingSuggestions = weather
        ? getClothingSuggestions(weather.high, weather.low, weather.precip)
        : [];

    if (tripStatus === 'past') {
        return null; // Don't show widget for past trips
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-100 p-4 shadow-sm">
            {/* Countdown Section */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Plane size={18} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-indigo-800">福岡之旅</h3>
                        <p className="text-[10px] text-indigo-500">{tripStartDate} 出發</p>
                    </div>
                </div>

                {tripStatus === 'upcoming' && daysUntilTrip !== null && (
                    <div className="text-right">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-indigo-600">{daysUntilTrip}</span>
                            <span className="text-sm font-bold text-indigo-400">天</span>
                        </div>
                        <p className="text-[10px] text-indigo-500 flex items-center gap-1">
                            <Calendar size={10} />
                            倒數中
                        </p>
                    </div>
                )}

                {tripStatus === 'ongoing' && (
                    <div className="flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-full">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-bold text-green-700">旅途進行中！</span>
                    </div>
                )}
            </div>

            {/* Clothing Suggestions */}
            {clothingSuggestions.length > 0 && (
                <div className="border-t border-indigo-100 pt-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Thermometer size={14} className="text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-700">穿搭建議</span>
                        {weather && (
                            <span className="text-[10px] text-indigo-400 ml-auto">
                                預報 {weather.low}°C ~ {weather.high}°C
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {clothingSuggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100 text-xs"
                                title={suggestion.reason}
                            >
                                <span className="text-indigo-500">{suggestion.icon}</span>
                                <span className="font-medium text-gray-700">{suggestion.item}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-indigo-400 mt-2 text-center">
                        ※ 建議根據實際天氣調整
                    </p>
                </div>
            )}
        </div>
    );
};
