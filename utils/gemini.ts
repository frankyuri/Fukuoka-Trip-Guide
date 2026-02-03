import { GoogleGenAI } from "@google/genai";

// Initialize the client
// Note: In a real production environment, ensure process.env.API_KEY is defined in your build configuration.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getPlaceInsight = async (placeName: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "請先設定 API Key 才能使用 AI 嚮導功能 (模擬回應：這裡非常適合拍照！)";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional local tour guide in Fukuoka, Japan. 
      Provide a specific, single "Insider Tip" or "Hidden Gem" about "${placeName}". 
      Keep it under 60 words. 
      Output in Traditional Chinese (Taiwan). 
      Tone: Excited, helpful, and concise.`,
    });

    return response.text || "目前無法取得 AI 資訊，請稍後再試。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 連線發生錯誤，請檢查網路或 API Key。";
  }
};