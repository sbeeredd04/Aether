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

// Function to fetch and process the stream
async function fetchStream(
  history: any,
  prompt: string,
  onStreamUpdate: (chunk: string) => void,
  onStreamEnd: () => void,
  onError: (error: any) => void
) {
  try {
    const savedSettings = localStorage.getItem('mutec-settings');
    if (!savedSettings) {
        throw new Error("API key not found. Please set it in the settings panel.");
    }
    const settings = JSON.parse(savedSettings);
    const apiKey = settings.apiKey;

    if (!apiKey) {
        throw new Error("API key is empty. Please set it in the settings panel.");
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, prompt, apiKey }),
    });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    logger.debug('Starting to read stream from API.');

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        logger.debug('Stream finished.');
        break;
      }

      const decodedChunk = decoder.decode(value, { stream: true });
      const lines = decodedChunk.split('\\n\\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.substring(6));
            if (json.text) {
              onStreamUpdate(json.text);
            }
          } catch (e) {
            // Ignore parsing errors for incomplete JSON chunks
          }
        }
      }
    }
  } catch (error) {
    // Modify the error handling to display a more user-friendly message
    if (error instanceof Error) {
        onError(error.message);
    } else {
        onError("An unknown error occurred while fetching the stream.");
    }
    logger.error('Error fetching stream:', { error });
  } finally {
    onStreamEnd();
  }
}

function LoadingDots() {
  return (
    <div className="loading-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
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

    logger.info(`Asking LLM for node ${id}`, { prompt: input });
    setIsLoading(true);
    const userMessage: ChatMessage = { role: 'user', content: input };
    addMessageToNode(id, userMessage);
    setInput('');

    const pathMessages = getPathToNode(id);
    const history = pathMessages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    logger.debug(`Context for node ${id}:`, { history });

    let fullResponse = '';
    await fetchStream(
      history,
      input,
      (chunk) => {
        fullResponse += chunk;
        const modelMessage: ChatMessage = { role: 'model', content: fullResponse };
        addMessageToNode(id, modelMessage, true);
      },
      () => {
        const finalModelMessage: ChatMessage = { role: 'model', content: fullResponse };
        addMessageToNode(id, finalModelMessage, false);
        setIsLoading(false);
      },
      (error) => {
        addMessageToNode(id, { role: 'model', content: `Error: ${error}` });
        setIsLoading(false);
      }
    );
  }, [id, input, addMessageToNode, getPathToNode]);

  const handleBranch = useCallback(() => {
    logger.info(`Branching from node ${id}`);
    createNodeAndEdge(id, 'New Chat', 'branch');
  }, [id, createNodeAndEdge]);

  const handleReset = useCallback(() => {
    resetNode(id);
  }, [id, resetNode]);

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  if (isFullScreen) {
    return (
      <div className="modal-fullscreen">
        <div className="modal-content glass-morphism">
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg">{data.label}</h2>
              {lastUserMessage && (
                <p className="text-sm opacity-60">"{lastUserMessage}"</p>
              )}
            </div>
            <button 
              onClick={toggleFullScreen} 
              className="p-2 rounded-full hover:bg-white hover:bg-opacity-20"
            >
              <FiX size={24} />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto rounded-lg bg-black bg-opacity-20 p-6">
            {lastModelResponse}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-morphism p-4 rounded-xl shadow-lg w-96">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-cyan-400" />
      
      <div className="flex justify-between items-center mb-3">
        <div className="font-medium text-sm truncate flex-1">{data.label || 'New Chat'}</div>
        <div className="flex gap-2">
          {hasResponse && (
            <button 
              onClick={toggleFullScreen}
              className="p-1 rounded-full hover:bg-white hover:bg-opacity-20"
              title="Full Screen"
            >
              <FiMaximize2 size={14} />
            </button>
          )}
          <button
            onClick={handleReset}
            className="p-1 rounded-full hover:bg-white hover:bg-opacity-20"
            title="Reset Node"
          >
            <FiRefreshCw size={14} />
          </button>
        </div>
      </div>

      {!hasResponse ? (
        <>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full mb-2 p-2 rounded bg-black bg-opacity-20 border border-gray-700 text-sm"
          >
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          </select>
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={handleInputChange}
              className="flex-1 p-2 h-[38px] min-h-[38px] max-h-[38px] rounded bg-black bg-opacity-20 border border-gray-700 resize-none"
              placeholder="Type your message..."
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
              className="px-3 rounded bg-blue-500 bg-opacity-50 hover:bg-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingDots /> : <FiSend size={16} />}
            </button>
          </div>
        </>
      ) : (
        <div className="relative">
          <div className="max-h-[100px] overflow-y-auto mb-2 text-sm whitespace-pre-wrap rounded bg-black bg-opacity-20 p-3">
            {lastModelResponse}
          </div>
          <button
            onClick={handleBranch}
            className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 p-1.5 rounded-full bg-purple-500 bg-opacity-50 hover:bg-opacity-75 shadow-lg"
          >
            <FiPlus size={14} />
          </button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-cyan-400" />
    </div>
  );
}

export default memo(CustomChatNode); 