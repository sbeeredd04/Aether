import { generateContentStream } from '@/utils/gemini';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { history, prompt } = await req.json();

    if (!prompt || !history) {
      return NextResponse.json({ error: 'Prompt and history are required' }, { status: 400 });
    }

    const stream = await generateContentStream(history, prompt);

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
             console.error('Error processing chunk:', e);
          }
        }
        controller.close();
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
    console.error('API Error:', error);
    // Check if the error is an object and has a message property
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to generate content', details: errorMessage }, { status: 500 });
  }
} 