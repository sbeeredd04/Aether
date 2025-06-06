'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, Node, Edge } from '@xyflow/react';
import { useChatStore, CustomNodeData } from '../store/chatStore';
import { FiSend, FiPlus, FiMaximize2, FiX, FiRefreshCw, FiTrash2, FiHome } from 'react-icons/fi';
import NodeModal from './NodeModal';
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
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const { addMessageToNode, createNodeAndEdge, getPathToNode, resetNode, deleteNodeAndDescendants } = useChatStore();
  const setActiveNodeId = useChatStore(s => s.setActiveNodeId);
  const activeNodeId = useChatStore(s => s.activeNodeId);
  const nodes = useChatStore(s => s.nodes);
  const edges = useChatStore(s => s.edges);
  const pathNodeIds = activeNodeId ? getPathNodeIds(nodes, edges, activeNodeId) : [];
  const isActive = activeNodeId === id;
  const isPath = pathNodeIds.includes(id);
  const nodeRef = useRef<HTMLDivElement>(null);
  const isRootNode = id === 'root';

  // Resizing state
  const [size, setSize] = useState({ width: 450, height: 200 });
  const resizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 450, height: 200 });
  const isResizing = useRef(false);

  // Set node as active when clicked
  useEffect(() => {
    if (isActive && nodeRef.current) {
      nodeRef.current.focus();
    }
  }, [isActive]);

  const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    isResizing.current = true;
    resizing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { ...size };
    
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      setSize({
        width: Math.max(350, Math.min(800, startSize.current.width + dx)),
        height: Math.max(140, Math.min(600, startSize.current.height + dy)),
      });
    };
    
    const onMouseUp = () => {
      resizing.current = false;
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleNodeClick = (e: React.MouseEvent) => {
    if (!isResizing.current) {
      setActiveNodeId(id);
    }
  };

  // Responsive node class
  const nodeClass = `
    backdrop-blur-sm 
    ${isActive ? 'bg-neutral-900/30' : 'bg-black/0'}
    border border-white/10
    shadow-lg 
    rounded-xl 
    p-4 
    transition-all 
    ${isActive ? 'ring-1 ring-neutral-500' : ''} 
    ${isPath && !isActive ? 'border-neutral-500/30' : ''}
  `;
  
  const iconButtonClass = 'hover:text-white text-gray-300 transition-colors';
  const inputClass = 'w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500 placeholder-gray-400';
  const selectClass = 'w-full mb-2 p-2 rounded-xl bg-black/20 border border-white/10 text-sm';

  return (
    <>
      <div
        ref={nodeRef}
        className={nodeClass}
        onClick={handleNodeClick}
        tabIndex={0}
        style={{ 
          position: 'relative', 
          width: size.width, 
          height: size.height, 
          minWidth: 350, 
          minHeight: 140, 
          maxWidth: 800, 
          maxHeight: 600 
        }}
      >
        <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-neutral-400" />
        <div className="flex justify-between items-center mb-3">
          <div className="font-medium text-base truncate flex-1 text-white">{data.label || 'New Chat'}</div>
          <div className="flex gap-2">
            {hasResponse && (
              <>
                <button 
                  onClick={handleBranch} 
                  className={iconButtonClass}
                  title="Branch Chat"
                >
                  <FiPlus size={16} />
                </button>
                <button onClick={openModal} className={iconButtonClass} title="Full Screen">
                  <FiMaximize2 size={16} />
                </button>
              </>
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
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-neutral-400" />
        {/* Resizer handle (bottom right) */}
        <div
          style={{ 
            position: 'absolute', 
            right: 4, 
            bottom: 4, 
            width: 16, 
            height: 16, 
            cursor: 'nwse-resize', 
            zIndex: 10,
            opacity: 0.7
          }}
          title="Resize node"
          onMouseDown={onResizeMouseDown}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <polyline points="4,16 16,16 16,4" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <NodeModal
        isOpen={isModalOpen}
        onClose={closeModal}
        data={data}
        nodeId={id}
        isRootNode={isRootNode}
        onReset={handleReset}
        onDelete={handleDelete}
        onBranch={handleBranch}
        onGoToRoot={() => setActiveNodeId('root')}
      />
    </>
  );
}

export default memo(CustomChatNode); 