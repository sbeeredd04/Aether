// components/SettingsPanel.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiAlertTriangle, FiExternalLink, FiDownload, FiTrash2, FiDatabase, FiHardDrive } from 'react-icons/fi';
import logger from '@/utils/logger';
import { loadSettings, saveSettings, AppSettings } from '@/utils/settings';
import { workspaceManager } from '@/utils/workspaceManager';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [storageEnabled, setStorageEnabled] = useState(true);
  const [storageSize, setStorageSize] = useState('0 KB');
  const [workspaceCount, setWorkspaceCount] = useState(0);

  // Calculate storage size
  const calculateStorageSize = () => {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (key.startsWith('aether-')) {
          totalSize += (localStorage[key].length + key.length) * 2; // UTF-16 uses 2 bytes per character
        }
      }
      
      // Format size
      if (totalSize < 1024) {
        return `${totalSize} B`;
      } else if (totalSize < 1024 * 1024) {
        return `${(totalSize / 1024).toFixed(1)} KB`;
      } else {
        return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
      }
    } catch (error) {
      logger.error('Failed to calculate storage size', { error });
      return '0 KB';
    }
  };

  // Load saved settings on mount
  useEffect(() => {
    try {
      const settings = loadSettings();
      setApiKey(settings.apiKey);
      setStorageEnabled(settings.storageEnabled !== false); // Default to true
      
      // Calculate storage info
      setStorageSize(calculateStorageSize());
      setWorkspaceCount(workspaceManager.getWorkspaces().length);
      
      logger.info('Loaded settings from localStorage.', { 
        hasApiKey: !!settings.apiKey,
        storageEnabled: settings.storageEnabled !== false
      });
    } catch (error) {
      logger.error('Failed to load settings from localStorage', { error });
    }
  }, [isOpen]); // Recalculate when panel opens

  const handleSave = () => {
    try {
      const settings: AppSettings = { 
        apiKey,
        storageEnabled
      };
      saveSettings(settings);
      logger.info('Saved settings to localStorage.', { 
        hasApiKey: !!apiKey,
        storageEnabled 
      });
      onClose();
    } catch (error) {
      logger.error('Failed to save settings to localStorage', { error });
    }
  };

  const handleExportAll = async () => {
    try {
      const workspaces = workspaceManager.getWorkspaces();
      const exportData = {
        exportedAt: Date.now(),
        version: '1.0',
        workspaces: workspaces.map(workspace => ({
          metadata: workspace,
          data: workspaceManager.getWorkspaceData(workspace.id)
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aether-all-workspaces-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      logger.info('Exported all workspaces successfully');
    } catch (error) {
      logger.error('Failed to export all workspaces', { error });
    }
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all workspace data? This action cannot be undone.')) {
      try {
        workspaceManager.clearAllWorkspaces();
        setStorageSize(calculateStorageSize());
        setWorkspaceCount(0);
        logger.info('Cleared all workspace data');
      } catch (error) {
        logger.error('Failed to clear workspace data', { error });
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex justify-center items-center backdrop-blur-sm">
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
          {/* API Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-white/10">
              <FiExternalLink className="h-5 w-5 text-white/80" />
              <h3 className="text-lg font-semibold text-white">API Configuration</h3>
            </div>
            
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-white mb-2">
                Google Gemini API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="block w-full px-3 py-2.5 bg-white/5 border border-white/20 rounded-lg placeholder-white/40 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your API key"
              />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200 transition-colors"
              >
                Get your API key from Google AI Studio 
                <FiExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Storage Management */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-white/10">
              <FiDatabase className="h-5 w-5 text-white/80" />
              <h3 className="text-lg font-semibold text-white">Workspace Storage</h3>
            </div>
            
            {/* Storage Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <FiHardDrive className="h-4 w-4 text-white/60" />
                <div>
                  <label htmlFor="storage" className="text-sm font-medium text-white">
                    Save Workspaces Locally
                  </label>
                  <p className="text-xs text-white/50 mt-0.5">
                    Store workspace data in your browser
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={storageEnabled}
                onClick={() => setStorageEnabled(!storageEnabled)}
                className={`${
                  storageEnabled ? 'bg-green-600' : 'bg-gray-600'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-black`}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    storageEnabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
            
            {/* Storage Stats */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/70">Storage Used</span>
                <span className="text-sm font-mono text-white">{storageSize}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/70">Workspaces</span>
                <span className="text-sm font-mono text-white">{workspaceCount}</span>
              </div>
            </div>

            {/* Storage Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportAll}
                className="flex items-center justify-center gap-2 px-3 py-2.5 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-blue-200 hover:text-blue-100 hover:bg-blue-600/10 transition-all text-sm font-medium"
              >
                <FiDownload className="h-4 w-4" />
                Export All
              </button>
              <button
                onClick={handleClearAllData}
                className="flex items-center justify-center gap-2 px-3 py-2.5 border border-red-500/30 hover:border-red-400/50 rounded-lg text-red-200 hover:text-red-100 hover:bg-red-600/10 transition-all text-sm font-medium"
              >
                <FiTrash2 className="h-4 w-4" />
                Clear All
              </button>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-amber-900/15 border border-amber-500/25 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-200 mb-1">Important Notice</h4>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Your data is stored locally in your browser. It will be lost if you clear browser data or use a different device.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 border border-blue-500/50 hover:border-blue-400/50 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black transition-all"
          >
            <FiSave className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
