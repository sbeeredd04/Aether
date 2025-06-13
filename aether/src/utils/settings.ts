// utils/settings.ts

const SETTINGS_KEY = 'aether-settings';

export interface AppSettings {
  apiKey: string;
  streamingEnabled: boolean;
}

export const defaultSettings: AppSettings = {
  apiKey: '',
  streamingEnabled: true, // Default to enabled
};

/**
 * Load settings from localStorage
 */
export function loadSettings(): AppSettings {
  try {
    if (typeof window === 'undefined') {
      return defaultSettings; // Return defaults on server side
    }
    
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      const result = {
        apiKey: settings.apiKey || defaultSettings.apiKey,
        streamingEnabled: settings.streamingEnabled !== undefined 
          ? settings.streamingEnabled 
          : defaultSettings.streamingEnabled,
      };
      
      return result;
    }
  } catch (error) {
    console.error('🔧 Settings: Failed to load from localStorage', error);
  }
  
  return defaultSettings;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
  try {
    if (typeof window === 'undefined') {
      console.log('🔧 Settings: Cannot save on server-side');
      return; // Can't save on server side
    }
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    console.log('🔧 Settings: Saved', {
      hasApiKey: !!settings.apiKey,
      streamingEnabled: settings.streamingEnabled
    });
  } catch (error) {
    console.error('🔧 Settings: Failed to save to localStorage', error);
  }
}

/**
 * Get the current API key
 */
export function getApiKey(): string {
  const settings = loadSettings();
  return settings.apiKey;
}

/**
 * Check if streaming is enabled
 */
export function isStreamingEnabled(): boolean {
  const settings = loadSettings();
  console.log('🔧 Settings: Streaming check', { streamingEnabled: settings.streamingEnabled });
  return settings.streamingEnabled;
}

/**
 * Get all current settings
 */
export function getSettings(): AppSettings {
  return loadSettings();
} 