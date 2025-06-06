import { GoogleGenerativeAI } from '@google/generative-ai';

// IMPORTANT: Create a .env.local file in the root of your project
// and add your Google Gemini API key there.
//
// .env.local
// GEMINI_API_KEY=YOUR_API_KEY_HERE
//
const API_KEY = process.env.GEMINI_API_KEY!;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is not set. Please add it to your .env.local file.');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

/**
 * For context handling, Gemini API expects content in a specific format:
 * { role: 'user' | 'model', parts: [{ text: '...' }] }
 * The chatHistory from your nodes should be transformed into this format.
 */
export async function generateContentStream(
  history: { role: string; parts: { text: string }[] }[],
  prompt: string
) {
  const chat = model.startChat({ history });

  // Add the current prompt as the last message in the chat context
  const result = await chat.sendMessageStream(prompt);
  return result.stream;
} 