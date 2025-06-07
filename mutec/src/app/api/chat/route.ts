import { generateContent } from '@/utils/gemini';
import serverLogger from '@/utils/serverLogger';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  serverLogger.info('API: Chat request initiated', { requestId });

  try {
    // Parse request body
    serverLogger.debug('API: Parsing request body', { requestId });
    const body = await req.json();
    const { apiKey, modelId, history, prompt, attachments, ttsOptions, grounding, enableThinking } = body;
    
    serverLogger.info('API: Request parsed successfully', { 
      requestId,
      modelId,
      hasApiKey: !!apiKey,
      hasPrompt: !!prompt,
      promptLength: prompt?.length || 0,
      promptPreview: prompt ? prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '') : null,
      historyLength: history?.length || 0,
      attachmentsCount: attachments?.length || 0,
      hasTtsOptions: !!ttsOptions,
      hasGrounding: !!grounding,
      enableThinking,
      attachmentTypes: attachments?.map((att: any) => ({ type: att.type, name: att.name, dataLength: att.data?.length || 0 })) || []
    });

    // Validate request
    if (!prompt && (!attachments || attachments.length === 0)) {
      serverLogger.warn('API: Request validation failed - missing prompt and attachments', { requestId });
      return NextResponse.json(
        { error: 'Prompt or attachments are required' }, 
        { status: 400 }
      );
    }
    
    if (!apiKey) {
      serverLogger.warn('API: Request validation failed - missing API key', { requestId });
      return NextResponse.json(
        { error: 'Gemini API key is required' }, 
        { status: 400 }
      );
    }

    if (!modelId) {
      serverLogger.warn('API: Request validation failed - missing model ID', { requestId });
      return NextResponse.json(
        { error: 'Model ID is required' }, 
        { status: 400 }
      );
    }

    // Process history
    serverLogger.debug('API: Processing conversation history', { 
      requestId,
      historyEntries: history?.map((entry: any, index: number) => ({
        index,
        role: entry.role,
        partsCount: entry.parts?.length || 0,
        hasText: entry.parts?.some((p: any) => p.text),
        hasInlineData: entry.parts?.some((p: any) => p.inlineData)
      })) || []
    });

    serverLogger.info('API: Calling generateContent', { 
      requestId,
      modelId,
      apiKeyLength: apiKey?.length || 0,
      historyLength: history?.length || 0,
      attachmentsCount: attachments?.length || 0
    });

    // Call generateContent
    const startTime = Date.now();
    const result = await generateContent(
      apiKey,
      history,
      prompt,
      modelId,
      attachments,
      ttsOptions,
      grounding,
      enableThinking
    );
    const duration = Date.now() - startTime;
    
    serverLogger.info('API: generateContent completed', { 
      requestId,
      duration: `${duration}ms`,
      resultType: 'text' in result ? 'text' : 
                  'audioBase64' in result ? 'audio' : 
                  'images' in result ? 'images' : 'unknown',
      resultSize: 'text' in result ? result.text.length :
                  'audioBase64' in result ? result.audioBase64.length :
                  'images' in result ? result.images.length : 0
    });

    // Analyze result
    if ('text' in result) {
      serverLogger.debug('API: Processing text result', { 
        requestId,
        textLength: result.text.length,
        textPreview: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : '')
      });
    } else if ('audioBase64' in result) {
      serverLogger.debug('API: Processing audio result', { 
        requestId,
        mimeType: result.mimeType,
        audioDataLength: result.audioBase64.length
      });
    } else if ('images' in result) {
      serverLogger.debug('API: Processing images result', { 
        requestId,
        imageCount: result.images.length,
        images: result.images.map((img, idx) => ({
          index: idx,
          mimeType: img.mimeType,
          dataLength: img.data.length
        }))
      });
    }
    
    // Branch on response type and prepare response
    let response;
    if ('text' in result) {
      response = { text: result.text };
      serverLogger.info('API: Returning text response', { 
        requestId,
        responseType: 'text',
        textLength: result.text.length
      });
    } else if ('audioBase64' in result) {
      response = { 
        audio: { 
          data: result.audioBase64, 
          mimeType: result.mimeType 
        } 
      };
      serverLogger.info('API: Returning audio response', { 
        requestId,
        responseType: 'audio',
        mimeType: result.mimeType,
        dataLength: result.audioBase64.length
      });
    } else if ('images' in result) {
      response = { images: result.images };
      serverLogger.info('API: Returning images response', { 
        requestId,
        responseType: 'images',
        imageCount: result.images.length,
        totalDataSize: result.images.reduce((sum, img) => sum + img.data.length, 0)
      });
    } else {
      serverLogger.error('API: Unknown result type from generateContent', { 
        requestId,
        resultKeys: Object.keys(result)
      });
      throw new Error('Unknown response type from generateContent');
    }

    serverLogger.info('API: Request completed successfully', { 
      requestId,
      totalDuration: `${Date.now() - startTime}ms`,
      responseType: Object.keys(response)[0]
    });

    return NextResponse.json(response);
    
  } catch (error) {
    const duration = Date.now();
    serverLogger.error('API: Request failed', { 
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      duration: `${duration}ms`
    });

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to generate content', 
        details: errorMessage,
        requestId 
      }, 
      { status: 500 }
    );
  }
} 