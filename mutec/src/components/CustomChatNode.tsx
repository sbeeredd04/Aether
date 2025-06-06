'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useChatStore, CustomNodeData } from '../store/chatStore';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FiMessageSquare, FiPlus, FiMaximize, FiX } from 'react-icons/fi';
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

function CustomChatNode({ id, data }: { id: string; data: CustomNodeData }) {
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const { addMessageToNode, createNodeAndEdge, getPathToNode } = useChatStore();

  const hasResponse = data.chatHistory.some(msg => msg.role === 'model');

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
    let lastMessageId: string | null = null;

    await fetchStream(
      history,
      input,
      (chunk) => {
        fullResponse += chunk;
        const modelMessage: ChatMessage = { role: 'model', content: fullResponse };
        addMessageToNode(id, modelMessage, true);
        logger.debug(`Stream chunk received for node ${id}`, { chunk });
      },
      () => {
        const finalModelMessage: ChatMessage = { role: 'model', content: fullResponse };
        addMessageToNode(id, finalModelMessage, false);
        setIsLoading(false);
        logger.info(`LLM response finished for node ${id}`);
      },
      (error) => {
        // The error object here is now a string message
        addMessageToNode(id, { role: 'model', content: `Error: ${error}` });
        setIsLoading(false);
        logger.error(`LLM response error for node ${id}`, { error });
      }
    );
  }, [id, input, addMessageToNode, getPathToNode]);

  const handleBranch = useCallback(() => {
    logger.info(`Branching from node ${id}`);
    createNodeAndEdge(id, 'New Branch', 'branch');
  }, [id, createNodeAndEdge]);

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
        <div className="glass-morphism rounded-lg shadow-lg w-3/4 h-3/4 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">{data.label}</h2>
            <button onClick={toggleFullScreen} className="p-2 rounded-full hover:bg-white hover:bg-opacity-20">
              <FiX size={24} />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto p-2 rounded bg-black bg-opacity-20">
            {data.chatHistory.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-blue-300' : 'text-gray-200'}`}>
                <strong className="font-semibold">{msg.role === 'user' ? 'You:' : 'AI:'}</strong>
                <div className="prose prose-sm prose-invert max-w-none">
                  {msg.content.split('```').map((part, i) =>
                    i % 2 === 1 ? (
                      <SyntaxHighlighter key={i} language="javascript" style={vscDarkPlus} customStyle={{ margin: '0', padding: '0.5rem', background: '#1e1e1e' }}>
                        {part}
                      </SyntaxHighlighter>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-morphism p-4 rounded-xl shadow-lg w-96 text-white">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-cyan-400" />
      <div className="flex justify-between items-center mb-2">
        <div className="font-bold text-lg">{data.label}</div>
        <button onClick={toggleFullScreen} className="p-1 rounded-full hover:bg-white hover:bg-opacity-20">
            <FiMaximize size={16} />
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto mb-4 p-2 rounded bg-black bg-opacity-20">
        {data.chatHistory.map((msg, index) => (
          <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-blue-300' : 'text-gray-200'}`}>
            <strong className="font-semibold">{msg.role === 'user' ? 'You:' : 'AI:'}</strong>
            <div className="prose prose-sm prose-invert max-w-none">
              {msg.content.split('```').map((part, i) =>
                i % 2 === 1 ? (
                  <SyntaxHighlighter key={i} language="javascript" style={vscDarkPlus} customStyle={{ margin: '0', padding: '0.5rem', background: '#1e1e1e' }}>
                    {part}
                  </SyntaxHighlighter>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-gray-400 italic">AI is thinking...</div>}
      </div>
      
      {!hasResponse && (
        <>
            <textarea
                value={input}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md mb-2 resize-y bg-black bg-opacity-20 border-gray-600 placeholder-gray-400"
                placeholder="Type your message..."
                rows={3}
                onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAskLLM();
                }
                }}
            />
            <button
                onClick={handleAskLLM}
                className="w-full px-4 py-2 bg-blue-500 bg-opacity-50 text-white rounded-md hover:bg-opacity-75 disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={isLoading}
            >
                <FiMessageSquare /> Ask
            </button>
        </>
      )}

      {hasResponse && (
        <button
          onClick={handleBranch}
          className="w-full mt-2 px-4 py-2 bg-purple-500 bg-opacity-50 text-white rounded-md hover:bg-opacity-75 disabled:opacity-50 flex items-center justify-center gap-2"
          disabled={isLoading}
        >
          <FiPlus /> New Branch
        </button>
      )}
      
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-cyan-400" />
    </div>
  );
}

export default memo(CustomChatNode); 