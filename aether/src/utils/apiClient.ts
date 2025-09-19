import { getSettings } from './settings';

export interface ChatRequestOptions {
  apiKey?: string;
  modelId?: string;
  history: any[];
  prompt: string;
  attachments?: any[];
  grounding?: any;
  enableThinking?: boolean;
  forceStreaming?: boolean; // Override user setting
}

/**
 * Make a chat API request with automatic streaming preference
 */
export async function makeChatRequest(options: ChatRequestOptions) {
  const settings = getSettings();
  
  // Always use streaming unless explicitly disabled
  const useStreaming = options.forceStreaming !== undefined 
    ? options.forceStreaming 
    : true;
    
  console.log('🔌 API Client: Making request', {
    modelId: options.modelId,
    useStreaming,
    hasApiKey: !!(options.apiKey || settings.apiKey),
    promptLength: options.prompt?.length || 0,
    historyLength: options.history?.length || 0,
    enableThinking: options.enableThinking
  });

  const requestBody = {
    apiKey: options.apiKey || settings.apiKey,
    modelId: options.modelId || 'gemini-2.5-flash',
    history: options.history,
    prompt: options.prompt,
    attachments: options.attachments,
    grounding: options.grounding,
    enableThinking: options.enableThinking,
    stream: useStreaming // Pass the streaming preference
  };

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}

/**
 * Handle streaming response
 */
export async function handleStreamingResponse(
  response: Response,
  onThought?: (thought: string) => void,
  onMessage?: (messageChunk: string) => void,
  onComplete?: (fullMessage: string, audioData?: string, groundingMetadata?: any) => void,
  onGrounding?: (groundingMetadata: any) => void,
  onError?: (error: string) => void
): Promise<{ fullMessage: string; fullThoughts: string; audioData?: string; groundingMetadata?: any }> {
  
  if (!response.body) {
    throw new Error('No response body for streaming');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let fullMessage = '';
  let fullThoughts = '';
  let audioData: string | undefined;
  let groundingMetadata: any;

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('🔌 API Client: Streaming complete');
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'thought':
                fullThoughts += data.content;
                onThought?.(data.content);
                break;
                
              case 'message':
                fullMessage += data.content;
                onMessage?.(data.content);
                break;
                
              case 'grounding':
                if (data.groundingMetadata) {
                  groundingMetadata = data.groundingMetadata;
                  onGrounding?.(data.groundingMetadata);
                }
                break;
                
              case 'complete':
                if (data.audioData) {
                  audioData = data.audioData;
                }
                if (data.groundingMetadata) {
                  groundingMetadata = data.groundingMetadata;
                }
                onComplete?.(fullMessage, audioData, groundingMetadata);
                break;
                
              case 'error':
                onError?.(data.content);
                throw new Error(data.content);
                
              default:
                console.warn('🔌 API Client: Unknown chunk type:', data.type);
            }
          } catch (e) {
            console.warn('🔌 API Client: Failed to parse chunk:', line);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { fullMessage, fullThoughts, audioData, groundingMetadata };
}

/**
 * Handle non-streaming response
 */
export async function handleNonStreamingResponse(response: Response) {
  const result = await response.json();
  
  console.log('🔌 API Client: Non-streaming response received', {
    hasText: !!result.text,
    hasAudio: !!result.audio,
    hasImages: !!result.images,
    textLength: result.text?.length || 0
  });
  
  return result;
}

/**
 * Unified chat function that handles both streaming and non-streaming
 */
export async function sendChatMessage(
  options: ChatRequestOptions,
  callbacks?: {
    onThought?: (thought: string) => void;
    onMessage?: (messageChunk: string) => void;
    onComplete?: (fullMessage: string, audioData?: string, groundingMetadata?: any) => void;
    onGrounding?: (groundingMetadata: any) => void;
    onError?: (error: string) => void;
  }
) {
  const settings = getSettings();
  const useStreaming = options.forceStreaming !== undefined 
    ? options.forceStreaming 
    : true;

  const response = await makeChatRequest(options);

  if (useStreaming) {
    return await handleStreamingResponse(
      response,
      callbacks?.onThought,
      callbacks?.onMessage,
      callbacks?.onComplete,
      callbacks?.onGrounding,
      callbacks?.onError
    );
  } else {
    const result = await handleNonStreamingResponse(response);
    callbacks?.onComplete?.(result.text, result.audio?.data, result.groundingMetadata);
    return {
      fullMessage: result.text || '',
      fullThoughts: '',
      audioData: result.audio?.data,
      groundingMetadata: result.groundingMetadata
    };
  }
} 