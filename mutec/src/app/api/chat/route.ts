import { generateContent } from '@/utils/gemini';
import serverLogger from '@/utils/serverLogger';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { history, prompt, apiKey } = await req.json();
    serverLogger.info('API call received', { prompt });

    if (!prompt || !history) {
      serverLogger.warn('Missing prompt or history in request');
      return NextResponse.json({ error: 'Prompt and history are required' }, { status: 400 });
    }
    
    if (!apiKey) {
      serverLogger.warn('Missing API key in request');
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    const text = await generateContent(apiKey, history, prompt);
    serverLogger.debug('Model response received');
    return NextResponse.json({ text });
  } catch (error) {
    serverLogger.error('API Error', { error });
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to generate content', details: errorMessage }, { status: 500 });
  }
} 