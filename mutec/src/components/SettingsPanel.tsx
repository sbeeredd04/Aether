// components/SettingsPanel.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiAlertTriangle, FiExternalLink, FiSun, FiMoon } from 'react-icons/fi';
import logger from '@/utils/logger';
import { useChatStore } from '../store/chatStore';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SETTINGS_KEY = 'mutec-settings';
const THEME_KEY = 'mutec-theme';

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const theme = useChatStore((s) => s.theme);
  const setTheme = useChatStore((s) => s.setTheme);

  // Load saved API key and theme on mount
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

      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
    } catch (error) {
      logger.error('Failed to load settings or theme from localStorage', { error });
    }
  }, [setTheme]);

  // Whenever the theme state changes, persist it and update the <html> class
  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem(THEME_KEY, 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem(THEME_KEY, 'light');
      }
    } catch (error) {
      logger.error('Failed to apply theme change', { error });
    }
  }, [theme]);

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

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex justify-center items-center">
      <div className="glass-morphism p-8 rounded-3xl shadow-2xl w-full max-w-md text-gray-900 dark:text-white bg-white/80 dark:bg-[#23283a]/80 border border-white/30 dark:border-black/30">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
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
              className="mt-1 block w-full px-3 py-2 bg-white/40 dark:bg-black/30 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
              placeholder="Enter your API key"
            />
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center text-sm text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-400"
            >
              Get your API key from Google AI Studio <FiExternalLink className="ml-1" />
            </a>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-[#23283a]/60 rounded-2xl">
            <span className="flex items-center gap-2 text-sm font-medium">
              {theme === 'dark' ? <FiMoon /> : <FiSun />} {theme === 'dark' ? 'Dark' : 'Light'} Mode
            </span>
            <button
              onClick={handleThemeToggle}
              className="relative inline-flex h-7 w-14 items-center rounded-full bg-blue-400/40 dark:bg-blue-900/40 transition-colors focus:outline-none border border-blue-400 dark:border-blue-700"
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white dark:bg-gray-800 shadow transition-transform ${
                  theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="p-3 bg-yellow-900/60 rounded-2xl flex items-start space-x-3">
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
            className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-2xl shadow-sm text-white bg-blue-600 bg-opacity-70 hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiSave className="-ml-1 mr-2 h-5 w-5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
