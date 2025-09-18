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
    supportedInputs: ('text' | 'audio' | 'image' | 'video' | 'document')[]
    /** Output types this model can generate */
    supportedOutputs: ('text' | 'audio' | 'image')[]
    /** Whether this model supports grounding/search */
    supportsGrounding?: boolean
    /** Whether this model supports citations */
    supportsCitations?: boolean
    /** Whether this model supports document understanding (PDFs, etc.) */
    supportsDocuments?: boolean
    /** Special capabilities */
    capabilities?: {
      thinking?: boolean
      tts?: boolean
      imageGeneration?: boolean
      realtime?: boolean
      multiSpeaker?: boolean
      interleaved?: boolean
      documentUnderstanding?: boolean
    }
    /** Description of what the model is optimized for */
    optimizedFor?: string
  }
  
  export const models: ModelDefinition[] = [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      apiModel: 'gemini-2.5-flash',
      isThinking: true, // Adaptive thinking
      supportedInputs: ['text', 'audio', 'image', 'video', 'document'],
      supportedOutputs: ['text'],
      supportsGrounding: true, // Now supports Google Search grounding natively
      supportsCitations: true,
      supportsDocuments: true, // Document understanding support
      capabilities: {
        thinking: true,
        documentUnderstanding: true
      },
      optimizedFor: 'Adaptive thinking, web grounding, cost efficiency, and document understanding'
    }
  ]
  
  export const getModelById = (id: string): ModelDefinition | undefined =>
    models.find(m => m.id === id)
  
  export const getAvailableModels = (): ModelDefinition[] => models
