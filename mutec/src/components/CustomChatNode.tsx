'use client';

import React, { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, Node, Edge } from '@xyflow/react';
import { useChatStore, CustomNodeData } from '../store/chatStore';
import { FiSend, FiPlus, FiMaximize2, FiX, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
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
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const { addMessageToNode, createNodeAndEdge, getPathToNode, resetNode, deleteNodeAndDescendants } = useChatStore();
  const setActiveNodeId = useChatStore(s => s.setActiveNodeId);
  const activeNodeId = useChatStore(s => s.activeNodeId);
  const nodes = useChatStore(s => s.nodes);
  const edges = useChatStore(s => s.edges);
  const pathNodeIds = activeNodeId ? getPathNodeIds(nodes, edges, activeNodeId) : [];
  const isActive = activeNodeId === id;
  const isPath = pathNodeIds.includes(id);

  // Resizing state
  const [size, setSize] = useState({ width: 420, height: 180 });
  const resizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 420, height: 180 });

  const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    resizing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { ...size };
    document.addEventListener('mousemove', onResizeMouseMove as EventListener);
    document.addEventListener('mouseup', onResizeMouseUp as EventListener);
  };
  const onResizeMouseMove = (e: MouseEvent) => {
    if (!resizing.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    setSize({
      width: Math.max(320, Math.min(700, startSize.current.width + dx)),
      height: Math.max(120, Math.min(600, startSize.current.height + dy)),
    });
  };
  const onResizeMouseUp = () => {
    resizing.current = false;
    document.removeEventListener('mousemove', onResizeMouseMove as EventListener);
    document.removeEventListener('mouseup', onResizeMouseUp as EventListener);
  };

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

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  // Responsive node class
  const nodeClass =
    `glass-morphism bg-white/60 dark:bg-black/40 border border-white/30 dark:border-black/30 shadow-2xl rounded-3xl p-6 transition-all backdrop-blur-xl ` +
    (isActive ? 'ring-2 ring-blue-400 dark:ring-blue-600 ' : '') +
    (isPath && !isActive ? 'border-2 border-gradient-to-r from-blue-400 via-blue-300 to-blue-500 dark:from-blue-600 dark:to-blue-400 ' : '');
  const buttonClass =
    'rounded-full p-2 bg-white/30 dark:bg-black/30 hover:bg-white/50 dark:hover:bg-black/50 transition-colors';
  const inputClass =
    'w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 placeholder-gray-500 dark:placeholder-gray-400';
  const selectClass =
    'w-full mb-2 p-2 rounded-2xl bg-white/40 dark:bg-black/30 border border-gray-300 dark:border-gray-700 text-sm';

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70">
        <div className={nodeClass + ' max-w-2xl w-full p-10'} style={{ position: 'relative' }}>
          <button onClick={toggleFullScreen} className="absolute top-4 right-4 {buttonClass}"><FiX size={28} /></button>
          <div className="flex justify-between items-center mb-4">
            <div className="font-medium text-2xl truncate flex-1">{data.label || 'New Chat'}</div>
            <div className="flex gap-2">
              <button onClick={handleReset} className={buttonClass} title="Reset Node">
                <FiRefreshCw size={22} />
              </button>
              <button onClick={handleDelete} className={buttonClass + ' bg-red-500/70 hover:bg-red-600/80 text-white'} title="Delete Node">
                <FiTrash2 size={22} />
              </button>
            </div>
          </div>
          {hasResponse ? (
            <div className="relative">
              <div className="max-h-[320px] overflow-y-auto mb-2 text-lg whitespace-pre-wrap rounded-2xl bg-white/40 dark:bg-black/30 p-6">
                {lastModelResponse}
              </div>
              <button
                onClick={handleBranch}
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 {buttonClass} bg-purple-500/70 hover:bg-purple-600/80 text-white shadow-lg"
                title="Branch Chat"
              >
                <FiPlus size={22} />
              </button>
            </div>
          ) : null}
          {/* Resizer handle (bottom right) */}
          <div
            style={{ position: 'absolute', right: 8, bottom: 8, width: 18, height: 18, cursor: 'nwse-resize', zIndex: 10 }}
            title="Resize node"
            onMouseDown={onResizeMouseDown}
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><polyline points="4,18 18,18 18,4" fill="none" stroke="#888" strokeWidth="2" /></svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={nodeClass}
      onClick={() => setActiveNodeId(id)}
      tabIndex={0}
      style={{ position: 'relative', width: size.width, height: size.height, minWidth: 320, minHeight: 120, maxWidth: 700, maxHeight: 600 }}
    >
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
          <button onClick={handleDelete} className={buttonClass + ' bg-red-500/70 hover:bg-red-600/80 text-white'} title="Delete Node">
            <FiTrash2 size={18} />
          </button>
        </div>
      </div>
      {hasResponse ? (
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
      ) : null}
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-cyan-400" />
      {/* Resizer handle (bottom right) */}
      <div
        style={{ position: 'absolute', right: 8, bottom: 8, width: 18, height: 18, cursor: 'nwse-resize', zIndex: 10 }}
        title="Resize node"
        onMouseDown={onResizeMouseDown}
      >
        <svg width="18" height="18" viewBox="0 0 18 18"><polyline points="4,18 18,18 18,4" fill="none" stroke="#888" strokeWidth="2" /></svg>
      </div>
    </div>
  );
}

export default memo(CustomChatNode); 