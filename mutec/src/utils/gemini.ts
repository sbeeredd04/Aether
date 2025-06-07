import { GoogleGenAI } from "@google/genai";
import serverLogger from './serverLogger';
import { getModelById } from './models';

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
  modelId: string = 'gemini-2.0-flash'
) {
  if (!apiKey) {
    serverLogger.error('API key is missing.');
    throw new Error('Google Gemini API key is required.');
  }

  const modelDef = getModelById(modelId);
  if (!modelDef) {
    throw new Error(`Unsupported model: ${modelId}`);
  }
  
  // Handle multimedia models (placeholder)
  if (modelDef.isMultimedia === 'audio') {
    return `[TTS Audio for: "${prompt}"] (generation not implemented)`;
  }
  if (modelDef.isMultimedia === 'image') {
    return `[Generated Image for: "${prompt}"] (generation not implemented)`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    if (modelDef.isThinking) {
        const result = await ai.models.generateContent({
            model: modelDef.apiModel,
            contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
            config: {
                thinkingConfig: {
                    includeThoughts: true,
                },
            },
        });

        let thoughts = '';
        let answer = '';

        if (result.candidates?.[0]?.content?.parts) {
            for (const part of result.candidates[0].content.parts as any[]) {
                if (part.thought && part.text) {
                    thoughts += part.text;
                } else if (part.text) {
                    answer += part.text;
                }
            }
        }
        
        let responseText = '';
        if (thoughts) {
            responseText += `**Thoughts:**\n${thoughts}\n\n---\n\n`;
        }
        responseText += `**Answer:**\n${answer}`;
        return responseText;

    } else {
        const chat = ai.chats.create({
            model: modelDef.apiModel,
            history,
        });
        const result = await chat.sendMessage({ message: prompt });
        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text;
    }

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