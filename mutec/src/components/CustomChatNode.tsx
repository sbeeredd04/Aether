'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, Node, Edge } from '@xyflow/react';
import { useChatStore, CustomNodeData } from '../store/chatStore';
import { FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import logger from '@/utils/logger';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

function getPathNodeIds(nodes: Node[], edges: Edge[], targetId: string): string[] {
  // Returns an array of node IDs from root to targetId
  const path: string[] = [];
  let currentId: string | undefined = targetId;
  const incoming = new Map<string, string>();
  edges.forEach(e => incoming.set(e.target, e.source));
  while (currentId) {
    path.unshift(currentId);
    currentId = incoming.get(currentId);
    if (!currentId || currentId === 'root') break;
  }
  if (currentId === 'root') path.unshift('root');
  return path;
}

function CustomChatNode({ id, data }: { id: string; data: CustomNodeData }) {
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const { addMessageToNode, createNodeAndEdge, getPathToNode, resetNode, deleteNodeAndDescendants } = useChatStore();
  const setActiveNodeId = useChatStore(s => s.setActiveNodeId);
  const activeNodeId = useChatStore(s => s.activeNodeId);
  const activePath = useChatStore(s => s.activePath);
  const nodes = useChatStore(s => s.nodes);
  const edges = useChatStore(s => s.edges);
  const isActive = activeNodeId === id;
  const isInActivePath = activePath.nodeIds.includes(id);
  const nodeRef = useRef<HTMLDivElement>(null);
  const isRootNode = id === 'root';

  // Set node as active when clicked
  useEffect(() => {
    if (isActive && nodeRef.current) {
      nodeRef.current.focus();
    }
  }, [isActive]);

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

  const handleDelete = useCallback(() => {
    deleteNodeAndDescendants(id);
  }, [id, deleteNodeAndDescendants]);

  const handleNodeClick = (e: React.MouseEvent) => {
    setActiveNodeId(id);
  };

  // Responsive node class
  const nodeClass = `
    backdrop-blur-sm 
    ${isActive ? 'bg-neutral-900/30' : 'bg-black/0'}
    ${isInActivePath ? 'border-purple-500' : 'border-white/10'}
    border 
    shadow-lg 
    rounded-xl 
    p-4 
    transition-all 
    ${isActive ? 'ring-2 ring-purple-500' : ''} 
    ${isInActivePath && !isActive ? 'ring-1 ring-purple-400/50' : ''}
  `;
  
  const iconButtonClass = 'hover:text-white text-gray-300 transition-colors';

  return (
    <div
      ref={nodeRef}
      className={nodeClass}
      onClick={handleNodeClick}
      tabIndex={0}
      style={{ 
        position: 'relative', 
        width: 450,
        height: 200
      }}
    >
      {/* Root node indicator - glowing circle */}
      {isRootNode && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_4px_rgba(168,85,247,0.4)] mb-1"></div>
          <div className="w-[2px] h-5 bg-purple-500/50"></div>
        </div>
      )}
      
      <Handle 
        type="target" 
        position={Position.Top} 
        className={`w-2 h-2 ${isInActivePath ? '!bg-purple-400' : '!bg-neutral-400'}`} 
      />
      <div className="flex justify-between items-center mb-3">
        <div className="font-medium text-base truncate flex-1 text-white">
          {isRootNode ? 'Root Node' : (data.label || 'New Chat')}
        </div>
        <div className="flex gap-2">
          {hasResponse && (
            <button 
              onClick={handleBranch} 
              className={iconButtonClass}
              title="Branch Chat"
            >
              <FiPlus size={16} />
            </button>
          )}
          <button onClick={handleReset} className={iconButtonClass} title="Reset Node">
            <FiRefreshCw size={16} />
          </button>
          {!isRootNode && (
            <button onClick={handleDelete} className="text-red-300 hover:text-red-200" title="Delete Node">
              <FiTrash2 size={16} />
            </button>
          )}
        </div>
      </div>
      {hasResponse ? (
        <div className="relative">
          <div className="max-h-[120px] overflow-y-auto mb-2 text-sm whitespace-pre-wrap rounded-xl bg-neutral-900/30 p-3 text-white">
            {lastModelResponse}
          </div>
        </div>
      ) : null}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className={`w-2 h-2 ${isInActivePath ? '!bg-purple-400' : '!bg-neutral-400'}`} 
      />
    </div>
  );
}

export default memo(CustomChatNode); 