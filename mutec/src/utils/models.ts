export interface ModelDefinition {
    /** Unique identifier used in your UI */
    id: string
    /** Human-friendly name */
    name: string
    /** Whether this model performs internal "thinking" */
    isThinking?: boolean
    /** If the model produces or consumes multimedia */
    isMultimedia?: 'audio' | 'image' | 'mixed'
    /** The exact model name to pass to the Gemini API */
    apiModel: string
    /** Input types this model supports */
    supportedInputs: ('text' | 'audio' | 'image' | 'video')[]
    /** Output types this model can generate */
    supportedOutputs: ('text' | 'audio' | 'image')[]
    /** Whether this model supports grounding/search */
    supportsGrounding?: boolean
    /** Whether this model supports citations */
    supportsCitations?: boolean
    /** Special capabilities */
    capabilities?: {
      thinking?: boolean
      tts?: boolean
      imageGeneration?: boolean
      realtime?: boolean
      multiSpeaker?: boolean
      interleaved?: boolean
    }
    /** Description of what the model is optimized for */
    optimizedFor?: string
  }
  
  export const models: ModelDefinition[] = [
    {
      id: 'gemini-2.5-flash-preview-05-20',
      name: 'Gemini 2.5 Flash Preview',
      apiModel: 'gemini-2.5-flash-preview-05-20',
      isThinking: true, // Adaptive thinking
      supportedInputs: ['text', 'audio', 'image', 'video'],
      supportedOutputs: ['text'],
      supportsGrounding: false, // 2.5 models don't support search as tool
      supportsCitations: true,
      capabilities: {
        thinking: true
      },
      optimizedFor: 'Adaptive thinking, cost efficiency'
    },
    {
      id: 'gemini-2.5-flash-thinking',
      name: 'Gemini 2.5 Flash Thinking',
      apiModel: 'gemini-2.5-flash-thinking',
      isThinking: true, // Always thinking enabled
      supportedInputs: ['text', 'audio', 'image', 'video'],
      supportedOutputs: ['text'],
      supportsGrounding: false,
      supportsCitations: true,
      capabilities: {
        thinking: true
      },
      optimizedFor: 'Deep reasoning and complex problem solving'
    },
    {
      id: 'gemini-2.5-flash-preview-native-audio-dialog',
      name: 'Gemini 2.5 Flash Native Audio Dialog',
      apiModel: 'gemini-2.5-flash-preview-native-audio-dialog',
      isMultimedia: 'mixed',
      supportedInputs: ['text', 'audio', 'video'],
      supportedOutputs: ['text', 'audio'],
      supportsGrounding: false,
      supportsCitations: true,
      capabilities: {
        interleaved: true,
        realtime: true
      },
      optimizedFor: 'High quality, natural conversational audio outputs'
    },
    {
      id: 'gemini-2.5-flash-exp-native-audio-thinking-dialog',
      name: 'Gemini 2.5 Flash Audio Thinking Dialog',
      apiModel: 'gemini-2.5-flash-exp-native-audio-thinking-dialog',
      isThinking: true,
      isMultimedia: 'mixed',
      supportedInputs: ['text', 'audio', 'video'],
      supportedOutputs: ['text', 'audio'],
      supportsGrounding: false,
      supportsCitations: true,
      capabilities: {
        thinking: true,
        interleaved: true,
        realtime: true
      },
      optimizedFor: 'Natural conversational audio with thinking'
    },
    {
      id: 'gemini-2.5-flash-preview-tts',
      name: 'Gemini 2.5 Flash Preview TTS',
      apiModel: 'gemini-2.5-flash-preview-tts',
      isMultimedia: 'audio',
      supportedInputs: ['text'],
      supportedOutputs: ['audio'],
      supportsGrounding: false,
      supportsCitations: false,
      capabilities: {
        tts: true,
        multiSpeaker: true
      },
      optimizedFor: 'Low latency, controllable text-to-speech'
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      apiModel: 'gemini-2.0-flash',
      isThinking: true,
      supportedInputs: ['text', 'audio', 'image', 'video'],
      supportedOutputs: ['text'],
      supportsGrounding: true, // 2.0 models support search as tool
      supportsCitations: true,
      capabilities: {
        thinking: true,
        realtime: true
      },
      optimizedFor: 'Next generation features, speed, thinking, and realtime streaming'
    },
    {
      id: 'gemini-2.0-flash-preview-image-generation',
      name: 'Gemini 2.0 Flash Image Generation',
      apiModel: 'gemini-2.0-flash-preview-image-generation',
      isMultimedia: 'image',
      supportedInputs: ['text', 'audio', 'image', 'video'],
      supportedOutputs: ['text', 'image'],
      supportsGrounding: true,
      supportsCitations: true,
      capabilities: {
        imageGeneration: true
      },
      optimizedFor: 'Conversational image generation and editing'
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash-Lite',
      apiModel: 'gemini-2.0-flash-lite',
      supportedInputs: ['text', 'audio', 'image', 'video'],
      supportedOutputs: ['text'],
      supportsGrounding: true,
      supportsCitations: true,
      optimizedFor: 'Cost efficiency and low latency'
    },
  ]
  
  export const getModelById = (id: string): ModelDefinition | undefined =>
    models.find(m => m.id === id)
  
  export const getAvailableModels = (): ModelDefinition[] => models
  
  export const getTTSVoices = () => [
    { id: 'Zephyr', name: 'Zephyr (Bright)' },
    { id: 'Puck', name: 'Puck (Upbeat)' },
    { id: 'Charon', name: 'Charon (Informative)' },
    { id: 'Kore', name: 'Kore (Firm)' },
    { id: 'Fenrir', name: 'Fenrir (Excitable)' },
    { id: 'Leda', name: 'Leda (Youthful)' },
    { id: 'Orus', name: 'Orus (Firm)' },
    { id: 'Aoede', name: 'Aoede (Breezy)' },
    { id: 'Callirrhoe', name: 'Callirrhoe (Easy-going)' },
    { id: 'Autonoe', name: 'Autonoe (Bright)' },
    { id: 'Enceladus', name: 'Enceladus (Breathy)' },
    { id: 'Iapetus', name: 'Iapetus (Clear)' },
    { id: 'Umbriel', name: 'Umbriel (Easy-going)' },
    { id: 'Algieba', name: 'Algieba (Smooth)' },
    { id: 'Despina', name: 'Despina (Smooth)' },
    { id: 'Erinome', name: 'Erinome (Clear)' },
    { id: 'Algenib', name: 'Algenib (Gravelly)' },
    { id: 'Rasalgethi', name: 'Rasalgethi (Informative)' },
    { id: 'Laomedeia', name: 'Laomedeia (Upbeat)' },
    { id: 'Achernar', name: 'Achernar (Soft)' },
    { id: 'Alnilam', name: 'Alnilam (Firm)' },
    { id: 'Schedar', name: 'Schedar (Even)' },
    { id: 'Gacrux', name: 'Gacrux (Mature)' },
    { id: 'Pulcherrima', name: 'Pulcherrima (Forward)' },
    { id: 'Achird', name: 'Achird (Friendly)' },
    { id: 'Zubenelgenubi', name: 'Zubenelgenubi (Casual)' },
    { id: 'Vindemiatrix', name: 'Vindemiatrix (Gentle)' },
    { id: 'Sadachbia', name: 'Sadachbia (Lively)' },
    { id: 'Sadaltager', name: 'Sadaltager (Knowledgeable)' },
    { id: 'Sulafat', name: 'Sulafat (Warm)' }
  ]
  