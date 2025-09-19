'use client';

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, Node, Edge } from '@xyflow/react';
import { useChatStore, CustomNodeData } from '../store/chatStore';
import { FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import logger from '@/utils/logger';

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

function CustomChatNode({ id, data }: { id: string; data: CustomNodeData & { isLoading?: boolean; isMobile?: boolean } }) {
  const isMobile = data.isMobile ?? false;
  const { 
    createNodeAndEdge, 
    resetNode, 
    deleteNodeAndDescendants
  } = useChatStore();
  const setActiveNodeId = useChatStore(s => s.setActiveNodeId);
  const activeNodeId = useChatStore(s => s.activeNodeId);
  const activePath = useChatStore(s => s.activePath);
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

  const handleBranch = useCallback(() => {
    const newNodeId = createNodeAndEdge(id, 'New Chat', 'branch');
    setActiveNodeId(newNodeId); // Set the new branch as active
    logger.info('CustomChatNode: Branch created and set as active', { 
      sourceNodeId: id, 
      newNodeId 
    });
  }, [id, createNodeAndEdge, setActiveNodeId]);

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
  
  const iconButtonClass = 'hover:text-white text-gray-300 transition-colors p-2 rounded-lg hover:bg-white/10 transition-all';

  return (
    <div
      ref={nodeRef}
      className={nodeClass}
      onClick={handleNodeClick}
      tabIndex={0}
      style={{ 
        position: 'relative', 
        width: isMobile ? 280 : 350,
        height: isMobile ? 120 : 140
      }}
    >
      {/* Root node indicator - glowing circle */}
      {isRootNode && (
        <div className={`absolute ${isMobile ? '-top-8 left-1/2' : '-top-12 left-1/2'} transform -translate-x-1/2 flex flex-col items-center`}>
          <div className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_4px_rgba(168,85,247,0.4)] mb-1`}></div>
          <div className={`w-[2px] ${isMobile ? 'h-3' : 'h-5'} bg-purple-500/50`}></div>
        </div>
      )}
      
      <Handle 
        type="target" 
        position={Position.Top} 
        className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${isInActivePath ? '!bg-purple-400' : '!bg-neutral-400'}`} 
      />
      
      {/* Node Header with Title and Actions */}
      <div className="flex flex-col h-full">
        {/* Title Section */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} text-center text-white group relative`}>
            {isRootNode ? (
              <span className="text-purple-400 font-semibold">Root Node</span>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-white/90 line-clamp-2">{data.label || 'New Chat'}</span>
                {data.chatHistory.length > 0 && (
                  <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-white/50`}>
                    {data.chatHistory.length} messages
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-center items-center gap-2 mt-2">
          {hasResponse && (
            <button 
              onClick={handleBranch} 
              className={iconButtonClass}
              title="Branch Chat"
            >
              <FiPlus size={isMobile ? 16 : 18} />
            </button>
          )}
          <button onClick={handleReset} className={iconButtonClass} title="Reset Node">
            <FiRefreshCw size={isMobile ? 16 : 18} />
          </button>
          {!isRootNode && (
            <button 
              onClick={handleDelete} 
              className="text-red-300 hover:text-red-200 p-2 rounded-lg hover:bg-red-900/20 transition-all" 
              title="Delete Node"
            >
              <FiTrash2 size={isMobile ? 16 : 18} />
            </button>
          )}
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${isInActivePath ? '!bg-purple-400' : '!bg-neutral-400'}`} 
      />
    </div>
  );
}

export default memo(CustomChatNode); 