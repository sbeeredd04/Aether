'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useChatStore, CustomNodeData } from '../store/chatStore';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FiPlay, FiGitBranch } from 'react-icons/fi';
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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, prompt }),
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
    logger.error('Error fetching stream:', { error });
    onError(error);
  } finally {
    onStreamEnd();
  }
}

function CustomChatNode({ id, data }: { id: string; data: CustomNodeData }) {
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { addMessageToNode, createNodeAndEdge, getPathToNode } = useChatStore();

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
        console.error('Error streaming LLM response:', error);
        addMessageToNode(id, { role: 'model', content: 'Error: Could not get response.' });
        setIsLoading(false);
        logger.error(`LLM response error for node ${id}`, { error });
      }
    );
  }, [id, input, addMessageToNode, getPathToNode]);

  const handleBranch = useCallback(() => {
    logger.info(`Branching from node ${id}`);
    createNodeAndEdge(id, 'New Branch', 'branch');
  }, [id, createNodeAndEdge]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300 w-96 dark:bg-gray-800 dark:border-gray-700">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-teal-500" />
      <div className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">{data.label}</div>
      <div className="max-h-60 overflow-y-auto mb-4 border p-2 rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
        {data.chatHistory.map((msg, index) => (
          <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-blue-600' : 'text-gray-800 dark:text-gray-200'}`}>
            <strong className="font-semibold">{msg.role === 'user' ? 'You:' : 'AI:'}</strong>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {msg.content.split('```').map((part, i) =>
                i % 2 === 1 ? (
                  <SyntaxHighlighter key={i} language="javascript" style={vscDarkPlus} customStyle={{ margin: '0', padding: '0.5rem' }}>
                    {part}
                  </SyntaxHighlighter>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-gray-500 italic dark:text-gray-400">AI is thinking...</div>}
      </div>
      <textarea
        value={input}
        onChange={handleInputChange}
        className="w-full p-2 border rounded-md mb-2 resize-y bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
        placeholder="Type your message..."
        rows={3}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAskLLM();
          }
        }}
      />
      <div className="flex justify-between gap-2">
        <button
          onClick={handleAskLLM}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          disabled={isLoading}
        >
          <FiPlay /> Ask LLM
        </button>
        <button
          onClick={handleBranch}
          className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
          disabled={isLoading}
        >
          <FiGitBranch /> Branch
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-teal-500" />
    </div>
  );
}

export default memo(CustomChatNode); 