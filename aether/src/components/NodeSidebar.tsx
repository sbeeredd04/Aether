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

  // Loading dots animation
  const LoadingDots = () => (
    <span className="flex gap-1 items-center h-6">
      <span className="bg-white/80 rounded-full w-2 h-2 animate-bounce [animation-delay:0ms]"></span>
      <span className="bg-white/60 rounded-full w-2 h-2 animate-bounce [animation-delay:150ms]"></span>
      <span className="bg-white/40 rounded-full w-2 h-2 animate-bounce [animation-delay:300ms]"></span>
    </span>
  );

  // Streaming thoughts component
  const StreamingThoughts = ({ content }: { content: string }) => {
    if (!content) return null;
    
    return (
      <div className={`mt-2 ${isMobile ? 'p-2' : 'p-3'} bg-black/20 rounded-lg border border-blue-500/20`}>
        <div className={`${isMobile ? 'text-xs' : 'text-xs'} font-semibold text-blue-300 mb-2 font-space-grotesk flex items-center gap-2`}>
          <span>Thinking...</span>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse [animation-delay:200ms]"></div>
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse [animation-delay:400ms]"></div>
          </div>
        </div>
        <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/80 font-space-grotesk relative`}>
          <span className="whitespace-pre-wrap">{content}</span>
          <span className="inline-block w-[2px] h-4 bg-white animate-pulse ml-1"></span>
        </div>
      </div>
    );
  };

  // Streaming message component
  const StreamingMessage = ({ content }: { content: string }) => {
    if (!content) return null;
    
    return (
      <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-white font-space-grotesk relative`}>
        <span className="whitespace-pre-wrap">{content}</span>
        <span className="inline-block w-[2px] h-4 bg-white animate-pulse ml-1"></span>
      </div>
    );
  };

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
              const contentHasMarkdown = isModel && hasMarkdown(msg.content);
              const parsedContent = isModel ? parseThoughts(msg.content) : null;
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
                      {/* Copy button for model responses */}
                      {isModel && (
                        <CopyButton 
                          content={parsedContent?.hasThoughts ? parsedContent.answer || msg.content : msg.content} 
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
                    {isModel && parsedContent?.hasThoughts && (
                      <div className="mb-2">
                        <button
                          onClick={() => toggleThoughts(idx)}
                          className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-xs'} text-blue-300 hover:text-blue-200 transition-colors font-space-grotesk`}
                        >
                          {isThoughtsExpanded ? <FiChevronDown size={isMobile ? 12 : 14} /> : <FiChevronRight size={isMobile ? 12 : 14} />}
                          {isThoughtsExpanded ? 'Hide' : 'Show'} Thoughts
                        </button>
                        {isThoughtsExpanded && (
                          <div className={`mt-2 ${isMobile ? 'p-2' : 'p-3'} bg-black/20 rounded-lg border border-blue-500/20`}>
                            <div className={`${isMobile ? 'text-xs' : 'text-xs'} font-semibold text-blue-300 mb-2 font-space-grotesk`}>Thoughts:</div>
                            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/80 font-space-grotesk`}>
                              {hasMarkdown(parsedContent.thoughts) ? (
                                <div className="markdown-content font-space-grotesk">
                                  <MarkdownRenderer content={cleanMarkdownContent(parsedContent.thoughts)} />
                                </div>
                              ) : (
                                <div className="whitespace-pre-wrap font-space-grotesk">{cleanMarkdownContent(parsedContent.thoughts)}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Message content */}
                    {isModel && parsedContent?.hasThoughts ? (
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
                          <MarkdownRenderer content={cleanMarkdownContent(msg.content)} />
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap font-space-grotesk">{cleanMarkdownContent(msg.content)}</div>
                      )
                    )}

                    {/* Citations and search suggestions for model responses */}
                    {isModel && (msg as any).groundingMetadata && (
                      <div className={`mt-3 pt-3 border-t border-neutral-700/50`}>
                        <Citations
                          citations={(msg as any).groundingMetadata.citations}
                          searchQueries={(msg as any).groundingMetadata.webSearchQueries}
                          searchEntryPoint={(msg as any).groundingMetadata.searchEntryPoint?.renderedContent}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`text-center text-gray-400 ${isMobile ? 'py-6' : 'py-8'} font-space-grotesk`}>No messages in this conversation yet</div>
          )}
          
          {/* Streaming content - only show when actively streaming */}
          {(streamingState?.isStreaming || isActiveNodeLoading) && (
            <div className="flex justify-start">
              <div className={`${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} ${
                isMobile ? 'px-3 py-2' : 'px-4 py-3'
              } rounded-2xl shadow-md bg-white/5 backdrop-blur-sm border border-white/10 relative`}>
                
                {/* Gemini icon */}
                <div className={`absolute ${isMobile ? '-top-4 -left-4' : '-top-5 -left-5'} flex items-center`}>
                  <SiGooglegemini size={isMobile ? 18 : 22} className="text-blue-300 drop-shadow-md" />
                </div>
                
                {/* Header */}
                <div className={`${isMobile ? 'text-xs' : 'text-xs'} font-semibold text-gray-300/80 mb-2 font-space-grotesk`}>
                  {getModelName()}
                </div>
                
                {/* Streaming states */}
                {streamingState?.isStreaming ? (
                  <div className="space-y-2">
                    {/* Show thoughts if in thinking phase */}
                    {(streamingState.isThinkingPhase || streamingState.currentThoughts) && (
                      <StreamingThoughts content={streamingState.currentThoughts} />
                    )}
                    
                    {/* Show message content if in message phase */}
                    {(streamingState.messagePhase || streamingState.currentMessage) && (
                      <StreamingMessage content={streamingState.currentMessage} />
                    )}
                    
                    {/* If no content yet, show loading dots */}
                    {!streamingState.currentThoughts && !streamingState.currentMessage && (
                      <div className="flex items-center gap-2">
                        <LoadingDots />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Fallback loading state */
                  <div className="flex items-center gap-2">
                    <LoadingDots />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Bottom margin for conversation */}
          <div className={isMobile ? 'h-6' : 'h-8'}></div>
        </div>
      </div>
    </div>
  );
} 