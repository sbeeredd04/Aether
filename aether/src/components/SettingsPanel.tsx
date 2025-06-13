// components/SettingsPanel.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiAlertTriangle, FiExternalLink, FiZap } from 'react-icons/fi';
import logger from '@/utils/logger';
import { loadSettings, saveSettings, AppSettings } from '@/utils/settings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [streamingEnabled, setStreamingEnabled] = useState(true); // Default to enabled

  // Load saved settings on mount
  useEffect(() => {
    try {
      const settings = loadSettings();
      setApiKey(settings.apiKey);
      setStreamingEnabled(settings.streamingEnabled);
      logger.info('Loaded settings from localStorage.', { 
        hasApiKey: !!settings.apiKey,
        streamingEnabled: settings.streamingEnabled 
      });
    } catch (error) {
      logger.error('Failed to load settings from localStorage', { error });
    }
  }, []);

  const handleSave = () => {
    try {
      const settings: AppSettings = { 
        apiKey,
        streamingEnabled
      };
      saveSettings(settings);
      logger.info('Saved settings to localStorage.', { 
        hasApiKey: !!apiKey,
        streamingEnabled 
      });
      onClose();
    } catch (error) {
      logger.error('Failed to save settings to localStorage', { error });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm">
      <div className="p-8 rounded-xl shadow-2xl w-full max-w-md text-white bg-black/20 border border-white/10 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/30 transition-colors"
          >
            <FiX size={28} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
              Google Gemini API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-black/20 border border-white/10 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter your API key"
            />
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center text-sm text-blue-300 hover:text-blue-400"
            >
              Get your API key from Google AI Studio <FiExternalLink className="ml-1" />
            </a>
          </div>

          {/* Streaming Responses Setting */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FiZap className="h-5 w-5 text-yellow-300" />
                <label htmlFor="streaming" className="text-sm font-medium">
                  Streaming Responses
                </label>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={streamingEnabled}
                onClick={() => setStreamingEnabled(!streamingEnabled)}
                className={`${
                  streamingEnabled ? 'bg-blue-600' : 'bg-gray-600'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black`}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    streamingEnabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-300">
              {streamingEnabled 
                ? 'Responses will stream in real-time as they are generated'
                : 'Responses will be sent as complete messages'
              }
            </p>
          </div>

          <div className="p-3 bg-black/30 rounded-xl flex items-start space-x-3">
            <FiAlertTriangle className="h-5 w-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">
              Your settings are stored in your browser's local storage. Do not use this application on
              a shared or public computer.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center px-6 py-2 border border-white/10 text-base font-medium rounded-xl shadow-sm text-white bg-blue-600/70 hover:bg-blue-600/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiSave className="-ml-1 mr-2 h-5 w-5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
