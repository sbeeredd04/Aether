import { generateContentStream } from '@/utils/gemini';
import serverLogger from '@/utils/serverLogger';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { history, prompt } = await req.json();
    serverLogger.info('API call received', { prompt });

    if (!prompt || !history) {
      serverLogger.warn('Missing prompt or history in request');
      return NextResponse.json({ error: 'Prompt and history are required' }, { status: 400 });
    }

    const stream = await generateContentStream(history, prompt);
    serverLogger.debug('Stream generation started');

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          try {
            const text = chunk.text();
            if (text) {
              // SSE format: data: { "text": "..." }\n\n
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\\n\\n`));
            }
          } catch (e) {
             serverLogger.error('Error processing stream chunk', { error: e });
          }
        }
        controller.close();
        serverLogger.debug('Stream closed');
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    serverLogger.error('API Error', { error });
    // Check if the error is an object and has a message property
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to generate content', details: errorMessage }, { status: 500 });
  }
} 