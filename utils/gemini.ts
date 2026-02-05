/**
 * gemini.ts - Gemini AI 整合工具
 * 
 * 提供景點資訊與附近餐廳的 AI 諮詢功能
 */

import { NearbyRestaurant } from './places';

/**
 * 餐廳資訊的簡化格式（用於 AI prompt）
 */
interface RestaurantInfo {
  name: string;
  rating?: number;
  priceLevel?: number;
  distance?: number;
  isOpen?: boolean;
}

/**
 * 取得景點的 AI 洞察，可選擇性包含附近餐廳資訊
 * 
 * @param placeName - 景點名稱
 * @param nearbyRestaurants - 附近餐廳列表（可選）
 * @returns AI 生成的建議
 */
export const getPlaceInsight = async (
  placeName: string, 
  nearbyRestaurants?: NearbyRestaurant[]
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "請先設定 API Key 才能使用 AI 嚮導功能 (模擬回應：這裡非常適合拍照！)";
  }

  try {
    // Dynamic Import for Code Splitting
    // Only load the heavy SDK when the user actually requests AI insight
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    // 準備餐廳資訊
    let restaurantContext = '';
    if (nearbyRestaurants && nearbyRestaurants.length > 0) {
      const restaurantList = nearbyRestaurants.slice(0, 5).map((r, i) => {
        const parts = [`${i + 1}. ${r.name}`];
        if (r.rating) parts.push(`評分 ${r.rating}`);
        if (r.priceLevel) parts.push(`${'¥'.repeat(r.priceLevel)}`);
        if (r.distance) parts.push(`${Math.round(r.distance)}m`);
        if (r.isOpen !== undefined) parts.push(r.isOpen ? '營業中' : '休息中');
        return parts.join(' | ');
      }).join('\n');
      
      restaurantContext = `\n\n附近餐廳 (500m 內):\n${restaurantList}`;
    }

    const prompt = nearbyRestaurants && nearbyRestaurants.length > 0
      ? `You are a professional local tour guide in Fukuoka, Japan.

The tourist is at "${placeName}".
${restaurantContext}

請提供：
1. 這個景點的一個獨家祕技或隱藏景點（約 30 字）
2. 從以上餐廳中推薦最值得去的 1-2 間，說明為什麼（約 40 字）

Output in Traditional Chinese (Taiwan). 
Tone: Excited, helpful, and concise.
Total under 80 words.`
      : `You are a professional local tour guide in Fukuoka, Japan. 
Provide a specific, single "Insider Tip" or "Hidden Gem" about "${placeName}". 
Keep it under 60 words. 
Output in Traditional Chinese (Taiwan). 
Tone: Excited, helpful, and concise.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Updated to latest flash model if available, or keep existing
      contents: prompt,
    });

    return response.text || "目前無法取得 AI 資訊，請稍後再試。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 連線發生錯誤，請檢查網路或 API Key。";
  }
};