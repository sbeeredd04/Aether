import {
  GoogleGenAI,
  Modality,
  Behavior,
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
  | ImageResponse;

// The one unified entrypoint
export async function generateContent(
  apiKey: string,
  history: { role: "user" | "model"; parts: Part[] }[],
  prompt: string,
  modelId = "gemini-2.0-flash",
  attachments?: AttachmentData[],
  ttsOptions?: { voiceName: string; multiSpeaker?: Array<{ speaker: string; voiceName: string }> },
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
    hasTtsOptions: !!ttsOptions
  });

  if (!apiKey) {
    serverLogger.error("Gemini: Missing API key", { requestId });
    throw new Error("Google Gemini API key is required");
  }

  const modelDef = getModelById(modelId);
  if (!modelDef) {
    serverLogger.error("Gemini: Model not found", { requestId, modelId, availableModels: ["gemini-2.0-flash", "gemini-2.0-flash-lite"] });
    throw new Error(`Unsupported model: ${modelId}`);
  }

  serverLogger.info("Gemini: Model definition loaded", { 
    requestId,
    modelDef: {
      id: modelDef.id,
      name: modelDef.name,
      apiModel: modelDef.apiModel,
      isThinking: modelDef.isThinking,
      isMultimedia: modelDef.isMultimedia
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
      serverLogger.debug("Gemini: Adding attachment to contents", { 
        requestId,
        fileName: att.name,
        mimeType: att.type,
        dataLength: att.data.length
      });

      contents.push({
        inlineData: { mimeType: att.type, data: att.data },
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
    // --- THINKING MODELS ---
    if (modelDef.isThinking) {
      serverLogger.info("Gemini: Processing thinking model", { 
        requestId,
        modelId,
        apiModel: modelDef.apiModel
      });

      const thinkingStartTime = Date.now();
      const result = await ai.models.generateContent({
        model: modelDef.apiModel,
        contents: fullHistory as any,
        config: { thinkingConfig: { includeThoughts: true } },
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

      const responseText = (thoughts ? `**Thoughts:**\n${thoughts}\n\n---\n\n` : "") + `**Answer:**\n${answer}`;
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

      const config: any = { responseModalities: [Modality.AUDIO] };
      
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
        contents,
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
          mimeType: inline?.mimeType
        });
        throw new Error("No audio returned");
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

      const imageStartTime = Date.now();
      const response = await ai.models.generateContent({
        model: modelDef.apiModel,
        contents,
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
      lastMessageHasInlineData: lastMessage.parts.some(p => p.inlineData)
    });

    const chat = ai.chats.create({
      model: modelDef.apiModel,
      history: chatHistory as any,
    });

    const chatStartTime = Date.now();
    const result = await chat.sendMessage({ message: lastMessage.parts });
    const chatDuration = Date.now() - chatStartTime;

    serverLogger.info("Gemini: Chat model response received", { 
      requestId,
      duration: `${chatDuration}ms`,
      hasCandidates: !!result.candidates?.length
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    serverLogger.info("Gemini: Chat response processing complete", { 
      requestId,
      responseLength: text.length,
      responsePreview: text.substring(0, 150) + (text.length > 150 ? '...' : '')
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