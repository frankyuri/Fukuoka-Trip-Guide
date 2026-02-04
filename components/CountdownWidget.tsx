/**
 * CountdownWidget.tsx - 倒數計時與穿搭建議元件
 * 
 * 功能：
 * - 顯示距離出發還有幾天
 * - 旅途進行中時顯示「旅途進行中！」
 * - 根據福岡即時天氣提供穿搭建議
 * - 自動判斷年份（如果日期已過，假設是明年）
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Plane, Thermometer, Shirt, Umbrella, Sun, Wind } from 'lucide-react';

// ======================================
// 型別定義
// ======================================

/**
 * 元件 Props
 * @property tripStartDate - 出發日期，格式如 "2/27"
 * @property tripYear - 旅行年份（可選，若不指定則自動判斷）
 */
interface CountdownWidgetProps {
    tripStartDate: string;
    tripYear?: number;
}

/**
 * 穿搭建議項目
 */
interface ClothingSuggestion {
    icon: React.ReactNode;   // 圖示
    item: string;            // 服裝/配件名稱
    reason: string;          // 建議原因
}

// ======================================
// 穿搭建議邏輯
// ======================================

/**
 * 根據天氣資料產生穿搭建議
 * 
 * 邏輯說明：
 * - 根據平均溫度決定基本穿著層次
 * - 根據降雨機率決定是否帶雨具
 * - 根據最低溫決定是否需要配件（圍巾、手套）
 * 
 * @param tempHigh - 最高溫
 * @param tempLow - 最低溫
 * @param precipChance - 降雨機率 (0-100)
 * @returns 穿搭建議陣列
 */
const getClothingSuggestions = (
    tempHigh: number,
    tempLow: number,
    precipChance: number
): ClothingSuggestion[] => {
    const suggestions: ClothingSuggestion[] = [];

    // 計算平均溫度作為穿著依據
    const avgTemp = (tempHigh + tempLow) / 2;

    // ====== 根據溫度建議基本穿著 ======

    if (avgTemp < 5) {
        // 極寒（平均溫度低於 5°C）
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
        // 寒冷（平均溫度 5-10°C）
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
        // 涼爽（平均溫度 10-18°C）
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
        // 溫暖（平均溫度 18-25°C）
        suggestions.push({
            icon: <Sun size={14} />,
            item: '短袖 + 薄外套',
            reason: '白天熱但冷氣房需備'
        });
    } else {
        // 炎熱（平均溫度高於 25°C）
        suggestions.push({
            icon: <Sun size={14} />,
            item: '輕便透氣衣物',
            reason: '天氣炎熱'
        });
    }

    // ====== 根據降雨機率建議雨具 ======

    if (precipChance > 60) {
        // 高降雨機率 > 60%
        suggestions.push({
            icon: <Umbrella size={14} />,
            item: '雨傘 / 雨衣',
            reason: `降雨機率 ${precipChance}%`
        });
    } else if (precipChance > 30) {
        // 中等降雨機率 30-60%
        suggestions.push({
            icon: <Umbrella size={14} />,
            item: '摺疊傘備用',
            reason: `可能會下雨 (${precipChance}%)`
        });
    }

    // ====== 根據最低溫建議保暖配件 ======

    if (tempLow < 8) {
        suggestions.push({
            icon: <Wind size={14} />,
            item: '圍巾 / 手套',
            reason: `最低溫 ${tempLow}°C`
        });
    }

    return suggestions;
};

// ======================================
// 主元件: CountdownWidget
// ======================================

/**
 * 倒數計時與穿搭建議元件
 * 
 * 顯示內容：
 * - 出發倒數天數（距離出發 X 天）
 * - 若正在旅途中，顯示「旅途進行中！」
 * - 根據天氣預報的穿搭建議
 */
export const CountdownWidget: React.FC<CountdownWidgetProps> = ({
    tripStartDate,
    tripYear
}) => {
    // 距離出發的天數（null 表示尚未計算）
    const [daysUntilTrip, setDaysUntilTrip] = useState<number | null>(null);

    // 旅行狀態：'upcoming' 即將出發 / 'ongoing' 進行中 / 'past' 已結束
    const [tripStatus, setTripStatus] = useState<'upcoming' | 'ongoing' | 'past'>('upcoming');

    // 天氣資料（用於穿搭建議）
    const [weather, setWeather] = useState<{ high: number; low: number; precip: number } | null>(null);

    /**
     * 初始化時計算倒數天數和旅行狀態
     */
    useEffect(() => {
        // ====== 解析日期字串 ======
        // 從 "2/27" 格式提取月份和日期
        const dateMatch = tripStartDate.match(/(\d{1,2})\/(\d{1,2})/);
        if (!dateMatch) return;

        const month = parseInt(dateMatch[1], 10);  // 月份
        const day = parseInt(dateMatch[2], 10);    // 日期

        const now = new Date();  // 目前時間
        const currentYear = now.getFullYear();

        // ====== 判斷年份 ======
        // 如果沒有指定年份，自動判斷
        let year = tripYear || currentYear;
        const tentativeDate = new Date(year, month - 1, day);

        // 如果該日期已經過了，假設是明年
        if (!tripYear && tentativeDate < now) {
            year = currentYear + 1;
        }

        // ====== 計算旅行日期範圍 ======
        const tripDate = new Date(year, month - 1, day);          // 出發日
        const tripEnd = new Date(year, month - 1, day + 4);       // 結束日（假設 4 天行程）

        // ====== 計算天數差異 ======
        const timeDiff = tripDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));  // 轉換成天數

        // ====== 設定狀態 ======
        if (daysDiff > 0) {
            // 還沒出發
            setDaysUntilTrip(daysDiff);
            setTripStatus('upcoming');
        } else if (now >= tripDate && now <= tripEnd) {
            // 正在旅途中
            setDaysUntilTrip(0);
            setTripStatus('ongoing');
        } else {
            // 旅行已結束
            setTripStatus('past');
        }

        // 取得天氣資料用於穿搭建議
        fetchWeather();
    }, [tripStartDate, tripYear]);

    /**
     * 從 Open-Meteo API 取得福岡天氣預報
     * 用於產生穿搭建議
     */
    const fetchWeather = async () => {
        try {
            // 檢查是否有快取的天氣資料
            const cached = (window as any).__weatherCache?.['weather_fukuoka'];
            let data = cached?.data;

            // 如果沒有快取或快取超過 10 分鐘，重新取得
            if (!data || Date.now() - cached.timestamp > 10 * 60 * 1000) {
                const response = await fetch(
                    'https://api.open-meteo.com/v1/forecast?' +
                    'latitude=33.5902&longitude=130.4017&' +      // 福岡座標
                    'daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&' +
                    'timezone=Asia%2FTokyo'
                );
                if (response.ok) {
                    data = await response.json();
                }
            }

            // 如果成功取得資料，設定天氣狀態
            if (data?.daily) {
                setWeather({
                    high: Math.round(data.daily.temperature_2m_max[0]),      // 今日最高溫
                    low: Math.round(data.daily.temperature_2m_min[0]),       // 今日最低溫
                    precip: data.daily.precipitation_probability_max[0] || 0  // 降雨機率
                });
            }
        } catch (error) {
            console.error('Failed to fetch weather for clothing suggestions');
        }
    };

    // 根據天氣產生穿搭建議
    const clothingSuggestions = weather
        ? getClothingSuggestions(weather.high, weather.low, weather.precip)
        : [];

    // 如果旅行已結束，不顯示這個元件
    if (tripStatus === 'past') {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-100 p-4 shadow-sm">

            {/* ====== 倒數計時區塊 ====== */}
            <div className="flex items-center justify-between mb-4">
                {/* 左側：標題和出發日期 */}
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Plane size={18} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-indigo-800">福岡之旅</h3>
                        <p className="text-[10px] text-indigo-500">{tripStartDate} 出發</p>
                    </div>
                </div>

                {/* 右側：倒數天數或狀態顯示 */}
                {tripStatus === 'upcoming' && daysUntilTrip !== null && (
                    <div className="text-right">
                        {/* 大數字顯示天數 */}
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-indigo-600">
                                {daysUntilTrip}
                            </span>
                            <span className="text-sm font-bold text-indigo-400">天</span>
                        </div>
                        <p className="text-[10px] text-indigo-500 flex items-center gap-1">
                            <Calendar size={10} />
                            倒數中
                        </p>
                    </div>
                )}

                {/* 旅途進行中的狀態顯示 */}
                {tripStatus === 'ongoing' && (
                    <div className="flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-full">
                        {/* 脈動動畫的綠點 */}
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-bold text-green-700">旅途進行中！</span>
                    </div>
                )}
            </div>

            {/* ====== 穿搭建議區塊 ====== */}
            {clothingSuggestions.length > 0 && (
                <div className="border-t border-indigo-100 pt-3">
                    {/* 標題和溫度預報 */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <Thermometer size={14} className="text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-700">穿搭建議</span>
                        {weather && (
                            <span className="text-[10px] text-indigo-400 ml-auto">
                                預報 {weather.low}°C ~ {weather.high}°C
                            </span>
                        )}
                    </div>

                    {/* 穿搭建議標籤 */}
                    <div className="flex flex-wrap gap-2">
                        {clothingSuggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100 text-xs"
                                title={suggestion.reason}  // hover 時顯示原因
                            >
                                <span className="text-indigo-500">{suggestion.icon}</span>
                                <span className="font-medium text-gray-700">{suggestion.item}</span>
                            </div>
                        ))}
                    </div>

                    {/* 提醒文字 */}
                    <p className="text-[10px] text-indigo-400 mt-2 text-center">
                        ※ 建議根據實際天氣調整
                    </p>
                </div>
            )}
        </div>
    );
};
