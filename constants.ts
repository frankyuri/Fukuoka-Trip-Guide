/**
 * constants.ts - 應用程式常數
 * 
 * 行程資料已模組化至 data/itinerary/ 目錄下的 JSON 檔案
 * 使用 loadItineraryData() 載入資料
 */

import { DayItinerary } from './types';
import { loadItineraryData } from './utils/dataLoader';

/**
 * ITINERARY DATA SOURCE
 * 
 * 資料來源已改為 JSON 檔案：
 * - data/itinerary/day1.json
 * - data/itinerary/day2.json
 * - data/itinerary/day3.json
 * - data/itinerary/day4.json
 * 
 * 若要更新行程資料，請直接編輯對應的 JSON 檔案
 */
export const ITINERARY_DATA: DayItinerary[] = loadItineraryData();