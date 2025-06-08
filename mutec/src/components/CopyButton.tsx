'use client';

import React, { useState } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { useChatStore } from '../store/chatStore';

interface CopyButtonProps {
  content: string;
  className?: string;
  size?: number;
}

export default function CopyButton({ content, className = '', size = 16 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { copyToClipboard } = useChatStore();

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await copyToClipboard(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center p-1 rounded transition-colors hover:bg-white/10 ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      aria-label={copied ? 'Copied to clipboard' : 'Copy content to clipboard'}
    >
      {copied ? (
        <FiCheck size={size} className="text-green-400" />
      ) : (
        <FiCopy size={size} className="text-white/60 hover:text-white" />
      )}
    </button>
  );
} 