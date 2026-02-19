import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateEventDescription = async (eventName: string, location: string): Promise<string> => {
  if (!ai) return "AI description unavailable: Missing API Key.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, exciting, and professional description (max 30 words) for an event named "${eventName}" happening at "${location}". Make it sound inviting.`,
    });
    return response.text?.trim() || "Join us for an amazing experience!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Join us for an amazing experience!";
  }
};