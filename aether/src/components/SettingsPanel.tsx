// components/SettingsPanel.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiAlertTriangle, FiExternalLink } from 'react-icons/fi';
import logger from '@/utils/logger';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SETTINGS_KEY = 'aether-settings';

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');

  // Load saved API key on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.apiKey) {
          setApiKey(settings.apiKey);
          logger.info('Loaded API key from localStorage.');
        }
      }
    } catch (error) {
      logger.error('Failed to load settings from localStorage', { error });
    }
  }, []);

  const handleSave = () => {
    try {
      const settings = { apiKey };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      logger.info('Saved API key to localStorage.');
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

          <div className="p-3 bg-black/30 rounded-xl flex items-start space-x-3">
            <FiAlertTriangle className="h-5 w-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">
              Your API key is stored in your browser's local storage. Do not use this application on
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
