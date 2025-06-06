'use client';

import React, { useEffect, useRef } from 'react';
import { FiRefreshCw, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import { CustomNodeData, useChatStore, ChatMessage } from '../store/chatStore';

interface NodeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  data: CustomNodeData | null;
  nodeId: string | null;
  isRootNode: boolean;
  onReset: () => void;
  onDelete: () => void;
  onBranch: () => void;
  width?: number;
}

export default function NodeSidebar({
  isOpen,
  onClose,
  data,
  nodeId,
  isRootNode,
  onReset,
  onDelete,
  onBranch,
  width = 384
}: NodeSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { getPathToNode, nodes, edges } = useChatStore();
  
  // Get all messages in the conversation thread from root to current node
  const threadMessages = nodeId ? getFullConversationThread(nodeId) : [];
  
  function getFullConversationThread(targetNodeId: string): ChatMessage[] {
    // First get all nodes in the path from root to target
    const pathNodeIds = getPathFromRootToNode(targetNodeId);
    
    // Then collect all messages from these nodes in order
    const allMessages: ChatMessage[] = [];
    pathNodeIds.forEach(id => {
      const node = nodes.find(n => n.id === id);
      if (node && node.data.chatHistory) {
        allMessages.push(...node.data.chatHistory);
      }
    });
    
    return allMessages;
  }
  
  function getPathFromRootToNode(targetId: string): string[] {
    const path: string[] = [];
    let currentId: string | undefined = targetId;
    const incoming = new Map<string, string>();
    
    // Build map of target -> source relationships
    edges.forEach(e => incoming.set(e.target, e.source));
    
    // Traverse up the tree to root
    while (currentId) {
      path.unshift(currentId); // Add to beginning of array
      currentId = incoming.get(currentId);
      if (!currentId) break;
    }
    
    return path;
  }
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadMessages.length]);

  if (!isOpen || !data) return null;

  const hasResponse = data.chatHistory.some(msg => msg.role === 'model');

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/10 flex-shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-medium text-xl text-white">{data.label || 'New Chat'}</h2>
          <button 
            onClick={onClose} 
            className="hover:text-white text-gray-300 transition-colors"
            title="Close"
          >
            <FiX size={20} />
          </button>
        </div>
        
        <div className="flex gap-4">
          {hasResponse && (
            <button 
              onClick={onBranch} 
              className="text-purple-300 hover:text-purple-200 flex items-center gap-1"
              title="Branch Chat"
            >
              <FiPlus size={16} /> Branch
            </button>
          )}
          <button 
            onClick={onReset} 
            className="text-blue-300 hover:text-blue-200 flex items-center gap-1" 
            title="Reset Node"
          >
            <FiRefreshCw size={16} /> Reset
          </button>
          {!isRootNode && (
            <button 
              onClick={onDelete} 
              className="text-red-300 hover:text-red-200 flex items-center gap-1" 
              title="Delete Node"
            >
              <FiTrash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        {threadMessages.length > 0 ? (
          threadMessages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`p-4 rounded-xl ${
                msg.role === 'user' 
                  ? 'bg-blue-900/20 border border-blue-800/30' 
                  : 'bg-neutral-900/40 border border-neutral-700/30'
              }`}
            >
              <div className="text-xs font-medium mb-1 text-gray-400">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="whitespace-pre-wrap text-white">{msg.content}</div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-8">
            No messages in this conversation yet
          </div>
        )}
      </div>
    </div>
  );
} 