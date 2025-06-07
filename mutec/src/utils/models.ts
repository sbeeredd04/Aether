export interface ModelDefinition {
  id: string;
  name: string;
  isThinking?: boolean;
  isMultimedia?: 'audio' | 'image';
  apiModel: string;
}

export const models: ModelDefinition[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    apiModel: 'gemini-2.0-flash',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    apiModel: 'gemini-2.0-flash-lite',
  },
  {
    id: 'gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash Preview',
    apiModel: 'gemini-1.5-flash-latest', // Using a real model name for now.
  },
  {
    id: 'gemini-2.5-flash-preview-thinking',
    name: 'Gemini 2.5 Flash Preview (Thinking)',
    apiModel: 'gemini-1.5-flash-latest', // Using a real model name for now.
    isThinking: true,
  },
  {
    id: 'gemini-2.5-flash-preview-tts',
    name: 'Gemini 2.5 Flash Preview TTS',
    apiModel: 'text-to-speech-model', // Placeholder
    isMultimedia: 'audio',
  },
  {
    id: 'gemini-2.5-flash-preview-image-generation',
    name: 'Gemini 2.5 Flash Preview Image Generation',
    apiModel: 'image-generation-model', // Placeholder
    isMultimedia: 'image',
  },
];

export const getModelById = (id: string): ModelDefinition | undefined => {
  return models.find(m => m.id === id);
} 