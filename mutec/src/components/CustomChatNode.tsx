'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, Node, Edge } from '@xyflow/react';
import { useChatStore, CustomNodeData, ChatMessage } from '../store/chatStore';
import { FiPlus, FiRefreshCw, FiTrash2, FiFileText } from 'react-icons/fi';
import { SiGooglegemini } from 'react-icons/si';
import logger from '@/utils/logger';
import { MarkdownRenderer, hasMarkdown } from '../utils/markdown';
import CopyButton from './CopyButton';

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

function CustomChatNode({ id, data }: { id: string; data: CustomNodeData & { isLoading?: boolean } }) {
  const isLoading = data.isLoading ?? false;
  const [input, setInput] = useState<string>('');
  const { 
    addMessageToNode, 
    createNodeAndEdge, 
    resetNode, 
    deleteNodeAndDescendants,
    sendMessageToNode,
    initializeChatManager
  } = useChatStore();
  const setActiveNodeId = useChatStore(s => s.setActiveNodeId);
  const activeNodeId = useChatStore(s => s.activeNodeId);
  const activePath = useChatStore(s => s.activePath);
  const nodes = useChatStore(s => s.nodes);
  const edges = useChatStore(s => s.edges);
  const isActive = activeNodeId === id;
  const isInActivePath = activePath.nodeIds.includes(id);
  const nodeRef = useRef<HTMLDivElement>(null);
  const isRootNode = id === 'root';

  // Initialize chat manager when component mounts
  useEffect(() => {
    const savedSettings = localStorage.getItem('mutec-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.apiKey) {
        initializeChatManager(settings.apiKey);
      }
    }
  }, [initializeChatManager]);

  // Set node as active when clicked
  useEffect(() => {
    if (isActive && nodeRef.current) {
      nodeRef.current.focus();
    }
  }, [isActive]);

  const hasResponse = data.chatHistory.some(msg => msg.role === 'model');
  const lastModelResponse = data.chatHistory.find(msg => msg.role === 'model')?.content || '';
  const lastUserMessage = data.chatHistory.find(msg => msg.role === 'user')?.content || '';
  const lastModelMessage = data.chatHistory.slice().reverse().find(msg => msg.role === 'model');
  const responseHasMarkdown = hasResponse && hasMarkdown(lastModelResponse);
  const lastMessageHasAttachments = lastModelMessage?.attachments && lastModelMessage.attachments.length > 0;

  const handleInputChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(evt.target.value);
  };

  const handleAskLLM = useCallback(async () => {
    if (!input.trim()) return;
    
    const userMessage: ChatMessage = { role: 'user', content: input };
    addMessageToNode(id, userMessage);
    setInput('');
    
    try {
      await sendMessageToNode(id, input);
    } catch (error: any) {
      addMessageToNode(id, { 
        role: 'model', 
        content: `Error: ${error.message || error}`,
        modelId: 'error' // Mark error messages
      });
    }
  }, [id, input, addMessageToNode, sendMessageToNode]);

  const handleBranch = useCallback(() => {
    const newNodeId = createNodeAndEdge(id, 'New Chat', 'branch');
    logger.info('CustomChatNode: Branch created', { 
      sourceNodeId: id, 
      newNodeId 
    });
  }, [id, createNodeAndEdge]);

  const handleReset = useCallback(() => {
    resetNode(id);
  }, [id, resetNode]);

  const handleDelete = useCallback(() => {
    deleteNodeAndDescendants(id);
  }, [id, deleteNodeAndDescendants]);

  const handleNodeClick = (e: React.MouseEvent) => {
    logger.info('CustomChatNode: Node clicked', { 
      nodeId: id,
      isRootNode,
      previousActiveNode: activeNodeId,
      chatHistoryLength: data.chatHistory.length,
      hasResponse
    });
    setActiveNodeId(id);
  };

  // Helper for model name (default Gemini)
  const getModelName = () => 'Gemini 2.0 Flash';
  const isGeminiModel = (model?: string) => (model || 'gemini-2.0-flash').toLowerCase().includes('gemini');

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

  // Loading dots animation
  const LoadingDots = () => (
    <span className="flex gap-1 items-center h-6">
      <span className="bg-white/80 rounded-full w-2 h-2 animate-bounce [animation-delay:0ms]"></span>
      <span className="bg-white/60 rounded-full w-2 h-2 animate-bounce [animation-delay:150ms]"></span>
      <span className="bg-white/40 rounded-full w-2 h-2 animate-bounce [animation-delay:300ms]"></span>
    </span>
  );

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
        <div className="font-medium text-base truncate flex-1 text-white group relative">
          <div className="flex items-center gap-2">
            {isRootNode ? (
              <span className="text-purple-400">Root Node</span>
            ) : (
              <>
                <span className="text-white/90">{data.label || 'New Chat'}</span>
                {data.chatHistory.length > 0 && (
                  <span className="text-xs text-white/50">
                    ({data.chatHistory.length} messages)
                  </span>
                )}
              </>
            )}
          </div>
          {/* Tooltip for long titles */}
          {data.label && data.label.length > 30 && (
            <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-black/90 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal max-w-[300px] z-50">
              {data.label}
            </div>
          )}
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
          {lastMessageHasAttachments && (
            <div className="mb-2 flex flex-wrap gap-1">
              {lastModelMessage?.attachments?.map((att, idx) => (
                <div key={idx} className="relative">
                  {att.type.startsWith('image/') ? (
                    <img 
                      src={att.previewUrl || `data:${att.type};base64,${att.data}`}
                      alt={att.name}
                      className="h-12 w-12 object-cover rounded cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => window.open(att.previewUrl || `data:${att.type};base64,${att.data}`, '_blank')}
                    />
                  ) : att.type.startsWith('audio/') ? (
                    <div className="flex items-center gap-1 bg-neutral-800/50 rounded px-2 py-1">
                      <FiFileText size={12} />
                      <span className="text-xs text-white/80">{att.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-neutral-800/50 rounded px-2 py-1">
                      <FiFileText size={12} />
                      <span className="text-xs text-white/80">{att.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="max-h-[120px] overflow-y-auto mb-2 text-sm whitespace-pre-wrap rounded-xl bg-neutral-900/30 p-3 text-white scrollbar-thin scrollbar-thumb-white/70 scrollbar-track-transparent relative"
            style={{ scrollbarColor: 'rgba(255,255,255,0.7) transparent', scrollbarWidth: 'thin' }}
          >
            {responseHasMarkdown ? (
              <div className="markdown-content text-sm">
                <MarkdownRenderer content={lastModelResponse} />
              </div>
            ) : (
              <>{lastModelResponse}</>
            )}
            
            {/* Copy button for model responses */}
            {hasResponse && !isLoading && (
              <div className="absolute top-2 right-2">
                <CopyButton 
                  content={lastModelResponse} 
                  size={14} 
                  className="opacity-60 hover:opacity-100"
                />
              </div>
            )}
            
            {/* Gemini logo at bottom right if Gemini model */}
            {isGeminiModel() && (
              <div className="absolute bottom-2 right-2 group" title={getModelName()}>
                <span className="group-hover:scale-110 transition-transform cursor-pointer">
                  <SiGooglegemini size={20} className="text-blue-300 drop-shadow-md" />
                </span>
              </div>
            )}
            {/* Loading animation if isLoading */}
            {isLoading && (
              <div className="absolute bottom-2 left-2">
                <LoadingDots />
              </div>
            )}
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