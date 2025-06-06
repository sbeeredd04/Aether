'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FiRefreshCw, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import { CustomNodeData, useChatStore, ChatMessage } from '../store/chatStore';
import { SiGooglegemini } from 'react-icons/si';

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
  isActiveNodeLoading?: boolean;
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
  width = 384,
  isActiveNodeLoading = false
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
  
  // Auto-scroll to bottom when messages change or loading
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadMessages.length]);

  if (!isOpen || !data) return null;

  const hasResponse = data.chatHistory.some(msg => msg.role === 'model');

  // Helper for model name (default Gemini)
  const getModelName = () => 'Gemini 2.0 Flash';
  const isGeminiModel = (model?: string) => (model || 'gemini-2.0-flash').toLowerCase().includes('gemini');

  // Loading dots animation
  const LoadingDots = () => (
    <span className="flex gap-1 items-center h-6">
      <span className="bg-white/80 rounded-full w-2 h-2 animate-bounce [animation-delay:0ms]"></span>
      <span className="bg-white/60 rounded-full w-2 h-2 animate-bounce [animation-delay:150ms]"></span>
      <span className="bg-white/40 rounded-full w-2 h-2 animate-bounce [animation-delay:300ms]"></span>
    </span>
  );

  return (
    <div className="h-full flex flex-col bg-black/40 rounded-xl border border-white/10 shadow-xl" style={{ width }}>
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-lg text-white truncate group relative">
            {data?.label || 'New Chat'}
            {/* Tooltip for long titles */}
            {data?.label && data.label.length > 30 && (
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-black/90 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal max-w-[300px] z-50">
                {data.label}
              </div>
            )}
          </h2>
          <button onClick={onClose} className="hover:text-white text-gray-300 transition-colors" title="Close">
            <FiX size={20} />
          </button>
        </div>
        {data?.chatHistory.length > 0 && (
          <div className="text-sm text-white/50">
            {data.chatHistory.length} messages in this conversation
          </div>
        )}
      </div>
      <div className="flex gap-3 px-4 py-2 border-b border-white/10 bg-black/20">
        {hasResponse && (
          <button onClick={onBranch} className="text-purple-300 hover:text-purple-200 flex items-center gap-1" title="Branch Chat">
            <FiPlus size={16} /> Branch
          </button>
        )}
        <button onClick={onReset} className="text-blue-300 hover:text-blue-200 flex items-center gap-1" title="Reset Node">
          <FiRefreshCw size={16} /> Reset
        </button>
        {!isRootNode && (
          <button onClick={onDelete} className="text-red-300 hover:text-red-200 flex items-center gap-1" title="Delete Node">
            <FiTrash2 size={16} /> Delete
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-white/80 scrollbar-track-transparent" style={{ scrollbarColor: 'rgba(255,255,255,0.8) transparent', scrollbarWidth: 'thin' }}>
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin scrollbar-thumb-white/80 scrollbar-track-transparent"
          style={{ scrollbarColor: 'rgba(255,255,255,0.8) transparent', scrollbarWidth: 'thin' }}
        >
          {threadMessages.length > 0 ? (
            threadMessages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isModel = msg.role === 'model';
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
                >
                  <div
                    className={`relative max-w-[80%] px-4 py-3 rounded-2xl shadow-md whitespace-pre-wrap text-base font-normal transition-all
                      ${isUser
                        ? 'bg-blue-700/90 text-white border border-blue-400/30 ml-auto'
                        : 'bg-neutral-900/90 text-white border border-neutral-700/40 mr-auto'}
                    `}
                    style={{ minWidth: 60 }}
                  >
                    {/* Gemini logo for model reply */}
                    {isModel && isGeminiModel() && (
                      <div className="absolute -top-5 -left-5 flex items-center" title={getModelName()}>
                        <span className="group-hover:scale-110 transition-transform cursor-pointer">
                          <SiGooglegemini size={22} className="text-blue-300 drop-shadow-md" />
                        </span>
                      </div>
                    )}
                    <div className="text-xs font-semibold mb-1 text-gray-300/80">
                      {isUser ? 'You' : getModelName()}
                    </div>
                    <div>{msg.content}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-400 py-8">No messages in this conversation yet</div>
          )}
          {/* Loading animation for current node */}
          {isActiveNodeLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-3 rounded-2xl shadow-md bg-neutral-900/90 border border-neutral-700/40 flex items-center gap-2">
                <div className="relative">
                  <span className="absolute -top-5 -left-5">
                    <SiGooglegemini size={22} className="text-blue-300 drop-shadow-md" title={getModelName()} />
                  </span>
                </div>
                <LoadingDots />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 