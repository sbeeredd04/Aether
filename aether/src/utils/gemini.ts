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
    for (const att of attachments) {
      let cleanData = att.data;
      if (att.data.includes(',')) {
        cleanData = att.data.split(',')[1];
      }
      contents.push({
        inlineData: { mimeType: att.type, data: cleanData },
      });
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
    
    // Add grounding information if available
    const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata && grounding?.enabled) {
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

// New streaming version
export async function* generateContentStream(
  apiKey: string,
  history: { role: "user" | "model"; parts: Part[] }[],
  prompt: string,
  modelId = "gemini-2.0-flash",
  attachments?: AttachmentData[],
  ttsOptions?: TTSOptions,
  grounding?: GroundingOptions,
  enableThinking?: boolean
): AsyncGenerator<{ type: 'thought' | 'message' | 'complete'; content: string; audioData?: string }, void, unknown> {

  const requestId = Math.random().toString(36).substring(7);
  serverLogger.info("🔄 Streaming: Started", { 
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
    serverLogger.info("🔄 Streaming: Processing attachments", { requestId, count: attachments.length });
    for (const att of attachments) {
      let cleanData = att.data;
      if (att.data.includes(',')) {
        cleanData = att.data.split(',')[1];
      }
      contents.push({
        inlineData: { mimeType: att.type, data: cleanData },
      });
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
        hasAudio: !!audioData
      });

      yield { type: 'complete', content: fullResponse, audioData };
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
      hasAudio: !!audioData
    });

    yield { type: 'complete', content: fullResponse, audioData };

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