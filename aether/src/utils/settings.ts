// utils/settings.ts

const SETTINGS_KEY = 'aether-settings';

export interface AppSettings {
  apiKey: string;
  storageEnabled: boolean;
}

export const defaultSettings: AppSettings = {
  apiKey: '',
  storageEnabled: true, // Default to enabled
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
        storageEnabled: settings.storageEnabled !== undefined 
          ? settings.storageEnabled 
          : defaultSettings.storageEnabled,
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
      storageEnabled: settings.storageEnabled
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
 * Check if storage is enabled
 */
export function isStorageEnabled(): boolean {
  const settings = loadSettings();
  console.log('🔧 Settings: Storage check', { storageEnabled: settings.storageEnabled });
  return settings.storageEnabled;
}

/**
 * Get all current settings
 */
export function getSettings(): AppSettings {
  return loadSettings();
} 