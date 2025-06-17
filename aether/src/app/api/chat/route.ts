import { generateContent, generateContentStream, generateContentStreamWithGrounding, GroundedTextResponse } from '@/utils/gemini';
import { executeGroundingPipeline, extractCitationsFromGrounding } from '@/utils/groundingPipeline';
import serverLogger from '@/utils/serverLogger';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const body = await req.json();
    const { apiKey, modelId, history, prompt, attachments, ttsOptions, grounding, enableThinking, useGroundingPipeline, stream } = body;
    
    // Default to streaming enabled if not specified
    const useStreaming = stream !== undefined ? stream : true;
    
    serverLogger.info('API: Request received', { 
      requestId,
      modelId,
      promptLength: prompt?.length || 0,
      historyLength: history?.length || 0,
      attachmentsCount: attachments?.length || 0,
      attachmentTypes: attachments?.map((att: any) => att.type) || [],
      documentAttachments: attachments?.filter((att: any) => 
        att.type === 'application/pdf' || 
        att.type.startsWith('text/') || 
        att.type.includes('javascript') || 
        att.type.includes('python')
      ).length || 0,
      enableThinking,
      useStreaming,
      useGroundingPipeline: !!useGroundingPipeline
    });

    // Validate request
    if (!prompt && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Prompt or attachments are required' }, { status: 400 });
    }
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is required' }, { status: 400 });
    }

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    const startTime = Date.now();

    // Handle streaming requests
    if (useStreaming) {
      serverLogger.info('🔄 API: Starting streaming response', { requestId, modelId });

      const encoder = new TextEncoder();

      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            // Determine which streaming method to use based on model and toggles
            let streamGenerator;
            
            // Check if model uses grounding pipeline AND grounding is enabled
            if (useGroundingPipeline && grounding?.enabled) {
              console.log(`🔍 API STREAMING DEBUG: Using streaming grounding pipeline`, {
                requestId,
                modelId,
                useGroundingPipeline,
                groundingEnabled: grounding.enabled
              });
              
              serverLogger.info('🔄 API: Using streaming grounding pipeline', { requestId, modelId });
              
              streamGenerator = generateContentStreamWithGrounding(
                apiKey,
                history,
                prompt,
                modelId,
                attachments,
                ttsOptions,
                grounding,
                enableThinking
              );
            } else {
              console.log(`🔍 API STREAMING DEBUG: Using standard streaming`, {
                requestId,
                modelId,
                useGroundingPipeline: !!useGroundingPipeline,
                groundingEnabled: grounding?.enabled,
                reason: !useGroundingPipeline ? "Model doesn't use grounding pipeline" : "Grounding not enabled"
              });
              
              // Use standard streaming - only pass grounding if model supports it directly
              const modelSupportsDirectGrounding = !useGroundingPipeline && grounding?.enabled;
              
              streamGenerator = generateContentStream(
                apiKey,
                history,
                prompt,
                modelId,
                attachments,
                ttsOptions,
                modelSupportsDirectGrounding ? grounding : undefined, // Only pass grounding for direct support
                enableThinking
              );
            }

            let chunkCount = 0;
            for await (const chunk of streamGenerator) {
              chunkCount++;
              
              console.log(`🔍 API STREAMING DEBUG: Received chunk`, {
                requestId,
                chunkCount,
                type: chunk.type,
                contentLength: chunk.content.length,
                hasAudioData: !!chunk.audioData,
                hasGroundingMetadata: !!chunk.groundingMetadata,
                groundingMetadata: chunk.groundingMetadata ? {
                  hasCitations: !!chunk.groundingMetadata.citations,
                  citationsCount: chunk.groundingMetadata.citations?.length || 0,
                  hasSearchQueries: !!chunk.groundingMetadata.webSearchQueries,
                  searchQueriesCount: chunk.groundingMetadata.webSearchQueries?.length || 0,
                  hasSearchEntryPoint: !!chunk.groundingMetadata.searchEntryPoint
                } : null
              });
              
              const streamData = {
                type: chunk.type,
                content: chunk.content,
                ...(chunk.audioData && { audioData: chunk.audioData }),
                ...(chunk.groundingMetadata && { groundingMetadata: chunk.groundingMetadata })
              };

              if (chunk.groundingMetadata) {
                console.log(`🔍 API STREAMING DEBUG: Sending grounding metadata to client`, {
                  requestId,
                  chunkCount,
                  groundingMetadata: chunk.groundingMetadata
                });
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(streamData)}\n\n`)
              );
              
              // Add a small delay to prevent overwhelming the client
              if (chunkCount % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
              }
            }
            
            serverLogger.info('🔄 API: Streaming complete', { 
              requestId,
              totalDuration: `${Date.now() - startTime}ms`,
              chunks: chunkCount
            });
            
            controller.close();
          } catch (error) {
            serverLogger.error('🔄 API: Streaming failed', { 
              requestId,
              duration: `${Date.now() - startTime}ms`,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'error', 
                content: error instanceof Error ? error.message : 'An unknown error occurred' 
              })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming requests
    serverLogger.info('API: Non-streaming request', { requestId, modelId });
    let result: any;

    // Check if grounding pipeline should be used based on model and toggles
    if (useGroundingPipeline && grounding?.enabled) {
      console.log(`🔍 API DEBUG: Using grounding pipeline`, {
        requestId,
        modelId,
        useGroundingPipeline,
        groundingEnabled: grounding.enabled,
        enableThinking
      });

      serverLogger.info('API: Using grounding pipeline', { requestId });

      const groundingResult = await executeGroundingPipeline(
        apiKey,
        history,
        prompt,
        attachments,
        enableThinking
      );

      console.log(`🔍 API DEBUG: Grounding pipeline result`, {
        requestId,
        textLength: groundingResult.text.length,
        citationsCount: groundingResult.citations?.length || 0,
        searchQueriesCount: groundingResult.searchQueries?.length || 0,
        hasSearchEntryPoint: !!groundingResult.searchEntryPoint
      });

      result = {
        text: groundingResult.text,
        groundingMetadata: {
          searchEntryPoint: groundingResult.searchEntryPoint ? { renderedContent: groundingResult.searchEntryPoint } : undefined,
          webSearchQueries: groundingResult.searchQueries,
          citations: groundingResult.citations
        }
      };
    } else {
      console.log(`🔍 API DEBUG: Using direct Gemini API`, {
        requestId,
        modelId,
        useGroundingPipeline: !!useGroundingPipeline,
        groundingEnabled: grounding?.enabled,
        directGroundingSupported: !!grounding?.enabled && !useGroundingPipeline,
        reason: !useGroundingPipeline ? "Model doesn't use grounding pipeline" : "Grounding not enabled"
      });

      // Use direct API - only pass grounding if model supports it directly (not via pipeline)
      const modelSupportsDirectGrounding = !useGroundingPipeline && grounding?.enabled;

      result = await generateContent(
        apiKey,
        history,
        prompt,
        modelId,
        attachments,
        ttsOptions,
        modelSupportsDirectGrounding ? grounding : undefined, // Only pass grounding for direct support
        enableThinking
      );

      console.log(`🔍 API DEBUG: Direct Gemini API result`, {
        requestId,
        resultType: 'text' in result ? 'text' : 'other',
        hasGroundingMetadata: 'groundingMetadata' in result && !!result.groundingMetadata,
        textLength: 'text' in result ? result.text.length : 0
      });
    }
    
    serverLogger.info('API: Non-streaming complete', { 
      requestId,
      duration: `${Date.now() - startTime}ms`,
      resultType: 'text' in result ? 'text' : 
                  'audioBase64' in result ? 'audio' : 
                  'images' in result ? 'images' : 'unknown',
      resultSize: 'text' in result ? result.text.length :
                  'audioBase64' in result ? result.audioBase64.length :
                  'images' in result ? result.images.length : 0
    });

    // Prepare response
    let response;
    if ('text' in result) {
      const groundedResult = result as GroundedTextResponse;
      response = { 
        text: groundedResult.text,
        ...(groundedResult.groundingMetadata && { groundingMetadata: groundedResult.groundingMetadata })
      };
    } else if ('audioBase64' in result) {
      response = { 
        audio: { 
          data: result.audioBase64, 
          mimeType: result.mimeType 
        } 
      };
    } else if ('images' in result) {
      response = { images: result.images };
    } else {
      throw new Error('Unknown response type from generateContent');
    }

    return NextResponse.json(response);
    
  } catch (error) {
    serverLogger.error('API: Request failed', { 
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
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