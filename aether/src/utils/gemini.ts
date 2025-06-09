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

export interface GroundedTextResponse { 
  text: string; 
  groundingMetadata?: {
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
  };
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
  serverLogger.info("Gemini: generateContent started", { 
    requestId,
    modelId,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    historyLength: history?.length || 0,
    promptLength: prompt?.length || 0,
    promptPreview: prompt ? prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '') : null,
    attachmentsCount: attachments?.length || 0,
    hasTtsOptions: !!ttsOptions,
    hasGrounding: !!grounding?.enabled,
    enableThinking
  });

  if (!apiKey) {
    serverLogger.error("Gemini: Missing API key", { requestId });
    throw new Error("Google Gemini API key is required");
  }

  const modelDef = getModelById(modelId);
  if (!modelDef) {
    serverLogger.error("Gemini: Model not found", { 
      requestId, 
      modelId, 
      availableModels: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash-preview-05-20"]
    });
    throw new Error(`Unsupported model: ${modelId}`);
  }

  serverLogger.info("Gemini: Model definition loaded", { 
    requestId,
    modelDef: {
      id: modelDef.id,
      name: modelDef.name,
      apiModel: modelDef.apiModel,
      isThinking: modelDef.isThinking,
      isMultimedia: modelDef.isMultimedia,
      supportedInputs: modelDef.supportedInputs,
      supportedOutputs: modelDef.supportedOutputs,
      supportsGrounding: modelDef.supportsGrounding,
      capabilities: modelDef.capabilities
    }
  });

  serverLogger.debug("Gemini: Initializing Google AI client", { requestId });
  const ai = new GoogleGenAI({ apiKey });
  const contents: Part[] = [];

  // 1) Inline any attachments
  if (attachments && attachments.length > 0) {
    serverLogger.info("Gemini: Processing attachments", { 
      requestId,
      attachmentCount: attachments.length,
      attachmentTypes: attachments.map(att => ({ type: att.type, name: att.name, dataSize: att.data.length }))
    });

    for (const att of attachments) {
      // Strip data URL prefix if present (e.g., "data:image/png;base64,")
      let cleanData = att.data;
      if (att.data.includes(',')) {
        cleanData = att.data.split(',')[1];
      }

      serverLogger.debug("Gemini: Adding attachment to contents", { 
        requestId,
        fileName: att.name,
        mimeType: att.type,
        originalDataLength: att.data.length,
        cleanDataLength: cleanData.length
      });

      contents.push({
        inlineData: { mimeType: att.type, data: cleanData },
      });
    }
  } else {
    serverLogger.debug("Gemini: No attachments to process", { requestId });
  }

  // 2) Then the user prompt
  if (prompt) {
    serverLogger.debug("Gemini: Adding text prompt to contents", { 
      requestId,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
    });
    contents.push({ text: prompt });
  } else {
    serverLogger.debug("Gemini: No text prompt provided", { requestId });
  }

  // Build the full user‐plus‐history
  const fullHistory = [
    ...history,
    { role: "user", parts: contents },
  ];

  serverLogger.info("Gemini: Full conversation history prepared", { 
    requestId,
    totalHistoryLength: fullHistory.length,
    totalParts: fullHistory.reduce((sum, entry) => sum + (entry.parts?.length || 0), 0),
    historyStructure: fullHistory.map((entry, idx) => ({
      index: idx,
      role: entry.role,
      partsCount: entry.parts?.length || 0,
      hasText: entry.parts?.some(p => p.text),
      hasInlineData: entry.parts?.some(p => p.inlineData)
    }))
  });

  // --- LIVE MODELS (WebSocket, handled outside this helper) ---
  if (modelDef.apiModel.includes("-live-")) {
    serverLogger.warn("Gemini: Live model detected - not supported in this function", { 
      requestId,
      modelId,
      apiModel: modelDef.apiModel
    });
    throw new Error("Live models must be driven through ai.live.connect() in ChatManager");
  }

  const startTime = Date.now();

  try {
    // Prepare tools array for grounding
    const tools: Tool[] = [];
    if (grounding?.enabled && modelDef.supportsGrounding) {
      serverLogger.info("Gemini: Adding grounding search tool", { requestId });
      
      if (modelDef.apiModel.includes('gemini-2.0')) {
        // Gemini 2.0 uses Search as a tool
        tools.push({
          googleSearch: {}
        } as any);
        serverLogger.debug("Gemini: Added Google Search tool for 2.0 model", { requestId });
      } else if (modelDef.apiModel.includes('gemini-1.5')) {
        // Gemini 1.5 uses GoogleSearchRetrieval
        const searchTool: any = {
          googleSearchRetrieval: {}
        };
        
        if (grounding.dynamicThreshold !== undefined) {
          searchTool.googleSearchRetrieval.dynamicRetrievalConfig = {
            mode: 'MODE_DYNAMIC',
            dynamicThreshold: grounding.dynamicThreshold
          };
          serverLogger.debug("Gemini: Added dynamic retrieval config", { 
            requestId, 
            threshold: grounding.dynamicThreshold 
          });
        }
        
        tools.push(searchTool);
        serverLogger.debug("Gemini: Added Google Search Retrieval tool for 1.5 model", { requestId });
      }
    }

    // --- THINKING MODELS ---
    if (modelDef.isThinking && (enableThinking === undefined || enableThinking === true)) {
      serverLogger.info("Gemini: Processing thinking model", { 
        requestId,
        modelId,
        apiModel: modelDef.apiModel,
        enableThinking
      });

      const thinkingConfig: any = {
        tools: tools.length > 0 ? tools : undefined,
        responseModalities: ["TEXT"]
      };

      // Add thinking configuration
      thinkingConfig.thinkingConfig = { includeThoughts: true };
      serverLogger.debug("Gemini: Added thinking configuration", { requestId });

      const thinkingStartTime = Date.now();
      const result = await ai.models.generateContent({
        model: modelDef.apiModel,
        contents: fullHistory as any,
        config: thinkingConfig,
      });
      const thinkingDuration = Date.now() - thinkingStartTime;

      serverLogger.info("Gemini: Thinking model response received", { 
        requestId,
        duration: `${thinkingDuration}ms`,
        hasCandidates: !!result.candidates?.length,
        candidatesCount: result.candidates?.length || 0
      });

      const parts = result.candidates?.[0]?.content?.parts || [];
      serverLogger.debug("Gemini: Processing thinking model parts", { 
        requestId,
        partsCount: parts.length,
        partTypes: parts.map((p: any, idx: number) => ({
          index: idx,
          hasText: !!p.text,
          hasThought: !!p.thought,
          textLength: p.text?.length || 0
        }))
      });

      let thoughts = "", answer = "";
      for (const p of parts as any[]) {
        if (p.thought) {
          thoughts += p.text;
          serverLogger.debug("Gemini: Added thought text", { 
            requestId,
            thoughtLength: p.text?.length || 0
          });
        } else {
          answer += p.text;
          serverLogger.debug("Gemini: Added answer text", { 
            requestId,
            answerLength: p.text?.length || 0
          });
        }
      }

      const responseText = (thoughts ? `**Thoughts:**\n${thoughts}\n\n---\n\n**Answer:**\n${answer}` : answer);
      serverLogger.info("Gemini: Thinking model processing complete", { 
        requestId,
        thoughtsLength: thoughts.length,
        answerLength: answer.length,
        totalResponseLength: responseText.length,
        hasThoughts: !!thoughts
      });

      return { text: responseText };
    }

    // --- AUDIO-ONLY (TTS) MODELS ---
    if (modelDef.isMultimedia === "audio" && !modelDef.apiModel.includes("-live-")) {
      serverLogger.info("Gemini: Processing TTS model", { 
        requestId,
        modelId,
        apiModel: modelDef.apiModel,
        hasTtsOptions: !!ttsOptions
      });

      const config: any = { 
        responseModalities: [Modality.AUDIO],
        tools: tools.length > 0 ? tools : undefined
      };
      
      if (ttsOptions) {
        serverLogger.debug("Gemini: Applying TTS options", { 
          requestId,
          hasVoiceName: !!ttsOptions.voiceName,
          voiceName: ttsOptions.voiceName,
          hasMultiSpeaker: !!ttsOptions.multiSpeaker,
          multiSpeakerCount: ttsOptions.multiSpeaker?.length || 0
        });

        // single‐speaker
        if (ttsOptions.voiceName) {
          config.speechConfig = {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: ttsOptions.voiceName } },
          };
          serverLogger.debug("Gemini: Single speaker voice config applied", { 
            requestId,
            voiceName: ttsOptions.voiceName
          });
        }
        
        // multi-speaker
        if (ttsOptions.multiSpeaker) {
          config.speechConfig = {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: ttsOptions.multiSpeaker.map(ms => ({
                speaker: ms.speaker,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: ms.voiceName } }
              }))
            }
          };
          serverLogger.debug("Gemini: Multi-speaker voice config applied", { 
            requestId,
            speakers: ttsOptions.multiSpeaker.map(ms => ({ speaker: ms.speaker, voice: ms.voiceName }))
          });
        }
      } else {
        serverLogger.debug("Gemini: Using default TTS configuration", { requestId });
      }

      const ttsStartTime = Date.now();
      const response = await ai.models.generateContent({
        model: modelDef.apiModel,
        contents: [{ parts: contents }], // Use contents directly for TTS
        config,
      });
      const ttsDuration = Date.now() - ttsStartTime;

      serverLogger.info("Gemini: TTS model response received", { 
        requestId,
        duration: `${ttsDuration}ms`,
        hasCandidates: !!response.candidates?.length
      });

      const inline = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inline || !inline.data) {
        serverLogger.error("Gemini: No audio data in TTS response", { 
          requestId,
          hasInline: !!inline,
          hasData: !!inline?.data,
          mimeType: inline?.mimeType,
          responseParts: response.candidates?.[0]?.content?.parts?.length || 0
        });
        throw new Error("No audio returned from TTS model");
      }

      serverLogger.info("Gemini: TTS audio data extracted", { 
        requestId,
        mimeType: inline.mimeType,
        audioDataLength: inline.data.length
      });

      return { audioBase64: inline.data, mimeType: inline.mimeType || "audio/wav" };
    }

    // --- IMAGE MODELS ---
    if (modelDef.isMultimedia === "image") {
      serverLogger.info("Gemini: Processing image generation model", { 
        requestId,
        modelId,
        apiModel: modelDef.apiModel
      });

      const config: any = {
        responseModalities: [Modality.IMAGE, Modality.TEXT], // Image models require both
        tools: tools.length > 0 ? tools : undefined
      };

      const imageStartTime = Date.now();
      const response = await ai.models.generateContent({
        model: modelDef.apiModel,
        contents: fullHistory as any,
        config,
      });
      const imageDuration = Date.now() - imageStartTime;

      serverLogger.info("Gemini: Image model response received", { 
        requestId,
        duration: `${imageDuration}ms`,
        hasCandidates: !!response.candidates?.length
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      serverLogger.debug("Gemini: Processing image response parts", { 
        requestId,
        partsCount: parts.length,
        partTypes: parts.map((p: any, idx: number) => ({
          index: idx,
          hasInlineData: !!p.inlineData,
          hasText: !!p.text,
          mimeType: p.inlineData?.mimeType,
          dataLength: p.inlineData?.data?.length || 0
        }))
      });

      const images: Array<{ data: string; mimeType: string }> = [];
      for (const p of parts as any[]) {
        if (p.inlineData?.data) {
          images.push({ data: p.inlineData.data, mimeType: p.inlineData.mimeType });
          serverLogger.debug("Gemini: Image extracted", { 
            requestId,
            imageIndex: images.length - 1,
            mimeType: p.inlineData.mimeType,
            dataLength: p.inlineData.data.length
          });
        }
      }

      serverLogger.info("Gemini: Image generation complete", { 
        requestId,
        imageCount: images.length,
        totalImageData: images.reduce((sum, img) => sum + img.data.length, 0)
      });

      return { images };
    }

    // --- DEFAULT CHAT MODELS ---
    serverLogger.info("Gemini: Processing default chat model", { 
      requestId,
      modelId,
      apiModel: modelDef.apiModel
    });

    const chatHistory = fullHistory.slice(0, -1);
    const lastMessage = fullHistory.slice(-1)[0];

    serverLogger.debug("Gemini: Preparing chat request", { 
      requestId,
      chatHistoryLength: chatHistory.length,
      lastMessagePartsCount: lastMessage.parts.length,
      lastMessageHasText: lastMessage.parts.some(p => p.text),
      lastMessageHasInlineData: lastMessage.parts.some(p => p.inlineData),
      hasTools: tools.length > 0,
      toolsCount: tools.length
    });

    const chatConfig: any = {};
    if (tools.length > 0) {
      chatConfig.tools = tools;
      serverLogger.debug("Gemini: Added tools to chat config", { requestId, toolsCount: tools.length });
    }

    const chat = ai.chats.create({
      model: modelDef.apiModel,
      history: chatHistory as any,
      config: chatConfig,
    });

    const chatStartTime = Date.now();
    const result = await chat.sendMessage({ message: lastMessage.parts });
    const chatDuration = Date.now() - chatStartTime;

    serverLogger.info("Gemini: Chat model response received", { 
      requestId,
      duration: `${chatDuration}ms`,
      hasCandidates: !!result.candidates?.length,
      hasGroundingMetadata: !!result.candidates?.[0]?.groundingMetadata
    });

    let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Add grounding information if available
    const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata && grounding?.enabled) {
      serverLogger.info("Gemini: Grounding metadata found", { 
        requestId,
        hasSearchEntryPoint: !!groundingMetadata.searchEntryPoint,
        groundingChunksCount: groundingMetadata.groundingChunks?.length || 0,
        groundingSupportsCount: groundingMetadata.groundingSupports?.length || 0,
        webSearchQueriesCount: groundingMetadata.webSearchQueries?.length || 0
      });
      
      serverLogger.info("Gemini: Chat response processing complete", { 
        requestId,
        responseLength: text.length,
        responsePreview: text.substring(0, 150) + (text.length > 150 ? '...' : ''),
        hasGrounding: true
      });

      // Return grounded response with metadata
      return { 
        text,
        groundingMetadata: {
          searchEntryPoint: groundingMetadata.searchEntryPoint,
          groundingChunks: groundingMetadata.groundingChunks,
          groundingSupports: groundingMetadata.groundingSupports,
          webSearchQueries: groundingMetadata.webSearchQueries
        }
      } as GroundedTextResponse;
    }
    
    serverLogger.info("Gemini: Chat response processing complete", { 
      requestId,
      responseLength: text.length,
      responsePreview: text.substring(0, 150) + (text.length > 150 ? '...' : ''),
      hasGrounding: false
    });

    return { text };

  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error("Gemini: API call failed", { 
      requestId,
      modelId,
      apiModel: modelDef.apiModel,
      modelType: modelDef.isThinking ? 'thinking' : 
                modelDef.isMultimedia === 'audio' ? 'tts' :
                modelDef.isMultimedia === 'image' ? 'image' : 'chat',
      duration: `${duration}ms`,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });

    // Re-throw with additional context
    if (error instanceof Error) {
      error.message = `[${modelId}] ${error.message}`;
    }
    throw error;
  }
} 