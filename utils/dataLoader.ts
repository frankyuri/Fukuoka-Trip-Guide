/**
 * dataLoader.ts - 資料載入器
 * 
 * 用於載入 JSON 格式的行程資料，並轉換為 TypeScript 型別
 */

import { DayItinerary, ItineraryItem, TransportType, ShoppingSpot } from '../types';

// 引入 JSON 資料
import day1Data from '../data/itinerary/day1.json';
import day2Data from '../data/itinerary/day2.json';
import day3Data from '../data/itinerary/day3.json';
import day4Data from '../data/itinerary/day4.json';

/**
 * JSON 格式的行程項目（transportType 是字串）
 */
interface RawItineraryItem {
  id: string;
  time: string;
  title: string;
  description: string;
  address_jp: string;
  address_en: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  transportType: string;
  transportDetail: string;
  googleMapsQuery?: string;
  recommendedFood: string[];
  nearbySpots: string[];
  shoppingSideQuests?: ShoppingSpot[];
}

/**
 * JSON 格式的每日行程
 */
interface RawDayItinerary {
  date: string;
  dayTitle: string;
  theme: string;
  focus: string;
  items: RawItineraryItem[];
}

/**
 * 將字串轉換為 TransportType enum
 */
const parseTransportType = (type: string): TransportType => {
  const mapping: Record<string, TransportType> = {
    'TAXI': TransportType.TAXI,
    'WALK': TransportType.WALK,
    'TRAIN': TransportType.TRAIN,
    'BUS': TransportType.BUS,
    'SHIP': TransportType.SHIP,
    'FLIGHT': TransportType.FLIGHT,
  };
  return mapping[type] || TransportType.WALK;
};

/**
 * 將原始 JSON 資料轉換為型別安全的 DayItinerary
 */
const parseDayItinerary = (raw: RawDayItinerary): DayItinerary => {
  return {
    date: raw.date,
    dayTitle: raw.dayTitle,
    theme: raw.theme,
    focus: raw.focus,
    items: raw.items.map((item): ItineraryItem => ({
      id: item.id,
      time: item.time,
      title: item.title,
      description: item.description,
      address_jp: item.address_jp,
      address_en: item.address_en,
      coordinates: item.coordinates,
      transportType: parseTransportType(item.transportType),
      transportDetail: item.transportDetail,
      googleMapsQuery: item.googleMapsQuery,
      recommendedFood: item.recommendedFood,
      nearbySpots: item.nearbySpots,
      shoppingSideQuests: item.shoppingSideQuests,
    })),
  };
};

/**
 * 載入所有行程資料
 * @returns 所有天數的行程資料陣列
 */
export const loadItineraryData = (): DayItinerary[] => {
  const rawData: RawDayItinerary[] = [
    day1Data as RawDayItinerary,
    day2Data as RawDayItinerary,
    day3Data as RawDayItinerary,
    day4Data as RawDayItinerary,
  ];

  return rawData.map(parseDayItinerary);
};

/**
 * 載入特定天數的行程資料
 * @param dayNumber - 天數 (1-4)
 * @returns 該天的行程資料，若不存在則回傳 undefined
 */
export const loadDayItinerary = (dayNumber: number): DayItinerary | undefined => {
  const allData = loadItineraryData();
  return allData[dayNumber - 1];
};
