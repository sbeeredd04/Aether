export interface ModelDefinition {
    /** Unique identifier used in your UI */
    id: string
    /** Human-friendly name */
    name: string
    /** Whether this model performs internal “thinking” */
    isThinking?: boolean
    /** If the model produces or consumes multimedia */
    isMultimedia?: 'audio' | 'image'
    /** The exact model name to pass to the Gemini API */
    apiModel: string
  }
  
  export const models: ModelDefinition[] = [
    {
      id: 'gemini-2.5-flash-preview-05-20',
      name: 'Gemini 2.5 Flash Preview',
      apiModel: 'gemini-2.5-flash-preview-05-20',
    },
    {
      id: 'gemini-2.5-flash-preview-native-audio-dialog',
      name: 'Gemini 2.5 Flash Native Audio Dialog',
      apiModel: 'gemini-2.5-flash-preview-native-audio-dialog',
      isMultimedia: 'audio',
    },
    {
      id: 'gemini-2.5-flash-exp-native-audio-thinking-dialog',
      name: 'Gemini 2.5 Flash Native Audio Thinking Dialog',
      apiModel: 'gemini-2.5-flash-exp-native-audio-thinking-dialog',
      isThinking: true,
      isMultimedia: 'audio',
    },
    {
      id: 'gemini-2.5-flash-preview-tts',
      name: 'Gemini 2.5 Flash Preview TTS',
      apiModel: 'gemini-2.5-flash-preview-tts',
      isMultimedia: 'audio',
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      apiModel: 'gemini-2.0-flash',
    },
    {
      id: 'gemini-2.0-flash-preview-image-generation',
      name: 'Gemini 2.0 Flash Preview Image Generation',
      apiModel: 'gemini-2.0-flash-preview-image-generation',
      isMultimedia: 'image',
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash-Lite',
      apiModel: 'gemini-2.0-flash-lite',
    },
    {
      id: 'gemini-2.0-flash-live-001',
      name: 'Gemini 2.0 Flash Live',
      apiModel: 'gemini-2.0-flash-live-001',
      isMultimedia: 'audio',
    },
  ]
  
  export const getModelById = (id: string): ModelDefinition | undefined =>
    models.find(m => m.id === id)
  