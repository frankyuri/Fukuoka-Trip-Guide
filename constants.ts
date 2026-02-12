/**
 * constants.ts - 應用程式常數
 * 
 * 行程資料已模組化至 data/itinerary/ 目錄下的 JSON 檔案
 * 使用 loadItineraryData() 載入資料
 */

import { DayItinerary } from './types';
import { loadItineraryData, loadItineraryData2 } from './utils/dataLoader';

/**
 * ITINERARY DATA SOURCE
 * 
 * 方案一資料來源 JSON 檔案：
 * - data/itinerary/day1.json ~ day4.json
 * 
 * 方案二（備選二）資料來源 JSON 檔案：
 * - data/itinerary2/day1.json ~ day4.json
 * 
 * 若要更新行程資料，請直接編輯對應的 JSON 檔案
 */
export const ITINERARY_DATA: DayItinerary[] = loadItineraryData();

/** Lazy-loaded Plan 2 data — only parsed when first accessed */
let _plan2: DayItinerary[] | null = null;
export const getItineraryData2 = (): DayItinerary[] => {
  if (!_plan2) _plan2 = loadItineraryData2();
  return _plan2;
};