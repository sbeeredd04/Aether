import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import serverLogger from './serverLogger';

// IMPORTANT: Create a .env.local file in the root of your project
// and add your Google Gemini API key there.
//
// .env.local
// GEMINI_API_KEY=YOUR_API_KEY_HERE
//

export async function generateContentStream(
  apiKey: string,
  history: any[], // The history type from the SDK is complex, using any for now
  prompt: string,
  modelName: string
) {
  if (!apiKey) {
    serverLogger.error('API key is missing.');
    throw new Error('Google Gemini API key is required.');
  }

  try {
    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      // A minimal safety setting to prevent obvious blocks
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(prompt);

    // The response stream now contains structured data,
    // so we need to process it to extract the text.
    // We will do this transformation on the client side,
    // so we return the raw stream here.
    return result.stream;

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