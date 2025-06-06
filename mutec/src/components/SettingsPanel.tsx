'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiAlertTriangle } from 'react-icons/fi';
import logger from '@/utils/logger';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SETTINGS_KEY = 'mutec-settings';

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <FiX size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Google Gemini API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your API key"
            />
          </div>
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-start space-x-3">
            <FiAlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Your API key is stored in your browser's local storage. Do not use this application on a shared or public computer.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FiSave className="-ml-1 mr-2 h-5 w-5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 