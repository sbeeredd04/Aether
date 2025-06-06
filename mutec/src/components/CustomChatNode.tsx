'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useChatStore, CustomNodeData } from '../store/chatStore';
import { FiSend, FiPlus, FiMaximize2, FiX, FiRefreshCw } from 'react-icons/fi';
import logger from '@/utils/logger';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

function CustomChatNode({ id, data }: { id: string; data: CustomNodeData }) {
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const { addMessageToNode, createNodeAndEdge, getPathToNode, resetNode } = useChatStore();

  const hasResponse = data.chatHistory.some(msg => msg.role === 'model');
  const lastModelResponse = data.chatHistory.find(msg => msg.role === 'model')?.content || '';
  const lastUserMessage = data.chatHistory.find(msg => msg.role === 'user')?.content || '';

  const handleInputChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(evt.target.value);
  };

  const handleAskLLM = useCallback(async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    const userMessage: ChatMessage = { role: 'user', content: input };
    addMessageToNode(id, userMessage);
    setInput('');
    const pathMessages = getPathToNode(id);
    const history = pathMessages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));
    try {
      const savedSettings = localStorage.getItem('mutec-settings');
      if (!savedSettings) throw new Error('API key not found. Please set it in the settings panel.');
      const settings = JSON.parse(savedSettings);
      const apiKey = settings.apiKey;
      if (!apiKey) throw new Error('API key is empty. Please set it in the settings panel.');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, prompt: input, apiKey }),
      });
      const data = await response.json();
      if (data.text) {
        const modelMessage: ChatMessage = { role: 'model', content: data.text };
        addMessageToNode(id, modelMessage, false);
      } else if (data.error) {
        addMessageToNode(id, { role: 'model', content: `Error: ${data.error}` });
      }
    } catch (error: any) {
      addMessageToNode(id, { role: 'model', content: `Error: ${error.message || error}` });
    } finally {
      setIsLoading(false);
    }
  }, [id, input, addMessageToNode, getPathToNode]);

  const handleBranch = useCallback(() => {
    createNodeAndEdge(id, 'New Chat', 'branch');
  }, [id, createNodeAndEdge]);

  const handleReset = useCallback(() => {
    resetNode(id);
  }, [id, resetNode]);

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  // Glassmorphism and border radius classes
  const nodeClass =
    'glass-morphism bg-white/60 dark:bg-black/40 border border-white/30 dark:border-black/30 shadow-2xl rounded-3xl p-6 w-[380px] max-w-full transition-all backdrop-blur-xl';
  const buttonClass =
    'rounded-full p-2 bg-white/30 dark:bg-black/30 hover:bg-white/50 dark:hover:bg-black/50 transition-colors';
  const inputClass =
    'w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 placeholder-gray-500 dark:placeholder-gray-400';
  const selectClass =
    'w-full mb-2 p-2 rounded-2xl bg-white/40 dark:bg-black/30 border border-gray-300 dark:border-gray-700 text-sm';

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70">
        <div className="glass-morphism bg-white/80 dark:bg-black/60 rounded-3xl shadow-2xl p-8 w-full max-w-2xl relative">
          <button onClick={toggleFullScreen} className="absolute top-4 right-4 {buttonClass}"><FiX size={28} /></button>
          <div className="mb-6">
            <h2 className="font-semibold text-2xl mb-2">{data.label}</h2>
            {lastUserMessage && <p className="text-base opacity-60 mb-2">"{lastUserMessage}"</p>}
          </div>
          <div className="overflow-y-auto rounded-2xl bg-white/40 dark:bg-black/30 p-6 min-h-[120px] max-h-[400px] text-lg">
            {lastModelResponse}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={nodeClass}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-cyan-400" />
      <div className="flex justify-between items-center mb-4">
        <div className="font-medium text-base truncate flex-1">{data.label || 'New Chat'}</div>
        <div className="flex gap-2">
          {hasResponse && (
            <button onClick={toggleFullScreen} className={buttonClass} title="Full Screen">
              <FiMaximize2 size={18} />
            </button>
          )}
          <button onClick={handleReset} className={buttonClass} title="Reset Node">
            <FiRefreshCw size={18} />
          </button>
        </div>
      </div>
      {!hasResponse ? (
        <>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className={selectClass}
          >
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          </select>
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={handleInputChange}
              className={inputClass + ' resize-none min-h-[38px] max-h-[80px]'}
              placeholder="Type your message..."
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskLLM();
                }
              }}
            />
            <button
              onClick={handleAskLLM}
              disabled={isLoading || !input.trim()}
              className={buttonClass + ' bg-blue-500/70 hover:bg-blue-600/80 text-white disabled:opacity-50 disabled:cursor-not-allowed'}
            >
              {isLoading ? <span className="animate-spin h-5 w-5 block border-2 border-t-transparent border-white rounded-full" /> : <FiSend size={20} />}
            </button>
          </div>
        </>
      ) : (
        <div className="relative">
          <div className="max-h-[120px] overflow-y-auto mb-2 text-base whitespace-pre-wrap rounded-2xl bg-white/40 dark:bg-black/30 p-4">
            {lastModelResponse}
          </div>
          <button
            onClick={handleBranch}
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 {buttonClass} bg-purple-500/70 hover:bg-purple-600/80 text-white shadow-lg"
            title="Branch Chat"
          >
            <FiPlus size={18} />
          </button>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-cyan-400" />
    </div>
  );
}

export default memo(CustomChatNode); 