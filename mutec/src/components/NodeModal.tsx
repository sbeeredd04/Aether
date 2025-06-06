'use client';

import React from 'react';
import { FiX, FiRefreshCw, FiTrash2, FiPlus, FiHome } from 'react-icons/fi';
import { CustomNodeData } from '../store/chatStore';

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CustomNodeData;
  nodeId: string;
  isRootNode: boolean;
  onReset: () => void;
  onDelete: () => void;
  onBranch: () => void;
  onGoToRoot: () => void;
}

export default function NodeModal({
  isOpen,
  onClose,
  data,
  nodeId,
  isRootNode,
  onReset,
  onDelete,
  onBranch,
  onGoToRoot
}: NodeModalProps) {
  if (!isOpen) return null;

  const hasResponse = data.chatHistory.some(msg => msg.role === 'model');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div 
        className="max-w-3xl w-full p-6 rounded-xl backdrop-blur-sm bg-neutral-900/30 border border-white/10 shadow-2xl"
        style={{ position: 'relative', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={onGoToRoot} className="hover:text-white text-gray-300 transition-colors" title="Go to Root">
            <FiHome size={20} />
          </button>
          <button onClick={onClose} className="hover:text-white text-gray-300 transition-colors" title="Close">
            <FiX size={24} />
          </button>
        </div>
        
        <div className="mb-6">
          <h2 className="font-medium text-xl text-white mb-1">{data.label || 'New Chat'}</h2>
          <div className="flex gap-2 mt-3">
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