import {
  GoogleGenAI,
  Modality,
  Tool,
} from "@google/genai";
import serverLogger from "./serverLogger";
import { getModelById, ModelDefinition } from "./models";
import { Part } from "@google/genai";

// Re-export your attachment & chat types for convenience
export interface AttachmentData {
  name: string;
  type: string;
  data: string;        // base64
  previewUrl?: string; // optional client-only
}

export interface TextResponse { text: string; }
export interface AudioResponse { audioBase64: string; mimeType: string; }
export interface ImageResponse { images: Array<{ data: string; mimeType: string }> }

export type GenerateResult =
  | TextResponse
  | AudioResponse
  | ImageResponse
  | GroundedTextResponse;

// Enhanced grounding metadata structure
export interface GroundingMetadata {
    searchEntryPoint?: {
      renderedContent: string;
    };
    groundingChunks?: Array<{
      web?: {
        uri: string;
        title: string;
      };
    }>;
    groundingSupports?: Array<{
      segment: {
        startIndex?: number;
        endIndex?: number;
        text: string;
      };
      groundingChunkIndices: number[];
      confidenceScores: number[];
    }>;
    webSearchQueries?: string[];
  citations?: Array<{
    title: string;
    uri: string;
    snippet?: string;
    confidenceScore?: number;
  }>;
}

export interface GroundedTextResponse { 
  text: string; 
  groundingMetadata?: GroundingMetadata;
}


// Search grounding options
export interface GroundingOptions {
  enabled: boolean;
  dynamicThreshold?: number; // 0-1, for Gemini 1.5 models only
}

// Helper function to add inline citations to text
function addInlineCitations(text: string, groundingMetadata: any): string {
  if (!groundingMetadata?.groundingSupports || !groundingMetadata?.groundingChunks) {
    return text;
  }

  const supports = groundingMetadata.groundingSupports;
  const chunks = groundingMetadata.groundingChunks;

  // Sort supports by end_index in descending order to avoid shifting issues when inserting
  const sortedSupports = supports.sort((a: any, b: any) => 
    (b.segment?.endIndex || 0) - (a.segment?.endIndex || 0)
  );

  let modifiedText = text;

  for (const support of sortedSupports) {
    const endIndex = support.segment?.endIndex;
    if (endIndex !== undefined && support.groundingChunkIndices) {
      // Create citation string like [1](link1), [2](link2)
      const citationLinks = [];
      for (const chunkIndex of support.groundingChunkIndices) {
        if (chunkIndex < chunks.length && chunks[chunkIndex]?.web) {
          const uri = chunks[chunkIndex].web.uri;
          const title = chunks[chunkIndex].web.title;
          citationLinks.push(`[${chunkIndex + 1}](${uri} "${title}")`);
        }
      }

      if (citationLinks.length > 0) {
        const citationString = citationLinks.join(', ');
        modifiedText = modifiedText.slice(0, endIndex) + citationString + modifiedText.slice(endIndex);
      }
    }
  }

  return modifiedText;
}

// Helper function to extract citations from raw grounding metadata
function extractCitations(rawMetadata: any): Array<{
  title: string;
  uri: string;
  snippet?: string;
  confidenceScore?: number;
}> {
  console.log('🔍 CITATION EXTRACTION DEBUG: Starting citation extraction', {
    hasGroundingChunks: !!rawMetadata?.groundingChunks,
    hasGroundingSupports: !!rawMetadata?.groundingSupports,
    groundingChunksLength: rawMetadata?.groundingChunks?.length || 0,
    groundingSupportsLength: rawMetadata?.groundingSupports?.length || 0
  });

  if (!rawMetadata?.groundingChunks || !rawMetadata?.groundingSupports) {
    console.log('🔍 CITATION EXTRACTION DEBUG: Missing required data for citation extraction');
    return [];
  }

  const citations: Array<{
    title: string;
    uri: string;
    snippet?: string;
    confidenceScore?: number;
  }> = [];
  
  const chunkMap = new Map<number, { title: string; uri: string }>();

  // Build chunk map
  rawMetadata.groundingChunks.forEach((chunk: any, index: number) => {
    if (chunk.web) {
      chunkMap.set(index, {
        title: chunk.web.title,
        uri: chunk.web.uri
      });
    }
  });

  // Extract citations with confidence scores
  rawMetadata.groundingSupports.forEach((support: any) => {
    support.groundingChunkIndices.forEach((chunkIndex: number, idx: number) => {
      const citation = chunkMap.get(chunkIndex);
      if (citation) {
        const confidenceScore = support.confidenceScores?.[idx];
        const existingCitation = citations.find(c => c.uri === citation.uri);
        
        if (!existingCitation) {
          citations.push({
            ...citation,
            snippet: support.segment.text,
            confidenceScore
          });
        }
      }
    });
  });

  return citations.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));
}

// Helper function to process grounding metadata
function processGroundingMetadata(rawMetadata: any): GroundingMetadata | undefined {
  console.log('🔍 METADATA PROCESSING DEBUG: Starting metadata processing', {
    hasRawMetadata: !!rawMetadata,
    rawMetadata
  });

  if (!rawMetadata) {
    console.log('🔍 METADATA PROCESSING DEBUG: No raw metadata provided');
    return undefined;
  }

  const citations = extractCitations(rawMetadata);
  
  const processedMetadata = {
    searchEntryPoint: rawMetadata.searchEntryPoint,
    groundingChunks: rawMetadata.groundingChunks,
    groundingSupports: rawMetadata.groundingSupports,
    webSearchQueries: rawMetadata.webSearchQueries,
    citations: citations.length > 0 ? citations : undefined
  };

  console.log('🔍 METADATA PROCESSING DEBUG: Metadata processing complete', {
    processedMetadata,
    hasSearchEntryPoint: !!processedMetadata.searchEntryPoint,
    groundingChunksCount: processedMetadata.groundingChunks?.length || 0,
    groundingSupportsCount: processedMetadata.groundingSupports?.length || 0,
    webSearchQueriesCount: processedMetadata.webSearchQueries?.length || 0,
    citationsCount: processedMetadata.citations?.length || 0
  });
  
  return processedMetadata;
}

// The one unified entrypoint
export async function generateContent(
  apiKey: string,
  history: { role: "user" | "model"; parts: Part[] }[],
  prompt: string,
  modelId = "gemini-2.5-flash",
  attachments?: AttachmentData[],
  grounding?: GroundingOptions,
  enableThinking?: boolean
): Promise<GenerateResult> {

  const requestId = Math.random().toString(36).substring(7);
  serverLogger.info("Gemini: Non-streaming request", { 
    requestId,
    modelId,
    promptLength: prompt?.length || 0,
    attachmentsCount: attachments?.length || 0,
    enableThinking
  });

  if (!apiKey) {
    throw new Error("Google Gemini API key is required");
  }

  const modelDef = getModelById(modelId);
  if (!modelDef) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents: Part[] = [];

  // Process attachments
  if (attachments && attachments.length > 0) {
    serverLogger.info("Gemini: Processing attachments", { 
      requestId,
      count: attachments.length,
      types: attachments.map(att => att.type)
    });
    
    for (const att of attachments) {
      let cleanData = att.data;
      if (att.data.includes(',')) {
        cleanData = att.data.split(',')[1];
      }
      
      // Handle different document types
      if (att.type === 'application/pdf' || 
          att.type.startsWith('text/') || 
          att.type.includes('javascript') || 
          att.type.includes('python') ||
          att.type.startsWith('image/')) {
        
        serverLogger.debug("Gemini: Adding document/media attachment", { 
          requestId,
          fileName: att.name,
          mimeType: att.type,
          isDocument: !att.type.startsWith('image/'),
          dataLength: cleanData.length
        });
        
      contents.push({
        inlineData: { mimeType: att.type, data: cleanData },
      });
      } else {
        serverLogger.warn("Gemini: Unsupported attachment type", { 
          requestId,
          fileName: att.name,
          mimeType: att.type
        });
      }
    }
  }

  // Add prompt
  if (prompt) {
    contents.push({ text: prompt });
  }

  const fullHistory = [
    ...history,
    { role: "user", parts: contents },
  ];

  // Live models not supported
  if (modelDef.apiModel.includes("-live-")) {
    throw new Error("Live models must be driven through ai.live.connect() in ChatManager");
  }

  const startTime = Date.now();

  try {
    // Prepare tools for grounding
    const tools: Tool[] = [];
    if (grounding?.enabled && modelDef.supportsGrounding) {
      console.log(`🔍 GROUNDING DEBUG: Enabling Google Search grounding for ${modelDef.apiModel}`, {
        requestId,
        modelId,
        groundingEnabled: grounding.enabled,
        supportsGrounding: modelDef.supportsGrounding
      });

      // Use the new Google Search tool for Gemini 2.5
      const googleSearchTool = { googleSearch: {} } as any;
      tools.push(googleSearchTool);
      
      console.log(`🔍 GROUNDING DEBUG: Added Google Search tool`, {
        requestId,
        tool: googleSearchTool
      });
    } else {
      console.log(`🔍 GROUNDING DEBUG: Grounding not enabled or not supported`, {
        requestId,
        modelId,
        groundingEnabled: grounding?.enabled,
        supportsGrounding: modelDef.supportsGrounding,
        modelApiModel: modelDef.apiModel
      });
    }

    // THINKING MODELS
    if (modelDef.isThinking && (enableThinking === undefined || enableThinking === true)) {
      const thinkingConfig: any = {
        tools: tools.length > 0 ? tools : undefined,
        responseModalities: ["TEXT"],
        thinkingConfig: { includeThoughts: true }
      };

      const result = await ai.models.generateContent({
        model: modelDef.apiModel,
        contents: fullHistory as any,
        config: thinkingConfig,
      });

      const parts = result.candidates?.[0]?.content?.parts || [];
      let thoughts = "", answer = "";
      for (const p of parts as any[]) {
        if (p.thought) {
          thoughts += p.text;
        } else {
          answer += p.text;
        }
      }

      const responseText = (thoughts ? `**Thoughts:**\n${thoughts}\n\n---\n\n**Answer:**\n${answer}` : answer);
      
      serverLogger.info("Gemini: Non-streaming complete", { 
        requestId,
        duration: `${Date.now() - startTime}ms`,
        responseLength: responseText.length,
        hasThoughts: !!thoughts
      });

      return { text: responseText };
    }


    // IMAGE MODELS
    if (modelDef.isMultimedia === "image") {
      const config: any = {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        tools: tools.length > 0 ? tools : undefined
      };

      const response = await ai.models.generateContent({
        model: modelDef.apiModel,
        contents: fullHistory as any,
        config,
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const images: Array<{ data: string; mimeType: string }> = [];
      for (const p of parts as any[]) {
        if (p.inlineData?.data) {
          images.push({ data: p.inlineData.data, mimeType: p.inlineData.mimeType });
        }
      }

      return { images };
    }

    // DEFAULT CHAT MODELS
    const chatHistory = fullHistory.slice(0, -1);
    const lastMessage = fullHistory.slice(-1)[0];

    const chatConfig: any = {};
    if (tools.length > 0) {
      chatConfig.tools = tools;
    }

    const chat = ai.chats.create({
      model: modelDef.apiModel,
      history: chatHistory as any,
      config: chatConfig,
    });

    const result = await chat.sendMessage({ message: lastMessage.parts });
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    console.log(`🔍 GROUNDING DEBUG: Chat result received`, {
      requestId,
      responseLength: text.length,
      hasGroundingMetadata: !!result.candidates?.[0]?.groundingMetadata,
      groundingEnabled: grounding?.enabled,
      result: {
        candidatesCount: result.candidates?.length || 0,
        firstCandidate: result.candidates?.[0] ? {
          hasContent: !!result.candidates[0].content,
          hasGroundingMetadata: !!result.candidates[0].groundingMetadata
        } : null
      }
    });
    
    // Add grounding information if available
    const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata && grounding?.enabled) {
      console.log(`🔍 GROUNDING DEBUG: Raw grounding metadata received`, {
        requestId,
        hasSearchEntryPoint: !!groundingMetadata.searchEntryPoint,
        hasGroundingChunks: !!groundingMetadata.groundingChunks,
        hasGroundingSupports: !!groundingMetadata.groundingSupports,
        hasWebSearchQueries: !!groundingMetadata.webSearchQueries,
        groundingChunksLength: groundingMetadata.groundingChunks?.length || 0,
        groundingSupportsLength: groundingMetadata.groundingSupports?.length || 0,
        webSearchQueriesLength: groundingMetadata.webSearchQueries?.length || 0
      });

      // Add inline citations to the text
      const textWithCitations = addInlineCitations(text, groundingMetadata);
      
      const processedMetadata = processGroundingMetadata(groundingMetadata);
      
      console.log(`🔍 GROUNDING DEBUG: Processed grounding metadata`, {
        requestId,
        hasSearchEntryPoint: !!processedMetadata?.searchEntryPoint,
        citationsCount: processedMetadata?.citations?.length || 0,
        searchQueriesCount: processedMetadata?.webSearchQueries?.length || 0,
        addedInlineCitations: textWithCitations !== text
      });
      
      serverLogger.info("Gemini: Grounding metadata processed", {
        requestId,
        hasSearchEntryPoint: !!processedMetadata?.searchEntryPoint,
        citationsCount: processedMetadata?.citations?.length || 0,
        searchQueriesCount: processedMetadata?.webSearchQueries?.length || 0
      });
      
      return { 
        text: textWithCitations,
        groundingMetadata: processedMetadata
      } as GroundedTextResponse;
    } else {
      console.log(`🔍 GROUNDING DEBUG: No grounding metadata or grounding disabled`, {
        requestId,
        hasGroundingMetadata: !!groundingMetadata,
        groundingEnabled: grounding?.enabled
      });
    }
    
    serverLogger.info("Gemini: Non-streaming complete", { 
      requestId,
      duration: `${Date.now() - startTime}ms`,
      responseLength: text.length
    });

    return { text };

  } catch (error) {
    serverLogger.error("Gemini: Non-streaming failed", { 
      requestId,
      modelId,
      duration: `${Date.now() - startTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    if (error instanceof Error) {
      error.message = `[${modelId}] ${error.message}`;
    }
    throw error;
  }
}


// New streaming version with enhanced grounding support
export async function* generateContentStream(
  apiKey: string,
  history: { role: "user" | "model"; parts: Part[] }[],
  prompt: string,
  modelId = "gemini-2.5-flash",
  attachments?: AttachmentData[],
  grounding?: GroundingOptions,
  enableThinking?: boolean
): AsyncGenerator<{ 
  type: 'thought' | 'message' | 'complete' | 'grounding'; 
  content: string; 
  audioData?: string;
  groundingMetadata?: GroundingMetadata;
}, void, unknown> {

  const requestId = Math.random().toString(36).substring(7);
  serverLogger.info("🔄 Streaming: Started", { 
    requestId,
    modelId,
    promptLength: prompt?.length || 0,
    attachmentsCount: attachments?.length || 0,
    enableThinking,
    groundingEnabled: grounding?.enabled
  });

  if (!apiKey) {
    throw new Error("Google Gemini API key is required");
  }

  const modelDef = getModelById(modelId);
  if (!modelDef) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents: Part[] = [];

  // Process attachments
  if (attachments && attachments.length > 0) {
    serverLogger.info("🔄 Streaming: Processing attachments", { 
      requestId, 
      count: attachments.length,
      types: attachments.map(att => att.type)
    });
    
    for (const att of attachments) {
      let cleanData = att.data;
      if (att.data.includes(',')) {
        cleanData = att.data.split(',')[1];
      }
      
      // Handle different document types
      if (att.type === 'application/pdf' || 
          att.type.startsWith('text/') || 
          att.type.includes('javascript') || 
          att.type.includes('python') ||
          att.type.startsWith('image/')) {
        
        serverLogger.debug("🔄 Streaming: Adding document/media attachment", { 
          requestId,
          fileName: att.name,
          mimeType: att.type,
          isDocument: !att.type.startsWith('image/'),
          dataLength: cleanData.length
        });
        
      contents.push({
        inlineData: { mimeType: att.type, data: cleanData },
      });
      } else {
        serverLogger.warn("🔄 Streaming: Unsupported attachment type", { 
          requestId,
          fileName: att.name,
          mimeType: att.type
        });
      }
    }
  }

  // Add prompt
  if (prompt) {
    contents.push({ text: prompt });
  }

  const fullHistory = [
    ...history,
    { role: "user", parts: contents },
  ];

  // Live models not supported
  if (modelDef.apiModel.includes("-live-")) {
    throw new Error("Live models must be driven through ai.live.connect() in ChatManager");
  }

  const startTime = Date.now();

  try {
    // Prepare tools for grounding
    const tools: Tool[] = [];
    if (grounding?.enabled && modelDef.supportsGrounding) {
      serverLogger.info("🔄 Streaming: Adding Google Search grounding tool", { requestId });
      // Use the new Google Search tool for Gemini 2.5
      const googleSearchTool = { googleSearch: {} } as any;
      tools.push(googleSearchTool);
    }

    // THINKING MODELS
    if (modelDef.isThinking && (enableThinking === undefined || enableThinking === true)) {
      serverLogger.info("🔄 Streaming: Using thinking model", { requestId, model: modelDef.apiModel });

      const thinkingConfig: any = {
        tools: tools.length > 0 ? tools : undefined,
        responseModalities: ["TEXT"],
        thinkingConfig: { includeThoughts: true }
      };

      const stream = await ai.models.generateContentStream({
        model: modelDef.apiModel,
        contents: fullHistory as any,
        config: thinkingConfig,
      });

      let fullThoughts = '';
      let fullResponse = '';
      let chunkCount = 0;
      let finalGroundingMetadata: GroundingMetadata | undefined;

      for await (const chunk of stream) {
        chunkCount++;
        const parts = chunk.candidates?.[0]?.content?.parts || [];
        
        for (const p of parts as any[]) {
          if (!p.text) continue;
          
          if (p.thought) {
            fullThoughts += p.text;
            serverLogger.debug("🔄 Streaming: Thought chunk", { requestId, chunkCount, length: p.text.length });
            yield { type: 'thought', content: p.text };
          } else {
            fullResponse += p.text;
            serverLogger.debug("🔄 Streaming: Message chunk", { requestId, chunkCount, length: p.text.length });
            yield { type: 'message', content: p.text };
          }
        }

        // Check for grounding metadata
        if (chunk.candidates?.[0]?.groundingMetadata && grounding?.enabled) {
          console.log(`🔍 GROUNDING DEBUG: Thinking model chunk with grounding metadata`, {
            requestId,
            chunkCount,
            hasGroundingChunks: !!chunk.candidates[0].groundingMetadata.groundingChunks,
            hasGroundingSupports: !!chunk.candidates[0].groundingMetadata.groundingSupports,
            hasWebSearchQueries: !!chunk.candidates[0].groundingMetadata.webSearchQueries
          });

          const processedMetadata = processGroundingMetadata(chunk.candidates[0].groundingMetadata);
          if (processedMetadata) {
            finalGroundingMetadata = processedMetadata;

            console.log(`🔍 GROUNDING DEBUG: Thinking model processed grounding metadata`, {
              requestId,
              chunkCount,
              citationsCount: processedMetadata.citations?.length || 0,
              searchQueriesCount: processedMetadata.webSearchQueries?.length || 0,
              hasSearchEntryPoint: !!processedMetadata.searchEntryPoint
            });

            serverLogger.info("🔄 Streaming: Grounding metadata received (thinking)", { 
              requestId,
              citationsCount: processedMetadata.citations?.length || 0,
              searchQueriesCount: processedMetadata.webSearchQueries?.length || 0
            });
            yield { type: 'grounding', content: '', groundingMetadata: processedMetadata };
          }
        }
        
        // Add a small delay between chunks to prevent UI overwhelm
        if (chunkCount % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }


      serverLogger.info("🔄 Streaming: Complete", { 
        requestId,
        duration: `${Date.now() - startTime}ms`,
        chunks: chunkCount,
        thoughtsLength: fullThoughts.length,
        responseLength: fullResponse.length,
        hasGrounding: !!finalGroundingMetadata
      });

      // Add inline citations to the full response if grounding metadata is available
      const responseWithCitations = finalGroundingMetadata ? 
        addInlineCitations(fullResponse, { groundingSupports: finalGroundingMetadata.groundingSupports, groundingChunks: finalGroundingMetadata.groundingChunks }) : 
        fullResponse;

      yield { 
        type: 'complete', 
        content: responseWithCitations,
        groundingMetadata: finalGroundingMetadata
      };
      return;
    }


    // IMAGE MODELS (fallback to non-streaming)
    if (modelDef.isMultimedia === "image") {
      serverLogger.info("🔄 Streaming: Image fallback to non-streaming", { requestId });
      const result = await generateContent(apiKey, history, prompt, modelId, attachments, grounding, enableThinking);
      if ('images' in result) {
        yield { type: 'complete', content: `Generated ${result.images.length} image(s)` };
      }
      return;
    }

    // DEFAULT CHAT MODELS
    serverLogger.info("🔄 Streaming: Using chat model", { requestId, model: modelDef.apiModel });

    const chatHistory = fullHistory.slice(0, -1);
    const lastMessage = fullHistory.slice(-1)[0];

    const chatConfig: any = {};
    if (tools.length > 0) {
      chatConfig.tools = tools;
    }

    const chat = ai.chats.create({
      model: modelDef.apiModel,
      history: chatHistory as any,
      config: chatConfig,
    });

    const stream = await chat.sendMessageStream({ message: lastMessage.parts });

    let fullResponse = '';
    let chunkCount = 0;
    let finalGroundingMetadata: GroundingMetadata | undefined;

    for await (const chunk of stream) {
      if (chunk.text) {
        chunkCount++;
        fullResponse += chunk.text;
        serverLogger.debug("🔄 Streaming: Chat chunk", { requestId, chunkCount, length: chunk.text.length });
        yield { type: 'message', content: chunk.text };
        
        // Add a small delay between chunks to prevent UI overwhelm
        if (chunkCount % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      // Check for grounding metadata in the final chunk
      if (chunk.candidates?.[0]?.groundingMetadata && grounding?.enabled) {
        console.log(`🔍 GROUNDING DEBUG: Streaming chunk with grounding metadata`, {
          requestId,
          chunkCount,
          hasGroundingChunks: !!chunk.candidates[0].groundingMetadata.groundingChunks,
          hasGroundingSupports: !!chunk.candidates[0].groundingMetadata.groundingSupports,
          hasWebSearchQueries: !!chunk.candidates[0].groundingMetadata.webSearchQueries
        });

        const processedMetadata = processGroundingMetadata(chunk.candidates[0].groundingMetadata);
        if (processedMetadata) {
          finalGroundingMetadata = processedMetadata;
          
          console.log(`🔍 GROUNDING DEBUG: Streaming processed grounding metadata`, {
            requestId,
            chunkCount,
            citationsCount: processedMetadata.citations?.length || 0,
            searchQueriesCount: processedMetadata.webSearchQueries?.length || 0,
            hasSearchEntryPoint: !!processedMetadata.searchEntryPoint
          });

          serverLogger.info("🔄 Streaming: Grounding metadata received", { 
            requestId,
            citationsCount: processedMetadata.citations?.length || 0,
            searchQueriesCount: processedMetadata.webSearchQueries?.length || 0
          });
          yield { type: 'grounding', content: '', groundingMetadata: processedMetadata };
        }
      }
    }


    serverLogger.info("🔄 Streaming: Complete", { 
      requestId,
      duration: `${Date.now() - startTime}ms`,
      chunks: chunkCount,
      responseLength: fullResponse.length,
      hasGrounding: !!finalGroundingMetadata
    });

    // Add inline citations to the full response if grounding metadata is available
    const responseWithCitations = finalGroundingMetadata ? 
      addInlineCitations(fullResponse, { groundingSupports: finalGroundingMetadata.groundingSupports, groundingChunks: finalGroundingMetadata.groundingChunks }) : 
      fullResponse;

    yield { 
      type: 'complete', 
      content: responseWithCitations,
      groundingMetadata: finalGroundingMetadata
    };

  } catch (error) {
    serverLogger.error("🔄 Streaming: Failed", { 
      requestId,
      modelId,
      duration: `${Date.now() - startTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    if (error instanceof Error) {
      error.message = `[${modelId}] ${error.message}`;
    }
    throw error;
  }
} 