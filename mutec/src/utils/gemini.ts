import { GoogleGenerativeAI } from '@google/generative-ai';
import serverLogger from './serverLogger';

// IMPORTANT: Create a .env.local file in the root of your project
// and add your Google Gemini API key there.
//
// .env.local
// GEMINI_API_KEY=YOUR_API_KEY_HERE
//

export async function generateContentStream(
  apiKey: string,
  history: { role: string; parts: { text: string }[] }[],
  prompt: string
) {
  if (!apiKey) {
    serverLogger.error('API key is missing.');
    throw new Error('Google Gemini API key is required.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(prompt);
    return result.stream;
  } catch (error) {
    serverLogger.error('Error initializing or using Gemini API', { error });
    // Augment the error message for better client-side feedback
    if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error('The provided Google Gemini API key is not valid. Please check and try again.');
    }
    throw error;
  }
} 