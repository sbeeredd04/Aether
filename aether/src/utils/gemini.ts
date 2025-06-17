import {
  GoogleGenAI,
  Modality,
  Behavior,
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

// TTS options interface
export interface TTSOptions {
  voiceName?: string;
  multiSpeaker?: Array<{ speaker: string; voiceName: string }>;
}

// Search grounding options
export interface GroundingOptions {
  enabled: boolean;
  dynamicThreshold?: number; // 0-1, for Gemini 1.5 models only
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
    groundingSupportsLength: rawMetadata?.groundingSupports?.length || 0,
    rawMetadata
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
      console.log('🔍 CITATION EXTRACTION DEBUG: Added chunk to map', {
        index,
        title: chunk.web.title,
        uri: chunk.web.uri
      });
    }
  });

  console.log('🔍 CITATION EXTRACTION DEBUG: Chunk map built', {
    chunkMapSize: chunkMap.size,
    chunkMapEntries: Array.from(chunkMap.entries())
  });

  // Extract citations with confidence scores
  rawMetadata.groundingSupports.forEach((support: any, supportIndex: number) => {
    console.log('🔍 CITATION EXTRACTION DEBUG: Processing support', {
      supportIndex,
      support,
      groundingChunkIndices: support.groundingChunkIndices,
      confidenceScores: support.confidenceScores,
      segmentText: support.segment?.text
    });

    support.groundingChunkIndices.forEach((chunkIndex: number, idx: number) => {
      const citation = chunkMap.get(chunkIndex);
      if (citation) {
        const confidenceScore = support.confidenceScores?.[idx];
        const existingCitation = citations.find(c => c.uri === citation.uri);
        
        if (!existingCitation) {
          const newCitation = {
            ...citation,
            snippet: support.segment.text,
            confidenceScore
          };
          citations.push(newCitation);
          console.log('🔍 CITATION EXTRACTION DEBUG: Added new citation', {
            chunkIndex,
            idx,
            citation: newCitation
          });
        } else {
          console.log('🔍 CITATION EXTRACTION DEBUG: Skipped duplicate citation', {
            chunkIndex,
            idx,
            existingUri: citation.uri
          });
        }
      } else {
        console.log('🔍 CITATION EXTRACTION DEBUG: Citation not found in chunk map', {
          chunkIndex,
          idx,
          availableChunks: Array.from(chunkMap.keys())
        });
      }
    });
  });

  const sortedCitations = citations.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));
  console.log('🔍 CITATION EXTRACTION DEBUG: Extraction complete', {
    totalCitations: sortedCitations.length,
    citations: sortedCitations.map(c => ({
      title: c.title?.substring(0, 50) + (c.title?.length > 50 ? '...' : ''),
      uri: c.uri,
      confidenceScore: c.confidenceScore,
      snippetLength: c.snippet?.length || 0
    }))
  });

  return sortedCitations;
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
  modelId = "gemini-2.0-flash",
  attachments?: AttachmentData[],
  ttsOptions?: TTSOptions,
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
      console.log(`🔍 GROUNDING DEBUG: Enabling grounding for model ${modelDef.apiModel}`, {
        requestId,
        modelId,
        groundingEnabled: grounding.enabled,
        dynamicThreshold: grounding.dynamicThreshold,
        supportsGrounding: modelDef.supportsGrounding
      });

      if (modelDef.apiModel.includes('gemini-2.0')) {
        const googleSearchTool = { googleSearch: {} } as any;
        tools.push(googleSearchTool);
        console.log(`🔍 GROUNDING DEBUG: Added Google Search tool for Gemini 2.0`, {
          requestId,
          tool: googleSearchTool
        });
      } else if (modelDef.apiModel.includes('gemini-1.5')) {
        const searchTool: any = { googleSearchRetrieval: {} };
        if (grounding.dynamicThreshold !== undefined) {
          searchTool.googleSearchRetrieval.dynamicRetrievalConfig = {
            mode: 'MODE_DYNAMIC',
            dynamicThreshold: grounding.dynamicThreshold
          };
        }
        tools.push(searchTool);
        console.log(`🔍 GROUNDING DEBUG: Added Google Search Retrieval tool for Gemini 1.5`, {
          requestId,
          tool: searchTool,
          dynamicThreshold: grounding.dynamicThreshold
        });
      }
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

    // AUDIO-ONLY (TTS) MODELS
    if (modelDef.isMultimedia === "audio" && !modelDef.apiModel.includes("-live-")) {
      const config: any = { 
        responseModalities: [Modality.AUDIO],
        tools: tools.length > 0 ? tools : undefined
      };
      
      if (ttsOptions) {
        if (ttsOptions.voiceName) {
          config.speechConfig = {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: ttsOptions.voiceName } },
          };
        }
        
        if (ttsOptions.multiSpeaker) {
          config.speechConfig = {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: ttsOptions.multiSpeaker.map(ms => ({
                speaker: ms.speaker,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: ms.voiceName } }
              }))
            }
          };
        }
      }

      const response = await ai.models.generateContent({
        model: modelDef.apiModel,
        contents: [{ parts: contents }],
        config,
      });

      const inline = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inline || !inline.data) {
        throw new Error("No audio returned from TTS model");
      }

      return { audioBase64: inline.data, mimeType: inline.mimeType || "audio/wav" };
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
        rawMetadata: groundingMetadata,
        keys: Object.keys(groundingMetadata),
        hasSearchEntryPoint: !!groundingMetadata.searchEntryPoint,
        hasGroundingChunks: !!groundingMetadata.groundingChunks,
        hasGroundingSupports: !!groundingMetadata.groundingSupports,
        hasWebSearchQueries: !!groundingMetadata.webSearchQueries,
        groundingChunksLength: groundingMetadata.groundingChunks?.length || 0,
        groundingSupportsLength: groundingMetadata.groundingSupports?.length || 0,
        webSearchQueriesLength: groundingMetadata.webSearchQueries?.length || 0
      });

      const processedMetadata = processGroundingMetadata(groundingMetadata);
      
      console.log(`🔍 GROUNDING DEBUG: Processed grounding metadata`, {
        requestId,
        processedMetadata,
        hasSearchEntryPoint: !!processedMetadata?.searchEntryPoint,
        citationsCount: processedMetadata?.citations?.length || 0,
        searchQueriesCount: processedMetadata?.webSearchQueries?.length || 0
      });
      
      serverLogger.info("Gemini: Grounding metadata processed", {
        requestId,
        hasSearchEntryPoint: !!processedMetadata?.searchEntryPoint,
        citationsCount: processedMetadata?.citations?.length || 0,
        searchQueriesCount: processedMetadata?.webSearchQueries?.length || 0
      });
      
      return { 
        text,
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

// New streaming version with grounding pipeline for web thinking models
export async function* generateContentStreamWithGrounding(
  apiKey: string,
  history: { role: "user" | "model"; parts: Part[] }[],
  prompt: string,
  modelId = "gemini-2.5-flash-web-thinking",
  attachments?: AttachmentData[],
  ttsOptions?: TTSOptions,
  grounding?: GroundingOptions,
  enableThinking?: boolean
): AsyncGenerator<{ 
  type: 'thought' | 'message' | 'complete' | 'grounding'; 
  content: string; 
  audioData?: string;
  groundingMetadata?: GroundingMetadata;
}, void, unknown> {

  const requestId = Math.random().toString(36).substring(7);
  serverLogger.info("🔄 Streaming Grounding Pipeline: Started", { 
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

  const startTime = Date.now();

  try {
    // STEP 1: Emit web search loading state - only if grounding is enabled
    if (grounding?.enabled) {
      yield { type: 'grounding', content: 'Searching the web...', groundingMetadata: undefined };
    }
    
    // Get grounding information from Gemini 2.0 Flash (non-streaming)
    console.log('🔍 STREAMING GROUNDING PIPELINE DEBUG: Step 1 - Getting grounding from Gemini 2.0 Flash', {
      requestId,
      prompt: prompt.substring(0, 100) + '...',
      groundingEnabled: grounding?.enabled
    });

    const groundingResult = await generateContent(
      apiKey,
      history,
      prompt,
      "gemini-2.0-flash", // Always use Gemini 2.0 Flash for grounding
      attachments,
      undefined, // No TTS for grounding step
      grounding, // Use grounding settings
      false // No thinking for grounding step
    );

    console.log('🔍 STREAMING GROUNDING PIPELINE DEBUG: Step 1 complete', {
      requestId,
      hasGroundingMetadata: 'groundingMetadata' in groundingResult && !!groundingResult.groundingMetadata,
      textLength: 'text' in groundingResult ? groundingResult.text.length : 0,
      groundingResultType: 'text' in groundingResult ? 'text' : 'other'
    });

    let groundingText = '';
    let groundingMetadata: GroundingMetadata | undefined;

    if ('text' in groundingResult) {
      groundingText = groundingResult.text;
      if ('groundingMetadata' in groundingResult) {
        groundingMetadata = groundingResult.groundingMetadata;
        
        console.log('🔍 STREAMING GROUNDING PIPELINE DEBUG: Grounding metadata received', {
          requestId,
          hasSearchEntryPoint: !!groundingMetadata?.searchEntryPoint,
          citationsCount: groundingMetadata?.citations?.length || 0,
          searchQueriesCount: groundingMetadata?.webSearchQueries?.length || 0,
          groundingChunksCount: groundingMetadata?.groundingChunks?.length || 0
        });

        // Send grounding metadata immediately
        yield { type: 'grounding', content: '', groundingMetadata };
      }
    }

    // STEP 2: Emit thinking phase loading state
    yield { type: 'grounding', content: 'Analyzing with deep thinking...', groundingMetadata: undefined };

    // Create enhanced prompt with grounding context
    let enhancedPrompt = prompt;
    if (groundingText && groundingMetadata?.citations && groundingMetadata.citations.length > 0) {
      const citationsText = groundingMetadata.citations
        .map((citation, idx) => `[${idx + 1}] ${citation.title} - ${citation.uri}${citation.snippet ? `\nSnippet: ${citation.snippet}` : ''}`)
        .join('\n\n');

      const searchQueriesText = groundingMetadata.webSearchQueries 
        ? `Search queries used: ${groundingMetadata.webSearchQueries.join(', ')}`
        : '';

      enhancedPrompt = `${prompt}

CONTEXT FROM WEB SEARCH:
${searchQueriesText}

SEARCH RESULTS:
${citationsText}

GROUNDED RESPONSE:
${groundingText}

Please provide a thoughtful analysis based on the above web search results and context. Reference the sources when relevant.`;

      console.log('🔍 STREAMING GROUNDING PIPELINE DEBUG: Enhanced prompt created', {
        requestId,
        originalPromptLength: prompt.length,
        enhancedPromptLength: enhancedPrompt.length,
        citationsIncluded: groundingMetadata.citations.length,
        searchQueriesIncluded: groundingMetadata.webSearchQueries?.length || 0
      });
    } else {
      console.log('🔍 STREAMING GROUNDING PIPELINE DEBUG: No grounding context available, using original prompt', {
        requestId,
        hasGroundingText: !!groundingText,
        hasCitations: !!groundingMetadata?.citations?.length
      });
    }

    // STEP 3: Stream thinking response with grounded context
    console.log('🔍 STREAMING GROUNDING PIPELINE DEBUG: Step 2 - Starting thinking model stream', {
      requestId,
      thinkingModelId: modelId,
      enhancedPromptLength: enhancedPrompt.length
    });

    const thinkingGenerator = generateContentStream(
      apiKey,
      history,
      enhancedPrompt, // Use enhanced prompt with grounding context
      modelId, // Use the original thinking model
      attachments,
      ttsOptions,
      undefined, // Don't use grounding again in thinking step
      enableThinking
    );

    let chunkCount = 0;
    let fullResponse = '';

    for await (const chunk of thinkingGenerator) {
      chunkCount++;
      
      console.log('🔍 STREAMING GROUNDING PIPELINE DEBUG: Thinking chunk received', {
        requestId,
        chunkCount,
        type: chunk.type,
        contentLength: chunk.content.length,
        hasAudioData: !!chunk.audioData
      });

      if (chunk.type === 'message' || chunk.type === 'thought') {
        fullResponse += chunk.content;
      }

      // Forward all chunks except don't override grounding metadata
      if (chunk.type === 'complete') {
        // For complete, include the original grounding metadata
        yield { 
          ...chunk, 
          groundingMetadata: groundingMetadata || chunk.groundingMetadata 
        };
      } else if (chunk.type !== 'grounding') {
        // Forward all other chunks as-is (but skip any additional grounding from thinking model)
        yield chunk;
      }
    }

    serverLogger.info("🔄 Streaming Grounding Pipeline: Complete", { 
      requestId,
      duration: `${Date.now() - startTime}ms`,
      groundingStep1Duration: 'calculated separately',
      thinkingChunks: chunkCount,
      finalResponseLength: fullResponse.length,
      hasGroundingMetadata: !!groundingMetadata
    });

  } catch (error) {
    serverLogger.error("🔄 Streaming Grounding Pipeline: Failed", { 
      requestId,
      modelId,
      duration: `${Date.now() - startTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    if (error instanceof Error) {
      error.message = `[Grounding Pipeline ${modelId}] ${error.message}`;
    }
    throw error;
  }
}

// New streaming version with enhanced grounding support
export async function* generateContentStream(
  apiKey: string,
  history: { role: "user" | "model"; parts: Part[] }[],
  prompt: string,
  modelId = "gemini-2.0-flash",
  attachments?: AttachmentData[],
  ttsOptions?: TTSOptions,
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
      serverLogger.info("🔄 Streaming: Adding grounding tools", { requestId });
      if (modelDef.apiModel.includes('gemini-2.0')) {
        tools.push({ googleSearch: {} } as any);
      } else if (modelDef.apiModel.includes('gemini-1.5')) {
        const searchTool: any = { googleSearchRetrieval: {} };
        if (grounding.dynamicThreshold !== undefined) {
          searchTool.googleSearchRetrieval.dynamicRetrievalConfig = {
            mode: 'MODE_DYNAMIC',
            dynamicThreshold: grounding.dynamicThreshold
          };
        }
        tools.push(searchTool);
      }
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
            rawMetadata: chunk.candidates[0].groundingMetadata,
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
              processedMetadata,
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
        } else if (grounding?.enabled) {
          console.log(`🔍 GROUNDING DEBUG: Thinking model chunk without grounding metadata`, {
            requestId,
            chunkCount,
            hasGroundingMetadata: !!chunk.candidates?.[0]?.groundingMetadata,
            groundingEnabled: grounding?.enabled
          });
        }
        
        // Add a small delay between chunks to prevent UI overwhelm
        if (chunkCount % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      // Generate TTS if requested
      let audioData: string | undefined;
      if (ttsOptions && fullResponse) {
        try {
          serverLogger.info("🔄 Streaming: Generating TTS", { requestId });
          const ttsResult = await generateContent(
            apiKey,
            [],
            `Say in a warm, empathetic voice: ${fullResponse}`,
            "gemini-2.5-flash-preview-tts",
            undefined,
            ttsOptions
          );
          if ('audioBase64' in ttsResult) {
            audioData = ttsResult.audioBase64;
          }
        } catch (error) {
          serverLogger.warn("🔄 Streaming: TTS failed", { requestId, error });
        }
      }

      serverLogger.info("🔄 Streaming: Complete", { 
        requestId,
        duration: `${Date.now() - startTime}ms`,
        chunks: chunkCount,
        thoughtsLength: fullThoughts.length,
        responseLength: fullResponse.length,
        hasAudio: !!audioData,
        hasGrounding: !!finalGroundingMetadata
      });

      yield { 
        type: 'complete', 
        content: fullResponse, 
        audioData,
        groundingMetadata: finalGroundingMetadata
      };
      return;
    }

    // TTS MODELS (fallback to non-streaming)
    if (modelDef.isMultimedia === "audio" && !modelDef.apiModel.includes("-live-")) {
      serverLogger.info("🔄 Streaming: TTS fallback to non-streaming", { requestId });
      const result = await generateContent(apiKey, history, prompt, modelId, attachments, ttsOptions, grounding, enableThinking);
      if ('audioBase64' in result) {
        yield { type: 'complete', content: '', audioData: result.audioBase64 };
      }
      return;
    }

    // IMAGE MODELS (fallback to non-streaming)
    if (modelDef.isMultimedia === "image") {
      serverLogger.info("🔄 Streaming: Image fallback to non-streaming", { requestId });
      const result = await generateContent(apiKey, history, prompt, modelId, attachments, ttsOptions, grounding, enableThinking);
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
          rawMetadata: chunk.candidates[0].groundingMetadata,
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
            processedMetadata,
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
      } else if (grounding?.enabled) {
        console.log(`🔍 GROUNDING DEBUG: Streaming chunk without grounding metadata`, {
          requestId,
          chunkCount,
          hasGroundingMetadata: !!chunk.candidates?.[0]?.groundingMetadata,
          groundingEnabled: grounding?.enabled
        });
      }
    }

    // Generate TTS if requested
    let audioData: string | undefined;
    if (ttsOptions && fullResponse) {
      try {
        serverLogger.info("🔄 Streaming: Generating TTS", { requestId });
        const ttsResult = await generateContent(
          apiKey,
          [],
          `Say in a warm, empathetic voice: ${fullResponse}`,
          "gemini-2.5-flash-preview-tts",
          undefined,
          ttsOptions
        );
        if ('audioBase64' in ttsResult) {
          audioData = ttsResult.audioBase64;
        }
      } catch (error) {
        serverLogger.warn("🔄 Streaming: TTS failed", { requestId, error });
      }
    }

    serverLogger.info("🔄 Streaming: Complete", { 
      requestId,
      duration: `${Date.now() - startTime}ms`,
      chunks: chunkCount,
      responseLength: fullResponse.length,
      hasAudio: !!audioData,
      hasGrounding: !!finalGroundingMetadata
    });

    yield { 
      type: 'complete', 
      content: fullResponse, 
      audioData,
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