'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FiRefreshCw, FiTrash2, FiPlus, FiX, FiFileText, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { CustomNodeData, useChatStore, ChatMessage } from '../store/chatStore';
import { SiGooglegemini } from 'react-icons/si';
import { MarkdownRenderer, hasMarkdown } from '../utils/markdown';
import AudioPlayer from './AudioPlayer';
import Citations from './Citations';
import CopyButton from './CopyButton';
import logger from '../utils/logger';

interface StreamingState {
  isStreaming: boolean;
  currentThoughts: string;
  currentMessage: string;
  isShowingThoughts: boolean;
  isThinkingPhase: boolean;
  messagePhase: boolean;
  thoughtStartTime?: number;
  thoughtEndTime?: number;
  groundingMetadata?: {
    searchEntryPoint?: {
      renderedContent: string;
    };
    groundingChunks?: Array<{
      web?: {
        uri: string;
        title: string;
      };
    }>;
    groundingSupports?: Array<{
      segment: {
        startIndex?: number;
        endIndex?: number;
        text: string;
      };
      groundingChunkIndices: number[];
      confidenceScores: number[];
    }>;
    webSearchQueries?: string[];
    citations?: Array<{
      title: string;
      uri: string;
      snippet?: string;
      confidenceScore?: number;
    }>;
    loadingMessage?: string;
  };
}

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
  onImageClick?: (imageSrc: string, imageTitle: string) => void;
  isMobile?: boolean;
  streamingState?: StreamingState;
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
  isActiveNodeLoading = false,
  onImageClick,
  isMobile = false,
  streamingState
}: NodeSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { getPathToNode, nodes, edges } = useChatStore();
  const [expandedThoughts, setExpandedThoughts] = useState<Set<number>>(new Set());
  const [thoughtTimings, setThoughtTimings] = useState<Map<number, number>>(new Map());
  
  // Get all messages in the conversation thread from root to current node
  const threadMessages = nodeId ? getFullConversationThread(nodeId) : [];
  
  logger.debug('NodeSidebar: Component render', { 
    isOpen,
    nodeId,
    hasData: !!data,
    threadMessagesCount: threadMessages.length,
    isActiveNodeLoading,
    width,
    isMobile,
    streamingState
  });
  
  function getFullConversationThread(targetNodeId: string): ChatMessage[] {
    logger.debug('NodeSidebar: Getting conversation thread', { targetNodeId });
    
    // First get all nodes in the path from root to target
    const pathNodeIds = getPathFromRootToNode(targetNodeId);
    
    logger.debug('NodeSidebar: Path nodes identified', { 
      targetNodeId,
      pathLength: pathNodeIds.length,
      pathNodeIds
    });
    
    // Then collect all messages from these nodes in order
    const allMessages: ChatMessage[] = [];
    pathNodeIds.forEach((id, index) => {
      const node = nodes.find(n => n.id === id);
      if (node && node.data.chatHistory) {
        allMessages.push(...node.data.chatHistory);
        logger.debug('NodeSidebar: Added messages from node', { 
          nodeId: id,
          nodeIndex: index,
          messagesAdded: node.data.chatHistory.length,
          totalMessages: allMessages.length
        });
      }
    });
    
    logger.debug('NodeSidebar: Conversation thread assembled', { 
      targetNodeId,
      totalMessages: allMessages.length
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
  
  // Auto-scroll to bottom when messages change or streaming state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadMessages.length, streamingState?.currentThoughts, streamingState?.currentMessage]);

  // Track thought timing
  useEffect(() => {
    if (streamingState?.isThinkingPhase && !streamingState.thoughtStartTime) {
      // Record start time when thinking begins
      const startTime = Date.now();
      if (streamingState) {
        streamingState.thoughtStartTime = startTime;
      }
    }
    
    if (streamingState?.messagePhase && streamingState.thoughtStartTime && !streamingState.thoughtEndTime) {
      // Record end time when thinking ends and message phase begins
      const endTime = Date.now();
      if (streamingState) {
        streamingState.thoughtEndTime = endTime;
      }
    }
  }, [streamingState?.isThinkingPhase, streamingState?.messagePhase]);

  // Parse thoughts from model response
  const parseThoughts = (content: string) => {
    const thoughtsIndex = content.indexOf('**Thoughts:**\n');
    const answerIndex = content.indexOf('\n\n---\n\n**Answer:**\n');
    
    if (thoughtsIndex !== -1 && answerIndex !== -1 && answerIndex > thoughtsIndex) {
      const thoughts = content.substring(thoughtsIndex + 14, answerIndex).trim();
      const answer = content.substring(answerIndex + 17).trim();
      return {
        thoughts,
        answer,
        hasThoughts: true
      };
    }
    return {
      thoughts: '',
      answer: content,
      hasThoughts: false
    };
  };

  // Toggle thought expansion
  const toggleThoughts = (messageIndex: number) => {
    setExpandedThoughts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
      }
      return newSet;
    });
  };

  // Check if thoughts are expanded for streaming (separate from completed thoughts)
  const isStreamingThoughtsExpanded = expandedThoughts.has(-1); // Use -1 for streaming thoughts

  // Toggle streaming thoughts expansion
  const toggleStreamingThoughts = () => {
    setExpandedThoughts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(-1)) {
        newSet.delete(-1);
      } else {
        newSet.add(-1);
      }
      return newSet;
    });
  };

  // Clean up markdown content to remove empty list items from thinking models
  const cleanMarkdownContent = (content: string) => {
    if (!content) return content;
    
    // Remove empty list items and their containers
    return content
      .replace(/^\s*[\*\-\+]\s*$/gm, '') // Remove empty bullet points
      .replace(/^\s*\d+\.\s*$/gm, '') // Remove empty numbered list items
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up excessive newlines
      .trim();
  };

  // Check if this is a streaming message (empty or actively being updated)
  const isStreamingMessage = (msg: ChatMessage, index: number) => {
    const isLastMessage = index === threadMessages.length - 1;
    const isModelMessage = msg.role === 'model';
    const isEmpty = !msg.content || msg.content.trim() === '';
    
    return isLastMessage && isModelMessage && (isEmpty || streamingState?.isStreaming);
  };

  // Get streaming content for rendering
  const getStreamingContent = () => {
    if (!streamingState?.isStreaming) return '';
    
    let content = '';
    // Only show the message part in the main content area, thoughts are shown in preview
    if (streamingState.currentMessage) {
      content = streamingState.currentMessage;
    }
    
    return content;
  };

  // Loading dots animation
  const LoadingDots = () => (
    <span className="flex gap-1 items-center h-6">
      <span className="bg-white/80 rounded-full w-2 h-2 animate-bounce [animation-delay:0ms]"></span>
      <span className="bg-white/60 rounded-full w-2 h-2 animate-bounce [animation-delay:150ms]"></span>
      <span className="bg-white/40 rounded-full w-2 h-2 animate-bounce [animation-delay:300ms]"></span>
    </span>
  );

  // Streaming message component with cursor
  const StreamingContent = ({ content }: { content: string }) => {
    if (!content) {
      return (
        <div className="flex items-center gap-2">
          <LoadingDots />
        </div>
      );
    }
    
    const hasMarkdownSyntax = hasMarkdown(content);
    
    return (
      <div className="relative">
        {hasMarkdownSyntax ? (
          <div className="markdown-content font-space-grotesk">
            <MarkdownRenderer content={cleanMarkdownContent(content)} />
          </div>
        ) : (
          <div className="whitespace-pre-wrap font-space-grotesk">{cleanMarkdownContent(content)}</div>
        )}
        <span className="inline-block w-[2px] h-4 bg-white animate-pulse ml-1"></span>
      </div>
    );
  };

  // Extract first lines from streaming thoughts
  const getStreamingThoughtPreviews = (thoughts: string) => {
    if (!thoughts) return [];
    
    // Split thoughts into paragraphs/sections
    const paragraphs = thoughts.split('\n\n').filter(p => p.trim());
    const previews: string[] = [];
    
    for (const paragraph of paragraphs) {
      const lines = paragraph.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        // Take the first line of each paragraph/section
        const firstLine = lines[0].trim();
        
        // Clean up the line - remove markdown formatting, extra spaces
        const cleanLine = firstLine
          .replace(/^\*\*(.+)\*\*$/, '$1') // Remove bold formatting
          .replace(/^\*(.+)\*$/, '$1')     // Remove italic formatting
          .replace(/^#+\s*/, '')          // Remove header markdown
          .trim();
        
        // Only add meaningful lines (not just "I'm" or very short fragments)
        if (cleanLine.length > 5 && !cleanLine.match(/^(I'm|The|This|It|That)\s/)) {
          previews.push(cleanLine);
        } else if (cleanLine.length > 15) {
          // For longer lines starting with common words, still include them
          previews.push(cleanLine);
        }
      }
    }
    
    // If no good previews found, try line-by-line approach
    if (previews.length === 0) {
      const allLines = thoughts.split('\n').filter(line => line.trim());
      for (const line of allLines) {
        const trimmed = line.trim()
          .replace(/^\*\*(.+)\*\*$/, '$1')
          .replace(/^\*(.+)\*$/, '$1')
          .replace(/^#+\s*/, '');
        
        if (trimmed.length > 10 && !trimmed.includes('...')) {
          previews.push(trimmed);
          if (previews.length >= 3) break; // Limit during extraction
        }
      }
    }
    
    return previews.slice(0, 4); // Limit to 4 preview lines max
  };

  // Calculate thought duration
  const getThoughtDuration = (messageIndex: number) => {
    const savedDuration = thoughtTimings.get(messageIndex);
    if (savedDuration) {
      return Math.round(savedDuration / 1000);
    }
    
    // Check if this is a streaming message that just completed
    const isLastMessage = messageIndex === threadMessages.length - 1;
    if (isLastMessage && streamingState?.thoughtStartTime && streamingState?.thoughtEndTime) {
      const duration = streamingState.thoughtEndTime - streamingState.thoughtStartTime;
      const seconds = Math.round(duration / 1000);
      // Save the timing for this message
      setThoughtTimings(prev => new Map(prev).set(messageIndex, duration));
      return seconds;
    }
    
    return 0;
  };

  // Get section title from thoughts (only headers, not paragraphs)
  const getThoughtTitle = (thoughts: string, isStreaming = false) => {
    if (!thoughts) return isStreaming ? 'Starting analysis...' : '';
    
    if (isStreaming) {
      // For streaming, find the LATEST section header (marked with ** or #)
      const lines = thoughts.split('\n').filter(line => line.trim());
      
      // Look for the most recent header (working backwards)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        
        // Check for markdown headers (# or **text**)
        if (line.startsWith('#') || (line.startsWith('**') && line.endsWith('**'))) {
          const cleaned = line
            .replace(/^#+\s*/, '')           // Remove # headers
            .replace(/^\*\*(.+)\*\*$/, '$1') // Remove ** bold formatting
            .trim();
          
          if (cleaned.length > 5 && cleaned.length < 80) { // Reasonable title length
            return cleaned;
          }
        }
      }
      
      // Fallback: look for any line that looks like a title (shorter, meaningful)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.length > 10 && line.length < 60 && !line.includes('.') && !line.startsWith('I')) {
          return line;
        }
      }
      
      return 'Processing...';
    }
    
    // For completed thoughts, we don't show the title anymore - just return empty
    return '';
  };

  // Get streaming completion timing
  const getStreamingThoughtDuration = () => {
    if (streamingState?.thoughtStartTime && streamingState?.thoughtEndTime) {
      const duration = streamingState.thoughtEndTime - streamingState.thoughtStartTime;
      return Math.round(duration / 1000);
    }
    return 0;
  };

  if (!isOpen || !data) return null;

  const hasResponse = data.chatHistory.some(msg => msg.role === 'model');

  // Helper for model name with support for different models
  const getModelName = (modelId?: string) => {
    if (!modelId) return 'Gemini 2.0 Flash';
    
    // You can expand this to support more models
    if (modelId.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash';
    if (modelId.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
    if (modelId.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';
    if (modelId.includes('gpt-4')) return 'GPT-4';
    if (modelId.includes('claude')) return 'Claude';
    
    return modelId; // Fallback to model ID
  };
  
  const isGeminiModel = (modelId?: string) => (modelId || 'gemini-2.0-flash').toLowerCase().includes('gemini');

  return (
    <div 
      className={`h-full flex flex-col ${isMobile ? 'bg-black/60' : 'bg-black/40'} ${
        isMobile ? 'rounded-none' : 'rounded-xl'
      } border border-white/10 shadow-xl sidebar-space-grotesk`} 
      style={{ width }}
    >
      <div className={`${isMobile ? 'p-3' : 'p-4'} border-b border-white/10 flex-shrink-0`}>
        <div className="flex items-center justify-between mb-1">
          <h2 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'} text-white truncate group relative font-space-grotesk`}>
            {data?.label || 'New Chat'}
            {/* Tooltip for long titles */}
            {data?.label && data.label.length > 30 && (
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-black/90 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal max-w-[300px] z-50 font-space-grotesk">
                {data.label}
              </div>
            )}
          </h2>
          {!isMobile && (
            <button onClick={onClose} className="hover:text-white text-gray-300 transition-colors" title="Close">
              <FiX size={20} />
            </button>
          )}
        </div>
        {data?.chatHistory.length > 0 && (
          <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/50 font-space-grotesk`}>
            {data.chatHistory.length} messages in this conversation
          </div>
        )}
      </div>
      <div className={`flex gap-2 ${isMobile ? 'px-3 py-2' : 'px-4 py-2'} border-b border-white/10 bg-black/20 ${
        isMobile ? 'flex-wrap' : 'gap-3'
      }`}>
        {hasResponse && (
          <button onClick={onBranch} className={`text-purple-300 hover:text-purple-200 flex items-center gap-1 font-space-grotesk ${
            isMobile ? 'text-xs px-2 py-1 bg-purple-900/20 rounded' : ''
          }`} title="Branch Chat">
            <FiPlus size={isMobile ? 14 : 16} /> Branch
          </button>
        )}
        <button onClick={onReset} className={`text-blue-300 hover:text-blue-200 flex items-center gap-1 font-space-grotesk ${
          isMobile ? 'text-xs px-2 py-1 bg-blue-900/20 rounded' : ''
        }`} title="Reset Node">
          <FiRefreshCw size={isMobile ? 14 : 16} /> Reset
        </button>
        {!isRootNode && (
          <button onClick={onDelete} className={`text-red-300 hover:text-red-200 flex items-center gap-1 font-space-grotesk ${
            isMobile ? 'text-xs px-2 py-1 bg-red-900/20 rounded' : ''
          }`} title="Delete Node">
            <FiTrash2 size={isMobile ? 14 : 16} /> Delete
          </button>
        )}
      </div>
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-3' : 'px-4'} scrollbar-thin scrollbar-thumb-white/80 scrollbar-track-transparent`} style={{ scrollbarColor: 'rgba(255,255,255,0.8) transparent', scrollbarWidth: 'thin' }}>
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto ${isMobile ? 'px-2 py-4' : 'px-4 py-6'} space-y-3 scrollbar-thin scrollbar-thumb-white/80 scrollbar-track-transparent`}
          style={{ scrollbarColor: 'rgba(255,255,255,0.8) transparent', scrollbarWidth: 'thin' }}
        >
          {threadMessages.length > 0 ? (
            threadMessages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isModel = msg.role === 'model';
              const isStreaming = isStreamingMessage(msg, idx);
              
              // Get content - either from streaming state or message content
              let displayContent = msg.content;
              if (isStreaming && streamingState?.isStreaming) {
                displayContent = getStreamingContent();
              }
              
              const contentHasMarkdown = isModel && hasMarkdown(displayContent);
              const parsedContent = isModel ? parseThoughts(displayContent) : null;
              const isThoughtsExpanded = expandedThoughts.has(idx);
              
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
                >
                  <div
                    className={`relative ${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} ${
                      isMobile ? 'px-3 py-2' : 'px-4 py-3'
                    } rounded-2xl shadow-md ${isMobile ? 'text-sm' : 'text-base'} font-normal transition-all backdrop-blur-sm
                      ${isUser
                        ? 'bg-purple-600/20 text-white border border-purple-400/30 ml-auto'
                        : 'bg-white/5 text-white border border-white/10 mr-auto'}
                      ${contentHasMarkdown ? 'markdown-message' : ''}
                    `}
                    style={{ minWidth: isMobile ? 40 : 60 }}
                  >
                    {isModel && isGeminiModel((msg as any).modelId) && (
                      <div className={`absolute ${isMobile ? '-top-4 -left-4' : '-top-5 -left-5'} flex items-center`} title={getModelName((msg as any).modelId)}>
                        <span className="group-hover:scale-110 transition-transform cursor-pointer">
                          <SiGooglegemini size={isMobile ? 18 : 22} className="text-blue-300 drop-shadow-md" />
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <div className={`${isMobile ? 'text-xs' : 'text-xs'} font-semibold text-gray-300/80 font-space-grotesk`}>
                        {isUser ? 'You' : getModelName((msg as any).modelId)}
                      </div>
                      {/* Copy button for both user and model responses */}
                      {(isUser || (isModel && displayContent)) && (
                        <CopyButton 
                          content={isUser ? msg.content : (parsedContent?.hasThoughts ? parsedContent.answer || displayContent : displayContent)} 
                          size={isMobile ? 10 : 12} 
                          className="opacity-60 hover:opacity-100"
                        />
                      )}
                    </div>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {msg.attachments.map((att, attIdx) => (
                          <div key={attIdx} className="bg-black/20 p-1 rounded-md">
                            {att.type.startsWith('image/') ? (
                              <img 
                                src={att.previewUrl || `data:${att.type};base64,${att.data}`} 
                                alt={att.name} 
                                className={`${isMobile ? 'max-w-[120px] max-h-[120px]' : 'max-w-[150px] max-h-[150px]'} rounded cursor-pointer hover:scale-105 transition-transform`} 
                                onClick={() => onImageClick && onImageClick(
                                  att.previewUrl || `data:${att.type};base64,${att.data}`,
                                  att.name
                                )}
                              />
                            ) : att.type.startsWith('audio/') ? (
                              <AudioPlayer
                                audioSrc={att.previewUrl || `data:${att.type};base64,${att.data}`}
                                fileName={att.name}
                                mimeType={att.type}
                                className={`w-full ${isMobile ? 'max-w-[200px]' : 'max-w-[250px]'}`}
                              />
                            ) : att.type === 'application/pdf' ? (
                              <div className={`flex items-center gap-2 text-white p-2 w-full ${isMobile ? 'max-w-[200px]' : 'max-w-[250px]'} bg-red-600/20 rounded`}>
                                <div className="flex flex-col items-center justify-center text-red-300">
                                  <FiFileText size={isMobile ? 20 : 24} />
                                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>PDF</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} truncate block text-red-200`}>{att.name}</span>
                                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-red-300/70`}>Document</span>
                                </div>
                              </div>
                            ) : att.type.startsWith('text/') || att.type.includes('javascript') || att.type.includes('python') ? (
                              <div className={`flex items-center gap-2 text-white p-2 w-full ${isMobile ? 'max-w-[200px]' : 'max-w-[250px]'} bg-blue-600/20 rounded`}>
                                <div className="flex flex-col items-center justify-center text-blue-300">
                                  <FiFileText size={isMobile ? 20 : 24} />
                                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>
                                    {att.type.includes('javascript') ? 'JS' : 
                                     att.type.includes('python') ? 'PY' : 
                                     att.type.includes('html') ? 'HTML' :
                                     att.type.includes('css') ? 'CSS' :
                                     att.type.includes('markdown') ? 'MD' :
                                     att.type.includes('csv') ? 'CSV' :
                                     att.type.includes('xml') ? 'XML' :
                                     'TXT'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} truncate block text-blue-200`}>{att.name}</span>
                                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-300/70`}>
                                    {att.type.includes('javascript') ? 'JavaScript' : 
                                     att.type.includes('python') ? 'Python' : 
                                     att.type.includes('html') ? 'HTML Document' :
                                     att.type.includes('css') ? 'CSS Stylesheet' :
                                     att.type.includes('markdown') ? 'Markdown' :
                                     att.type.includes('csv') ? 'CSV Data' :
                                     att.type.includes('xml') ? 'XML Document' :
                                     'Text File'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-white p-2 w-full max-w-[200px]">
                                <FiFileText />
                                <span className={`${isMobile ? 'text-xs' : 'text-sm'} truncate`}>{att.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Thoughts dropdown for model messages */}
                    {isModel && (parsedContent?.hasThoughts || (isStreaming && streamingState?.currentThoughts)) && (
                      <div className="mb-2">
                        {isStreaming && streamingState?.currentThoughts ? (
                          // Streaming thoughts dropdown
                          <div className="mb-2">
                            <button
                              onClick={() => toggleStreamingThoughts()}
                              className={`flex items-start gap-2 ${isMobile ? 'text-sm' : 'text-base'} text-blue-300 hover:text-blue-200 transition-colors font-space-grotesk w-full text-left`}
                            >
                              <div className="flex-shrink-0 mt-1">
                                {isStreamingThoughtsExpanded ? <FiChevronDown size={isMobile ? 14 : 16} /> : <FiChevronRight size={isMobile ? 14 : 16} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-white/90 leading-relaxed">
                                  {streamingState.isThinkingPhase ? (
                                    <>
                                      <span className="font-semibold text-blue-300">Thinking</span>
                                      <div className="flex gap-1 mr-2">
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse [animation-delay:200ms]"></div>
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse [animation-delay:400ms]"></div>
                                      </div>
                                      <span className="flex-1">
                                        {getThoughtTitle(streamingState.currentThoughts, true)}
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                                {!streamingState.isThinkingPhase && (() => {
                                  const duration = getStreamingThoughtDuration();
                                  return duration > 0 ? (
                                    <div className="text-blue-400/70 text-sm mt-2 flex items-center gap-1">
                                      <span>thought for {duration} second{duration !== 1 ? 's' : ''}</span>
                                      <span className="text-blue-400">●</span>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            </button>
                            {isStreamingThoughtsExpanded && (
                              <div className={`mt-3 mb-3 ${isMobile ? 'p-3' : 'p-4'} bg-black/20 rounded-lg border border-blue-500/20`}>
                                <div className={`${isMobile ? 'text-sm' : 'text-base'} text-white/90 font-space-grotesk leading-relaxed`}>
                                  {hasMarkdown(streamingState.currentThoughts) ? (
                                    <div className="markdown-content font-space-grotesk">
                                      <MarkdownRenderer content={cleanMarkdownContent(streamingState.currentThoughts)} />
                                    </div>
                                  ) : (
                                    <div className="whitespace-pre-wrap font-space-grotesk">{cleanMarkdownContent(streamingState.currentThoughts)}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Completed thoughts dropdown
                          <>
                        <button
                          onClick={() => toggleThoughts(idx)}
                              className={`flex items-start gap-2 ${isMobile ? 'text-sm' : 'text-base'} text-blue-300 hover:text-blue-200 transition-colors font-space-grotesk w-full text-left`}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {isThoughtsExpanded ? <FiChevronDown size={isMobile ? 14 : 16} /> : <FiChevronRight size={isMobile ? 14 : 16} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                {(() => {
                                  const duration = getThoughtDuration(idx);
                                  return (
                                    <div className="text-blue-400/90 flex items-center gap-1 leading-relaxed">
                                      <span>thought for {duration}s</span>
                                      <span className="text-blue-400">●</span>
                                    </div>
                                  );
                                })()}
                              </div>
                        </button>
                        {isThoughtsExpanded && (
                              <div className={`mt-3 mb-3 ${isMobile ? 'p-3' : 'p-4'} bg-black/20 rounded-lg border border-blue-500/20`}>
                                <div className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-blue-300 mb-3 font-space-grotesk`}>
                                  Full Thought Process:
                                </div>
                                <div className={`${isMobile ? 'text-sm' : 'text-base'} text-white/90 font-space-grotesk leading-relaxed`}>
                                  {hasMarkdown(parsedContent!.thoughts) ? (
                                <div className="markdown-content font-space-grotesk">
                                      <MarkdownRenderer content={cleanMarkdownContent(parsedContent!.thoughts)} />
                                </div>
                              ) : (
                                    <div className="whitespace-pre-wrap font-space-grotesk">{cleanMarkdownContent(parsedContent!.thoughts)}</div>
                              )}
                            </div>
                          </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Message content */}
                    {isStreaming ? (
                      <StreamingContent content={displayContent} />
                    ) : (
                      isModel && parsedContent?.hasThoughts ? (
                      // Show only the answer part if thoughts are present
                      parsedContent.answer && (contentHasMarkdown ? (
                        <div className="markdown-content font-space-grotesk">
                          <MarkdownRenderer content={cleanMarkdownContent(parsedContent.answer)} />
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap font-space-grotesk">{cleanMarkdownContent(parsedContent.answer)}</div>
                      ))
                    ) : (
                      // Show full content for non-thinking responses
                      isModel && contentHasMarkdown ? (
                        <div className="markdown-content font-space-grotesk">
                            <MarkdownRenderer content={cleanMarkdownContent(displayContent)} />
                        </div>
                      ) : (
                          <div className="whitespace-pre-wrap font-space-grotesk">{cleanMarkdownContent(displayContent)}</div>
                        )
                      )
                    )}

                    {/* Citations and search suggestions for model responses */}
                    {isModel && (msg as any).groundingMetadata && !isStreaming && (() => {
                      console.log('🔍 NODESIDEBAR DEBUG: Rendering citations for completed message', {
                        messageIndex: idx,
                        nodeId: nodeId,
                        groundingMetadata: (msg as any).groundingMetadata,
                        citationsCount: (msg as any).groundingMetadata.citations?.length || 0,
                        searchQueriesCount: (msg as any).groundingMetadata.webSearchQueries?.length || 0,
                        hasSearchEntryPoint: !!(msg as any).groundingMetadata.searchEntryPoint?.renderedContent
                      });
                      
                      return (
                      <div className={`mt-3 pt-3 border-t border-neutral-700/50`}>
                        <Citations
                          citations={(msg as any).groundingMetadata.citations}
                          searchQueries={(msg as any).groundingMetadata.webSearchQueries}
                          searchEntryPoint={(msg as any).groundingMetadata.searchEntryPoint?.renderedContent}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                          enableMarkdown={true}
                        />
                      </div>
                      );
                    })()}

                    {/* Streaming grounding metadata display */}
                    {isModel && isStreaming && (() => {
                      // Check for grounding-related content
                      const hasGroundingMetadata = !!streamingState?.groundingMetadata?.citations;
                      const hasLoadingMessage = !!streamingState?.groundingMetadata?.loadingMessage;
                      const isGroundingEnabled = (msg as any).modelId?.includes('web') || 
                                                (msg as any).modelId?.includes('grounding') || 
                                                (msg as any).modelId?.includes('thinking') ||
                                                streamingState?.isStreaming; // Show for any streaming model that might use grounding
                      
                      // Show loading state if we have a loading message or if grounding is enabled but no metadata yet
                      if ((hasLoadingMessage || (!hasGroundingMetadata && isGroundingEnabled)) && streamingState?.isStreaming) {
                        const loadingText = streamingState?.groundingMetadata?.loadingMessage || 'Searching the web...';
                        
                        console.log('🔍 NODESIDEBAR DEBUG: Showing web search loading state', {
                          messageIndex: idx,
                          nodeId: nodeId,
                          isStreaming: streamingState.isStreaming,
                          hasGroundingMetadata,
                          hasLoadingMessage,
                          isGroundingEnabled,
                          loadingText,
                          modelId: (msg as any).modelId
                        });
                        
                        return (
                          <div className={`mt-3 pt-3 border-t border-neutral-700/50`}>
                            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-300 mb-2 flex items-center gap-2`}>
                              <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
                              </div>
                              {loadingText}
                            </div>
                          </div>
                        );
                      }
                      
                      // Show actual grounding metadata if available
                      if (hasGroundingMetadata && streamingState?.groundingMetadata) {
                        console.log('🔍 NODESIDEBAR DEBUG: Rendering citations for streaming message', {
                          messageIndex: idx,
                          nodeId: nodeId,
                          streamingGroundingMetadata: streamingState.groundingMetadata,
                          citationsCount: streamingState.groundingMetadata.citations?.length || 0,
                          searchQueriesCount: streamingState.groundingMetadata.webSearchQueries?.length || 0,
                          hasSearchEntryPoint: !!streamingState.groundingMetadata.searchEntryPoint?.renderedContent,
                          isStreaming: streamingState.isStreaming
                        });
                        
                        return (
                          <div className={`mt-3 pt-3 border-t border-neutral-700/50`}>
                            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-300 mb-2 flex items-center gap-2`}>
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                              Web search results
                            </div>
                            <Citations
                              citations={streamingState.groundingMetadata.citations}
                              searchQueries={streamingState.groundingMetadata.webSearchQueries}
                              searchEntryPoint={streamingState.groundingMetadata.searchEntryPoint?.renderedContent}
                              className={isMobile ? 'text-xs' : 'text-sm'}
                              enableMarkdown={true}
                            />
                          </div>
                        );
                      }
                      
                      return null;
                    })()}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`text-center text-gray-400 ${isMobile ? 'py-6' : 'py-8'} font-space-grotesk`}>No messages in this conversation yet</div>
          )}
          
          {/* Bottom margin for conversation */}
          <div className={isMobile ? 'h-6' : 'h-8'}></div>
        </div>
      </div>
    </div>
  );
} 