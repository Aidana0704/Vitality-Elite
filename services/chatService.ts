
import { GoogleGenAI, Chat } from "@google/genai";
import { UserProfile, Language } from "../types";

export const createChatSession = (profile: UserProfile, lang: Language): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const langMap: Record<Language, string> = { en: 'English', ru: 'Russian', es: 'Spanish' };
  
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are the Vitality Elite AI Assistant, a world-class trainer and nutritionist.
      User profile: ${JSON.stringify(profile)}.
      IMPORTANT: You must communicate entirely in ${langMap[lang]}.
      Keep responses professional, concise and motivating.`,
    },
  });
};
