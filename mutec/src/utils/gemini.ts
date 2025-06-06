import { GoogleGenAI } from "@google/genai";
import serverLogger from './serverLogger';

// IMPORTANT: Create a .env.local file in the root of your project
// and add your Google Gemini API key there.
//
// .env.local
// GEMINI_API_KEY=YOUR_API_KEY_HERE
//

export interface ChatHistory {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export async function generateContent(
  apiKey: string,
  history: ChatHistory[],
  prompt: string,
  modelName: string = 'gemini-2.0-flash'
) {
  if (!apiKey) {
    serverLogger.error('API key is missing.');
    throw new Error('Google Gemini API key is required.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Multi-turn chat: send full history with the new prompt
    const chat = ai.chats.create({
      model: modelName,
      history,
    });
    const result = await chat.sendMessage({ message: prompt });
    // result.candidates[0].content.parts[0].text is the model's response
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
  } catch (error) {
    serverLogger.error('Error initializing or using Gemini API', { error });
    if (error instanceof Error) {
      if (error.message.includes('API key not valid')) {
        throw new Error('The provided Google Gemini API key is not valid. Please check and try again.');
      }
      if (error.message.includes('request had content')) {
        throw new Error('The request was blocked due to safety settings. Please modify your prompt.');
      }
    }
    throw new Error('An unexpected error occurred with the Gemini API.');
  }
} 