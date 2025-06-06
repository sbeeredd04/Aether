'use client';

import React from 'react';
import { FiRefreshCw, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import { CustomNodeData } from '../store/chatStore';

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
  if (!isOpen || !data) return null;

  const hasResponse = data.chatHistory.some(msg => msg.role === 'model');

  return (
    <div 
      className="h-full overflow-y-auto"
    >
      <div className="p-6">
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
        
        <div className="flex gap-4 mb-6">
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
        
        <div className="space-y-4">
          {data.chatHistory.map((msg, idx) => (
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
          ))}
        </div>
      </div>
    </div>
  );
} 