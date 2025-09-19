import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiPaperclip, FiX, FiPlus, FiMic, FiSearch, FiUpload, FiFileText, FiCpu, FiGlobe, FiSquare, FiEdit3 } from 'react-icons/fi';
import { FaStop } from "react-icons/fa";
import { IoOptionsOutline } from "react-icons/io5";
import { LuBrain } from "react-icons/lu";
import { TbBrandGoogle } from "react-icons/tb";
import { useChatStore } from '../store/chatStore';
import { models, getModelById } from '../utils/models';
import logger from '../utils/logger';

interface PromptBarProps {
  node: any;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onShowVoiceModal?: () => void;
  onShowImageModal?: (imageSrc: string, imageTitle: string) => void;
  voiceTranscript?: string;
  onClearVoiceTranscript?: () => void;
  isMobile?: boolean;
  // Streaming callbacks
  onStreamingStart?: (config: { groundingEnabled: boolean; modelSupportsThinking: boolean; }) => void;
  onStreamingThought?: (thought: string) => void;
  onStreamingMessage?: (messageChunk: string) => void;
  onStreamingGrounding?: (metadata: any) => void;
  onStreamingComplete?: () => void;
  onStreamingError?: (error: string) => void;
  // Edit mode props
  editingState?: {
    isEditing: boolean;
    messageIndex: number;
    nodeId: string;
    originalContent: string;
  } | null;
  onCancelEdit?: () => void;
  onCompleteEdit?: () => void;
}

interface Attachment {
  file: File;
  previewUrl: string;
}


interface GroundingOptions {
  enabled: boolean;
  dynamicThreshold?: number;
}

export default function PromptBar({ 
  node, 
  isLoading, 
  setIsLoading, 
  onShowVoiceModal, 
  onShowImageModal,
  voiceTranscript,
  onClearVoiceTranscript,
  isMobile = false,
  onStreamingStart,
  onStreamingThought,
  onStreamingMessage,
  onStreamingGrounding,
  onStreamingComplete,
  onStreamingError,
  editingState,
  onCancelEdit,
  onCompleteEdit
}: PromptBarProps) {
  // Early return check BEFORE any hooks
  if (!node) {
    logger.debug('PromptBar: No active node provided, waiting for initialization');
    return (
      <div className="w-full flex justify-center items-end pointer-events-none">
        <div className="w-full max-w-3xl bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg flex items-center justify-center p-4 pointer-events-auto">
          <div className="text-white/60 text-sm">Loading workspace...</div>
        </div>
      </div>
    );
  }

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedModel, setSelectedModel] = useState(models[0].id); // Default to first model (Web + Thinking)
  const [enableThinking, setEnableThinking] = useState(true);
  const [grounding, setGrounding] = useState<GroundingOptions>({ 
    enabled: models[0]?.supportsGrounding || false, // Enable grounding for models that support it
    dynamicThreshold: 0.3 
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(!isMobile);
  const [isRecording, setIsRecording] = useState(false);
  
  // New modal states
  const [showModelInfo, setShowModelInfo] = useState(false);
  
  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Cancel request states
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [lastPrompt, setLastPrompt] = useState('');
  const [lastAttachments, setLastAttachments] = useState<Attachment[]>([]);
  
  const addMessageToNode = useChatStore((s) => s.addMessageToNode);
  const getPathToNode = useChatStore((s) => s.getPathToNode);
  const removeLastMessageFromNode = useChatStore((s) => s.removeLastMessageFromNode);
  const hasStorageConsent = useChatStore((s) => s.hasStorageConsent);
  const editMessageAndResend = useChatStore((s) => s.editMessageAndResend);
  const initializeChatManager = useChatStore((s) => s.initializeChatManager);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    logger.debug('PromptBar: Component mounted/updated', { 
      nodeId: node?.id, 
      isLoading, 
      selectedModel,
      attachmentsCount: attachments.length,
      enableThinking,
      groundingEnabled: grounding.enabled
    });
  }, [node?.id, isLoading, selectedModel, attachments.length, enableThinking, grounding.enabled]);

  useEffect(() => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = 'auto';
    const scrollHeight = ta.scrollHeight;
    const maxHeight = 200;
    ta.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    ta.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input]);

  // Handle voice transcript input
  useEffect(() => {
    if (voiceTranscript && voiceTranscript.trim()) {
      logger.info('PromptBar: Voice transcript received', { transcriptLength: voiceTranscript.length });
      setInput(prev => prev + (prev ? ' ' : '') + voiceTranscript);
      onClearVoiceTranscript?.();
    }
  }, [voiceTranscript, onClearVoiceTranscript]);

  // Handle edit mode
  useEffect(() => {
    if (editingState?.isEditing) {
      setInput(editingState.originalContent);
      logger.info('PromptBar: Edit mode activated', { 
        messageIndex: editingState.messageIndex,
        nodeId: editingState.nodeId,
        contentLength: editingState.originalContent.length
      });
    }
  }, [editingState]);

  const selectedModelDef = models.find(m => m.id === selectedModel);
  const supportsThinking = selectedModelDef?.isThinking;
  const supportsGrounding = selectedModelDef?.supportsGrounding;
  const supportsAudioInput = selectedModelDef?.supportedInputs.includes('audio');
  const supportsDocuments = selectedModelDef?.supportsDocuments;
  
  logger.debug('PromptBar: Model capabilities analysis', {
    selectedModel,
    selectedModelDef: selectedModelDef ? {
      id: selectedModelDef.id,
      name: selectedModelDef.name,
      isMultimedia: selectedModelDef.isMultimedia,
      apiModel: selectedModelDef.apiModel,
      capabilities: selectedModelDef.capabilities
    } : null,
    supportsThinking,
    supportsGrounding,
    supportsAudioInput
  });

  // Disable send button for certain conditions
  const shouldDisableSend = isLoading || 
    (!input.trim() && attachments.length === 0);

  logger.debug('PromptBar: Send button state', {
    shouldDisableSend,
    isLoading,
    hasInput: !!input.trim(),
    hasAttachments: attachments.length > 0
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    logger.info('PromptBar: File selection initiated');
    
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      logger.info('PromptBar: Files selected', { 
        count: newFiles.length,
        files: newFiles.map(f => ({ name: f.name, type: f.type, size: f.size }))
      });

      const newAttachments: Attachment[] = newFiles.map(file => {
        const previewUrl = URL.createObjectURL(file);
        logger.debug('PromptBar: Created preview URL for file', { 
          fileName: file.name, 
          fileType: file.type,
          previewUrl 
        });
        
        return {
          file,
          previewUrl,
        };
      });
      
      setAttachments(prev => {
        const updated = [...prev, ...newAttachments];
        logger.info('PromptBar: Attachments updated', { 
          previousCount: prev.length,
          newCount: updated.length,
          totalSize: updated.reduce((sum, att) => sum + att.file.size, 0)
        });
        return updated;
      });
    } else {
      logger.warn('PromptBar: No files found in file input event');
    }
  };

  const handleAudioInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    logger.info('PromptBar: Audio file selection initiated');
    
    if (event.target.files) {
      const audioFiles = Array.from(event.target.files).filter(file => 
        file.type.startsWith('audio/')
      );
      
      if (audioFiles.length > 0) {
        handleFileChange(event);
      } else {
        logger.warn('PromptBar: No audio files selected');
      }
    }
  };

  const removeAttachment = (index: number) => {
    logger.info('PromptBar: Removing attachment', { index, fileName: attachments[index]?.file.name });
    setAttachments(prev => {
      const updated = prev.filter((_, i) => i !== index);
      logger.debug('PromptBar: Attachment removed', { 
        removedFile: prev[index]?.file.name,
        remainingCount: updated.length 
      });
      return updated;
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      logger.info('PromptBar: Files dropped', { count: files.length });
      
      const newAttachments: Attachment[] = files.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  // Handle cancel request
  const handleCancelRequest = () => {
    logger.info('PromptBar: Canceling request', { nodeId: node.id });
    
    if (abortController) {
      abortController.abort();
      logger.debug('PromptBar: Abort signal sent');
    }
    
    // Remove the user message that was added when request started
    removeLastMessageFromNode(node.id);
    
    // Restore the input and attachments
    setInput(lastPrompt);
    setAttachments(lastAttachments);
    
    // Reset states
    setIsLoading(false);
    setAbortController(null);
    setLastPrompt('');
    setLastAttachments([]);
    
    logger.info('PromptBar: Request canceled and states restored', { 
      nodeId: node.id,
      restoredPromptLength: lastPrompt.length,
      restoredAttachmentsCount: lastAttachments.length
    });
  };

  // Handle edit and resend
  const handleEditAndResend = async () => {
    if (!editingState || !input.trim()) return;
    
    logger.info('PromptBar: Starting edit and resend', {
      nodeId: editingState.nodeId,
      messageIndex: editingState.messageIndex,
      newContent: input.substring(0, 100) + (input.length > 100 ? '...' : '')
    });

    setIsLoading(true);

    try {
      // First, edit the message and remove subsequent messages using the store's edit function
      const state = useChatStore.getState();
      
      // Find the correct node and local index
      const pathNodeIds = state.getPathNodeIds(editingState.nodeId);
      let currentIndex = 0;
      let messageNodeId = '';
      let localIndex = -1;

      for (const id of pathNodeIds) {
        const node = state.nodes.find(n => n.id === id);
        if (node && node.data.chatHistory) {
          const nodeMessageCount = node.data.chatHistory.length;
          
          if (editingState.messageIndex >= currentIndex && editingState.messageIndex < currentIndex + nodeMessageCount) {
            messageNodeId = id;
            localIndex = editingState.messageIndex - currentIndex;
            break;
          }
          
          currentIndex += nodeMessageCount;
        }
      }

      if (localIndex === -1) {
        throw new Error('Message not found');
      }

      // Edit the message and remove subsequent messages
      state.editMessageAndRemoveSubsequent(messageNodeId, localIndex, input.trim());

      // Now proceed with the same API flow as normal message sending
      await handleEditApiCall();
      
    } catch (error) {
      logger.error('PromptBar: Edit and resend failed', { error });
      onStreamingError?.(error instanceof Error ? error.message : 'Edit failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Separate function to handle the API call for edited messages
  const handleEditApiCall = async () => {
    if (!editingState) return;

    // Get the updated conversation path (should now end with our edited message)
    const state = useChatStore.getState();
    const pathMessages = state.getPathToNode(editingState.nodeId);
    logger.debug('PromptBar: Retrieved path messages after edit', { 
      pathLength: pathMessages.length 
    });

    // Extract attachments from the edited message (if any)
    const editedMessage = pathMessages[pathMessages.length - 1];
    const attachmentData = (editedMessage?.role === 'user' && editedMessage.attachments) ? editedMessage.attachments : [];

    // Get API settings
    const savedSettings = localStorage.getItem('aether-settings');
    if (!savedSettings) {
      throw new Error('API key not found.');
    }
    
    const settings = JSON.parse(savedSettings);
    const apiKey = settings.apiKey;
    if (!apiKey) {
      throw new Error('API key is empty.');
    }

    // Build history for API (same format as normal message)
    const history = pathMessages.flatMap((msg) => {
      const parts: any[] = [{ text: msg.content }];
      if(msg.attachments) {
        msg.attachments.forEach(att => {
          parts.unshift({
            inlineData: {
              mimeType: att.type,
              data: att.data,
            }
          })
        })
      }
      return [ { role: msg.role, parts } ];
    });

    // Always enable streaming by default
    const streamingEnabled = true;
    logger.info('PromptBar: Edit streaming preference', { streamingEnabled });

    logger.info('PromptBar: Making edit API request', {
      endpoint: '/api/chat',
      modelId: selectedModel,
      hasPrompt: !!input,
      attachmentsCount: attachmentData.length,
      historyLength: history.length,
      enableThinking: supportsThinking ? enableThinking : undefined,
      groundingEnabled: supportsGrounding ? grounding.enabled : undefined,
      streamingEnabled
    });

    // Prepare request payload (same as normal message)
    const requestPayload: any = {
      apiKey,
      modelId: selectedModel,
      history,
      prompt: input,
      attachments: attachmentData,
      stream: streamingEnabled,
    };

    // Add model-specific options
    if (supportsThinking) {
      requestPayload.enableThinking = enableThinking;
    }

    if (supportsGrounding) {
      requestPayload.grounding = grounding;
    }


    // Ensure grounding settings are properly set
    const currentModel = getModelById(selectedModel);
    if (currentModel?.supportsGrounding && grounding.enabled) {
      requestPayload.grounding = grounding;
    }

    // Make API call
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });
    
    logger.info('PromptBar: Edit API response received', { 
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      isStreaming: streamingEnabled
    });

    if (!response.ok) {
      logger.error('PromptBar: Edit API response not ok', { 
        status: response.status,
        statusText: response.statusText 
      });
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // Handle streaming response (same logic as normal message)
    await handleEditStreamingResponse(response, currentModel);
    
    // Clear input and complete edit
    setInput('');
    onCompleteEdit?.();
    
    logger.info('PromptBar: Edit and resend completed successfully');
  };

  // Handle streaming response for edited messages
  const handleEditStreamingResponse = async (response: Response, currentModel: any) => {
    if (!editingState) return;

    logger.info('PromptBar: Processing edit streaming response');
    
    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    // Notify that streaming started with configuration
    const streamingConfig = {
      groundingEnabled: grounding.enabled,
      modelSupportsThinking: !!supportsThinking
    };
    onStreamingStart?.(streamingConfig);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let fullMessage = '';
    let fullThoughts = '';
    let audioData: string | undefined;

    // Create placeholder message for streaming updates
    const placeholderMessage = { 
      role: 'model' as const, 
      content: '',
      modelId: selectedModel
    };
    addMessageToNode(editingState.nodeId, placeholderMessage, false);

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          logger.info('PromptBar: Edit streaming complete');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'thought':
                  fullThoughts += data.content;
                  logger.debug('PromptBar: Received edit thought chunk', { length: data.content.length });
                  onStreamingThought?.(data.content);
                  
                  // Update the placeholder message with thoughts
                  const { nodes } = useChatStore.getState();
                  const currentNode = nodes.find(n => n.id === editingState.nodeId);
                  if (currentNode && currentNode.data.chatHistory.length > 0) {
                    const lastMessage = currentNode.data.chatHistory[currentNode.data.chatHistory.length - 1];
                    if (lastMessage.role === 'model' && lastMessage.modelId === selectedModel) {
                      const currentContent = fullThoughts ? 
                        `**Thoughts:**\n${fullThoughts}${fullMessage ? `\n\n---\n\n**Answer:**\n${fullMessage}` : ''}` : 
                        fullMessage;
                      lastMessage.content = currentContent;
                      // Trigger re-render
                      useChatStore.setState({ nodes: [...nodes] });
                    }
                  }
                  break;
                  
                case 'message':
                  fullMessage += data.content;
                  logger.debug('PromptBar: Received edit message chunk', { length: data.content.length });
                  onStreamingMessage?.(data.content);
                  
                  // Update the placeholder message with accumulated content
                  const { nodes: messageNodes } = useChatStore.getState();
                  const messageCurrentNode = messageNodes.find(n => n.id === editingState.nodeId);
                  if (messageCurrentNode && messageCurrentNode.data.chatHistory.length > 0) {
                    const lastMessage = messageCurrentNode.data.chatHistory[messageCurrentNode.data.chatHistory.length - 1];
                    if (lastMessage.role === 'model' && lastMessage.modelId === selectedModel) {
                      const currentContent = fullThoughts ? 
                        `**Thoughts:**\n${fullThoughts}\n\n---\n\n**Answer:**\n${fullMessage}` : 
                        fullMessage;
                      lastMessage.content = currentContent;
                      // Trigger re-render
                      useChatStore.setState({ nodes: [...messageNodes] });
                    }
                  }
                  break;
                  
                case 'grounding':
                  if (data.groundingMetadata) {
                    logger.debug('PromptBar: Received edit grounding metadata', { 
                      citationsCount: data.groundingMetadata.citations?.length || 0,
                      searchQueriesCount: data.groundingMetadata.webSearchQueries?.length || 0
                    });
                    onStreamingGrounding?.(data.groundingMetadata);
                    
                    // Update the placeholder message with grounding metadata
                    const { nodes: groundingNodes } = useChatStore.getState();
                    const groundingCurrentNode = groundingNodes.find(n => n.id === editingState.nodeId);
                    if (groundingCurrentNode && groundingCurrentNode.data.chatHistory.length > 0) {
                      const lastMessage = groundingCurrentNode.data.chatHistory[groundingCurrentNode.data.chatHistory.length - 1];
                      if (lastMessage.role === 'model' && lastMessage.modelId === selectedModel) {
                        (lastMessage as any).groundingMetadata = data.groundingMetadata;
                        useChatStore.setState({ nodes: [...groundingNodes] });
                      }
                    }
                  } else if (data.content) {
                    // Handle loading state messages (like "Searching the web...")
                    logger.debug('PromptBar: Received edit grounding loading state', { 
                      content: data.content
                    });
                    
                    // Notify about the loading state
                    onStreamingGrounding?.({ loadingMessage: data.content });
                  }
                  break;
                  
                case 'complete':
                  if (data.audioData) {
                    audioData = data.audioData;
                    logger.info('PromptBar: Received edit audio data', { length: data.audioData.length });
                  }
                  logger.info('PromptBar: Edit streaming response complete', { 
                    messageLength: fullMessage.length,
                    thoughtsLength: fullThoughts.length,
                    hasAudio: !!audioData
                  });
                  onStreamingComplete?.();
                  break;
                  
                case 'error':
                  logger.error('PromptBar: Edit streaming error', { error: data.content });
                  onStreamingError?.(data.content);
                  throw new Error(data.content);
                  
                default:
                  logger.warn('PromptBar: Unknown edit chunk type', { type: data.type });
              }
            } catch (e) {
              logger.warn('PromptBar: Failed to parse edit chunk', { line });
            }
          }
        }
      }

      // Final update with complete message and audio if available
      const finalContent = fullThoughts ? 
        `**Thoughts:**\n${fullThoughts}\n\n---\n\n**Answer:**\n${fullMessage}` : 
        fullMessage;

      const finalMessage: any = { 
        role: 'model' as const, 
        content: finalContent,
        modelId: selectedModel
      };

      if (audioData) {
        finalMessage.attachments = [{
          name: 'audio_response.wav',
          type: 'audio/wav',
          data: audioData,
          previewUrl: `data:audio/wav;base64,${audioData}`
        }];
      }

      // Replace the placeholder with final message
      const { nodes } = useChatStore.getState();
      const currentNode = nodes.find(n => n.id === editingState.nodeId);
      if (currentNode && currentNode.data.chatHistory.length > 0) {
        const lastMessage = currentNode.data.chatHistory[currentNode.data.chatHistory.length - 1];
        if (lastMessage.role === 'model' && lastMessage.modelId === selectedModel) {
          Object.assign(lastMessage, finalMessage);
          // Preserve grounding metadata if it exists
          if ((lastMessage as any).groundingMetadata) {
            finalMessage.groundingMetadata = (lastMessage as any).groundingMetadata;
          }
          useChatStore.setState({ nodes: [...nodes] });
        }
      }

    } catch (streamingError) {
      logger.error('PromptBar: Edit streaming failed', { error: streamingError });
      onStreamingError?.(streamingError instanceof Error ? streamingError.message : 'Streaming failed');
      throw streamingError;
    } finally {
      reader.releaseLock();
    }
  };

  const handleAskLLM = async () => {
    // If in edit mode, use edit handler
    if (editingState?.isEditing) {
      return handleEditAndResend();
    }

    logger.info('PromptBar: Starting LLM request', { 
      nodeId: node.id,
      prompt: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      selectedModel,
      attachmentsCount: attachments.length,
      enableThinking,
      groundingEnabled: grounding.enabled
    });

    if (!input.trim() && attachments.length === 0) {
      logger.warn('PromptBar: Request blocked - no input or attachments');
      return;
    }
    
    // Save current state for potential restoration
    setLastPrompt(input);
    setLastAttachments([...attachments]);
    
    // Create abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);
    
    setIsLoading(true);
    logger.debug('PromptBar: Loading state set to true');

    try {
      // Process attachments
      logger.info('PromptBar: Processing attachments', { count: attachments.length });
      const attachmentData = await Promise.all(
        attachments.map(async (att, index) => {
          logger.debug('PromptBar: Processing attachment', { 
            index, 
            fileName: att.file.name, 
            fileType: att.file.type,
            fileSize: att.file.size 
          });

          const reader = new FileReader();
          return new Promise<{ name: string; type: string; data: string; previewUrl: string }>((resolve, reject) => {
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (!result) {
                logger.error('PromptBar: Failed to read file', { fileName: att.file.name });
                reject(new Error(`Failed to read file: ${att.file.name}`));
                return;
              }

              const base64Data = result.split(',')[1];
              logger.debug('PromptBar: File converted to base64', { 
                fileName: att.file.name,
                originalSize: att.file.size,
                base64Length: base64Data.length 
              });

              resolve({
                name: att.file.name,
                type: att.file.type,
                data: base64Data,
                previewUrl: att.previewUrl
              });
            };
            
            reader.onerror = () => {
              logger.error('PromptBar: FileReader error', { fileName: att.file.name, error: reader.error });
              reject(new Error(`FileReader error for ${att.file.name}`));
            };
            
            reader.readAsDataURL(att.file);
          });
        })
      );

      logger.info('PromptBar: All attachments processed successfully', { 
        processedCount: attachmentData.length,
        totalBase64Size: attachmentData.reduce((sum, att) => sum + att.data.length, 0)
      });

      // Create user message
      const userMessage = { 
        role: 'user' as const, 
        content: input,
        attachments: attachmentData,
      };

      logger.debug('PromptBar: Adding user message to node', { 
        nodeId: node.id,
        messageContent: input.substring(0, 50) + (input.length > 50 ? '...' : ''),
        attachmentsIncluded: attachmentData.length
      });

      addMessageToNode(node.id, userMessage);
      
      // Clear input and attachments immediately after adding message
      setInput('');
      setAttachments([]);
      logger.debug('PromptBar: Input and attachments cleared');

      // Check if request was canceled during attachment processing
      if (controller.signal.aborted) {
        logger.info('PromptBar: Request was canceled during processing');
        return;
      }

      // Get conversation history
      logger.info('PromptBar: Retrieving conversation path', { nodeId: node.id });
      const pathMessages = getPathToNode(node.id);
      logger.debug('PromptBar: Path messages retrieved', { 
        messageCount: pathMessages.length,
        messages: pathMessages.map((msg, i) => ({
          index: i,
          role: msg.role,
          contentPreview: msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : ''),
          hasAttachments: !!msg.attachments?.length
        }))
      });

      // Build history for API
      const history = pathMessages.flatMap((msg) => {
        const parts: any[] = [{ text: msg.content }];
        if(msg.attachments) {
          msg.attachments.forEach(att => {
            parts.unshift({
              inlineData: {
                mimeType: att.type,
                data: att.data,
              }
            })
          })
        }
        return [ { role: msg.role, parts } ];
      });

      logger.info('PromptBar: History prepared for API', { 
        historyLength: history.length,
        totalParts: history.reduce((sum, h) => sum + h.parts.length, 0)
      });

      // Get API settings
      const savedSettings = localStorage.getItem('aether-settings');
      if (!savedSettings) {
        logger.error('PromptBar: No saved settings found in localStorage');
        throw new Error('API key not found.');
      }
      
      const settings = JSON.parse(savedSettings);
      const apiKey = settings.apiKey;
      if (!apiKey) {
        logger.error('PromptBar: API key is empty in settings');
        throw new Error('API key is empty.');
      }

      // Always enable streaming by default
      const streamingEnabled = true;
      logger.info('PromptBar: Streaming preference', { streamingEnabled });

      logger.info('PromptBar: Making API request', {
        endpoint: '/api/chat',
        modelId: selectedModel,
        hasPrompt: !!input,
        attachmentsCount: attachmentData.length,
        historyLength: history.length,
        enableThinking: supportsThinking ? enableThinking : undefined,
        groundingEnabled: supportsGrounding ? grounding.enabled : undefined,
        streamingEnabled
      });

      // Prepare request payload
      const requestPayload: any = {
        apiKey,
        modelId: selectedModel,
        history,
        prompt: input,
        attachments: attachmentData,
        stream: streamingEnabled, // Add streaming preference
      };

      // Add model-specific options
      if (supportsThinking) {
        requestPayload.enableThinking = enableThinking;
      }

      if (supportsGrounding) {
        requestPayload.grounding = grounding;
      }


      // Ensure grounding settings are properly set
      const currentModel = getModelById(selectedModel);
      if (currentModel?.supportsGrounding && grounding.enabled) {
        requestPayload.grounding = grounding;
      }

      // Make API call with abort signal
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: controller.signal, // Add abort signal
      });
      
      logger.info('PromptBar: API response received', { 
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        isStreaming: streamingEnabled
      });

      if (!response.ok) {
        logger.error('PromptBar: API response not ok', { 
          status: response.status,
          statusText: response.statusText 
        });
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      // Handle streaming vs non-streaming responses
      if (streamingEnabled) {
        logger.info('PromptBar: Processing streaming response');
        
        if (!response.body) {
          throw new Error('No response body for streaming');
        }

        // Notify that streaming started with configuration
        const streamingConfig = {
          groundingEnabled: grounding.enabled,
          modelSupportsThinking: !!supportsThinking
        };
        onStreamingStart?.(streamingConfig);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let fullMessage = '';
        let fullThoughts = '';
        let audioData: string | undefined;

        // Create placeholder message for streaming updates
        const placeholderMessage = { 
          role: 'model' as const, 
          content: '',
          modelId: selectedModel
        };
        addMessageToNode(node.id, placeholderMessage, false);

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              logger.info('PromptBar: Streaming complete');
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  switch (data.type) {
                    case 'thought':
                      fullThoughts += data.content;
                      logger.debug('PromptBar: Received thought chunk', { length: data.content.length });
                      onStreamingThought?.(data.content);
                      
                      // Update the placeholder message with thoughts
                      const { nodes } = useChatStore.getState();
                      const currentNode = nodes.find(n => n.id === node.id);
                      if (currentNode && currentNode.data.chatHistory.length > 0) {
                        const lastMessage = currentNode.data.chatHistory[currentNode.data.chatHistory.length - 1];
                        if (lastMessage.role === 'model' && lastMessage.modelId === selectedModel) {
                          const currentContent = fullThoughts ? 
                            `**Thoughts:**\n${fullThoughts}${fullMessage ? `\n\n---\n\n**Answer:**\n${fullMessage}` : ''}` : 
                            fullMessage;
                          lastMessage.content = currentContent;
                          // Trigger re-render
                          useChatStore.setState({ nodes: [...nodes] });
                        }
                      }
                      break;
                      
                    case 'message':
                      fullMessage += data.content;
                      logger.debug('PromptBar: Received message chunk', { length: data.content.length });
                      onStreamingMessage?.(data.content);
                      
                      // Update the placeholder message with accumulated content
                      const { nodes: messageNodes } = useChatStore.getState();
                      const messageCurrentNode = messageNodes.find(n => n.id === node.id);
                      if (messageCurrentNode && messageCurrentNode.data.chatHistory.length > 0) {
                        const lastMessage = messageCurrentNode.data.chatHistory[messageCurrentNode.data.chatHistory.length - 1];
                        if (lastMessage.role === 'model' && lastMessage.modelId === selectedModel) {
                          const currentContent = fullThoughts ? 
                            `**Thoughts:**\n${fullThoughts}\n\n---\n\n**Answer:**\n${fullMessage}` : 
                            fullMessage;
                          lastMessage.content = currentContent;
                          // Trigger re-render
                          useChatStore.setState({ nodes: [...messageNodes] });
                        }
                      }
                      break;
                      
                    case 'grounding':
                      if (data.groundingMetadata) {
                        console.log('🔍 PROMPTBAR DEBUG: Received grounding metadata from streaming', {
                          groundingMetadata: data.groundingMetadata,
                          citationsCount: data.groundingMetadata.citations?.length || 0,
                          searchQueriesCount: data.groundingMetadata.webSearchQueries?.length || 0,
                          hasSearchEntryPoint: !!data.groundingMetadata.searchEntryPoint,
                          selectedModel,
                          nodeId: node.id
                        });

                        logger.debug('PromptBar: Received grounding metadata', { 
                          citationsCount: data.groundingMetadata.citations?.length || 0,
                          searchQueriesCount: data.groundingMetadata.webSearchQueries?.length || 0
                        });
                        onStreamingGrounding?.(data.groundingMetadata);
                        
                        // Update the placeholder message with grounding metadata
                        const { nodes: groundingNodes } = useChatStore.getState();
                        const groundingCurrentNode = groundingNodes.find(n => n.id === node.id);
                        if (groundingCurrentNode && groundingCurrentNode.data.chatHistory.length > 0) {
                          const lastMessage = groundingCurrentNode.data.chatHistory[groundingCurrentNode.data.chatHistory.length - 1];
                          if (lastMessage.role === 'model' && lastMessage.modelId === selectedModel) {
                            (lastMessage as any).groundingMetadata = data.groundingMetadata;
                            console.log('🔍 PROMPTBAR DEBUG: Updated message with grounding metadata', {
                              messageIndex: groundingCurrentNode.data.chatHistory.length - 1,
                              nodeId: node.id,
                              groundingMetadata: data.groundingMetadata
                            });
                            useChatStore.setState({ nodes: [...groundingNodes] });
                          }
                        }
                      } else if (data.content) {
                        // Handle loading state messages (like "Searching the web...")
                        console.log('🔍 PROMPTBAR DEBUG: Received grounding loading state', {
                          content: data.content,
                          selectedModel,
                          nodeId: node.id
                        });
                        
                        logger.debug('PromptBar: Received grounding loading state', { 
                          content: data.content
                        });
                        
                        // Notify about the loading state
                        onStreamingGrounding?.({ loadingMessage: data.content });
                      } else {
                        console.log('🔍 PROMPTBAR DEBUG: Received grounding chunk without metadata or content', {
                          data,
                          selectedModel,
                          nodeId: node.id
                        });
                      }
                      break;
                      
                    case 'complete':
                      if (data.audioData) {
                        audioData = data.audioData;
                        logger.info('PromptBar: Received audio data', { length: data.audioData.length });
                      }
                      logger.info('PromptBar: Streaming response complete', { 
                        messageLength: fullMessage.length,
                        thoughtsLength: fullThoughts.length,
                        hasAudio: !!audioData
                      });
                      onStreamingComplete?.();
                      break;
                      
                    case 'error':
                      logger.error('PromptBar: Streaming error', { error: data.content });
                      onStreamingError?.(data.content);
                      throw new Error(data.content);
                      
                    default:
                      logger.warn('PromptBar: Unknown chunk type', { type: data.type });
                  }
                } catch (e) {
                  logger.warn('PromptBar: Failed to parse chunk', { line });
                }
              }
            }
          }

          // Final update with complete message and audio if available
          const finalContent = fullThoughts ? 
            `**Thoughts:**\n${fullThoughts}\n\n---\n\n**Answer:**\n${fullMessage}` : 
            fullMessage;

          const finalMessage: any = { 
            role: 'model' as const, 
            content: finalContent,
            modelId: selectedModel
          };

          if (audioData) {
            finalMessage.attachments = [{
              name: 'audio_response.wav',
              type: 'audio/wav',
              data: audioData,
              previewUrl: `data:audio/wav;base64,${audioData}`
            }];
          }

          // Replace the placeholder with final message
          const { nodes } = useChatStore.getState();
          const currentNode = nodes.find(n => n.id === node.id);
          if (currentNode && currentNode.data.chatHistory.length > 0) {
            const lastMessage = currentNode.data.chatHistory[currentNode.data.chatHistory.length - 1];
            if (lastMessage.role === 'model' && lastMessage.modelId === selectedModel) {
              Object.assign(lastMessage, finalMessage);
              // Preserve grounding metadata if it exists
              if ((lastMessage as any).groundingMetadata) {
                finalMessage.groundingMetadata = (lastMessage as any).groundingMetadata;
              }
              useChatStore.setState({ nodes: [...nodes] });
            }
          }

        } catch (streamingError) {
          logger.error('PromptBar: Streaming failed', { error: streamingError });
          onStreamingError?.(streamingError instanceof Error ? streamingError.message : 'Streaming failed');
          throw streamingError;
        } finally {
          reader.releaseLock();
        }

      } else {
        // Handle non-streaming response (existing logic)
        logger.info('PromptBar: Processing non-streaming response');
        
        const data = await response.json();
        logger.info('PromptBar: API response data received', { 
          hasText: !!data.text,
          hasAudio: !!data.audio,
          hasImages: !!data.images,
          hasError: !!data.error,
          imageCount: data.images?.length || 0
        });
        
        // Handle different response types (existing logic)
        if (data.text) {
          logger.info('PromptBar: Processing text response', { 
            responseLength: data.text.length,
            preview: data.text.substring(0, 100) + (data.text.length > 100 ? '...' : ''),
            hasGroundingMetadata: !!data.groundingMetadata
          });
          
          const modelMessage: any = { 
            role: 'model' as const, 
            content: data.text,
            modelId: selectedModel
          };
          
          // Add grounding metadata if present
          if (data.groundingMetadata) {
            console.log('🔍 PROMPTBAR DEBUG: Non-streaming response with grounding metadata', {
              groundingMetadata: data.groundingMetadata,
              hasSearchQueries: !!data.groundingMetadata.webSearchQueries,
              searchQueriesCount: data.groundingMetadata.webSearchQueries?.length || 0,
              hasCitations: !!data.groundingMetadata.citations,
              citationsCount: data.groundingMetadata.citations?.length || 0,
              hasSearchEntryPoint: !!data.groundingMetadata.searchEntryPoint,
              selectedModel,
              nodeId: node.id
            });

            modelMessage.groundingMetadata = data.groundingMetadata;
            logger.debug('PromptBar: Added grounding metadata to message', {
              hasSearchQueries: !!data.groundingMetadata.webSearchQueries,
              searchQueriesCount: data.groundingMetadata.webSearchQueries?.length || 0,
              hasCitations: !!data.groundingMetadata.citations,
              citationsCount: data.groundingMetadata.citations?.length || 0,
              hasSearchEntryPoint: !!data.groundingMetadata.searchEntryPoint
            });
          } else {
            console.log('🔍 PROMPTBAR DEBUG: Non-streaming response without grounding metadata', {
              selectedModel,
              nodeId: node.id,
              responseLength: data.text.length
            });
          }
          
          addMessageToNode(node.id, modelMessage, false);
          logger.debug('PromptBar: Text response added to node');
          
        } else if (data.audio) {
          logger.info('PromptBar: Processing audio response', { 
            mimeType: data.audio.mimeType,
            dataLength: data.audio.data?.length || 0
          });
          
          const modelMessage = { 
            role: 'model' as const, 
            content: '[Audio Response]',
            modelId: selectedModel,
            attachments: [{
              name: 'audio_response.wav',
              type: data.audio.mimeType || 'audio/wav',
              data: data.audio.data,
              previewUrl: `data:${data.audio.mimeType || 'audio/wav'};base64,${data.audio.data}`
            }]
          };
          addMessageToNode(node.id, modelMessage, false);
          logger.debug('PromptBar: Audio response added to node');
          
        } else if (data.images && data.images.length > 0) {
          logger.info('PromptBar: Processing image response', { 
            imageCount: data.images.length,
            images: data.images.map((img: any, idx: number) => ({
              index: idx,
              mimeType: img.mimeType,
              dataLength: img.data?.length || 0
            }))
          });
          
          const imageAttachments = data.images.map((img: any, idx: number) => ({
            name: `generated_image_${idx + 1}.png`,
            type: img.mimeType || 'image/png',
            data: img.data,
            previewUrl: `data:${img.mimeType || 'image/png'};base64,${img.data}`
          }));
          
          const modelMessage = { 
            role: 'model' as const, 
            content: '[Generated Images]',
            modelId: selectedModel,
            attachments: imageAttachments
          };
          addMessageToNode(node.id, modelMessage, false);
          logger.debug('PromptBar: Image response added to node');
          
        } else if (data.error) {
          logger.error('PromptBar: API returned error', { error: data.error });
          addMessageToNode(node.id, { role: 'model', content: `Error: ${data.error}`, modelId: selectedModel });
          
        } else {
          logger.warn('PromptBar: Unknown response format', { responseKeys: Object.keys(data) });
          addMessageToNode(node.id, { role: 'model', content: 'Error: Unknown response format from server', modelId: selectedModel });
        }
      }

      logger.info('PromptBar: Request completed successfully');

    } catch (error: any) {
      // Handle aborted requests
      if (error.name === 'AbortError') {
        logger.info('PromptBar: Request was aborted by user');
        return; // Don't add error message for user-initiated cancellation
      }
      
      logger.error('PromptBar: Request failed', { 
        error: error.message,
        stack: error.stack,
        nodeId: node.id,
        selectedModel
      });
      addMessageToNode(node.id, { role: 'model', content: `Error: ${error.message}`, modelId: selectedModel });
    } finally {
      setIsLoading(false);
      setAbortController(null);
      setLastPrompt('');
      setLastAttachments([]);
      logger.debug('PromptBar: Loading state set to false and cleanup completed');
    }
  };


  return (
    <div className="w-full flex justify-center items-end pointer-events-none">
      <div
        className={`
          w-full ${isMobile ? 'max-w-full' : 'max-w-3xl'} bg-neutral-900/80 backdrop-blur-md border border-white/10
          ${isMobile ? 'rounded-xl mx-2' : 'rounded-2xl'} shadow-lg flex flex-col pointer-events-auto transition-colors
          ${isDragOver ? 'ring-2 ring-purple-400/50 bg-purple-900/20' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className={`absolute inset-0 bg-purple-600/20 border-2 border-dashed border-purple-400 ${
            isMobile ? 'rounded-xl' : 'rounded-2xl'
          } flex items-center justify-center z-10 pointer-events-none`}>
            <div className="text-purple-300 text-center">
              <FiUpload size={isMobile ? 20 : 24} className="mx-auto mb-2" />
              <p className={isMobile ? 'text-sm' : ''}>Drop files here</p>
            </div>
          </div>
        )}
        
        {/* Edit Mode Indicator */}
        {editingState?.isEditing && (
          <div className={`${isMobile ? 'p-2' : 'p-3'} border-b border-blue-500/20 bg-blue-900/10`}>
            <div className="flex items-center gap-2 text-blue-300">
              <FiEdit3 size={isMobile ? 14 : 16} />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>
                Editing message - Make changes and click "Save & Resend"
              </span>
            </div>
          </div>
        )}

        {/* Advanced Options Panel */}
        {showAdvancedOptions && !editingState?.isEditing && (
          <div className={`${isMobile ? 'p-2' : 'p-3'} border-b border-white/10`}>
            <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
              {/* Thinking Tag */}
              {supportsThinking && (
                <button
                  onClick={() => setEnableThinking(!enableThinking)}
                  className={`
                    flex items-center gap-2 ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-full font-medium transition-all
                    ${enableThinking 
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50 shadow-md' 
                      : 'bg-neutral-800/60 text-white/60 border border-white/10 hover:bg-neutral-700/60'
                    }
                  `}
                >
                  <LuBrain size={isMobile ? 14 : 16} />
                  Thinking
                </button>
              )}

              {/* Web Search Tag */}
              {supportsGrounding && (
                <button
                  onClick={() => setGrounding(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`
                    flex items-center gap-2 ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-full font-medium transition-all
                    ${grounding.enabled 
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50 shadow-md' 
                      : 'bg-neutral-800/60 text-white/60 border border-white/10 hover:bg-neutral-700/60'
                    }
                  `}
                >
                  <TbBrandGoogle size={isMobile ? 14 : 16} />
                  {isMobile ? 'Web' : 'Web Search'}
                </button>
              )}
            </div>
            
            {/* Dynamic Threshold for Web Search - Only show on desktop or when enabled */}
            {grounding.enabled && selectedModelDef?.apiModel.includes('1.5') && !isMobile && (
              <div className="mt-3 p-2 bg-neutral-800/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-white/60">Dynamic Threshold:</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={grounding.dynamicThreshold || 0.3}
                    onChange={(e) => setGrounding(prev => ({ 
                      ...prev, 
                      dynamicThreshold: parseFloat(e.target.value) 
                    }))}
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-white/60 w-8">
                    {grounding.dynamicThreshold || 0.3}
                  </span>
                </div>
              </div>
            )}

          </div>
        )}

        <div className={`${isMobile ? 'p-1' : 'p-1'} flex-grow`}>
          {attachments.length > 0 && (
            <div className={`${isMobile ? 'mb-2' : 'mb-3'} flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
              {attachments.map((att, index) => (
                <div key={index} className="relative group bg-neutral-700/60 rounded-lg p-1">
                  {att.file.type.startsWith('image/') ? (
                    <img src={att.previewUrl} alt={att.file.name} className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} object-cover rounded-md`} />
                  ) : att.file.type.startsWith('audio/') ? (
                    <div className={`${isMobile ? 'h-12 w-20' : 'h-16 w-24'} flex flex-col items-center justify-center text-white p-1 rounded-md`}>
                      <FiFileText size={isMobile ? 16 : 20} />
                      <span className={`${isMobile ? 'text-xs' : 'text-xs'} truncate w-full text-center mt-1`}>{att.file.name}</span>
                    </div>
                  ) : att.file.type === 'application/pdf' ? (
                    <div className={`${isMobile ? 'h-12 w-20' : 'h-16 w-24'} flex flex-col items-center justify-center text-white p-1 rounded-md bg-red-600/20`}>
                      <FiFileText size={isMobile ? 16 : 20} className="text-red-300" />
                      <span className={`${isMobile ? 'text-xs' : 'text-xs'} truncate w-full text-center mt-1 text-red-200`}>PDF</span>
                    </div>
                  ) : att.file.type.startsWith('text/') || att.file.type.includes('javascript') || att.file.type.includes('python') ? (
                    <div className={`${isMobile ? 'h-12 w-20' : 'h-16 w-24'} flex flex-col items-center justify-center text-white p-1 rounded-md bg-blue-600/20`}>
                      <FiFileText size={isMobile ? 16 : 20} className="text-blue-300" />
                      <span className={`${isMobile ? 'text-xs' : 'text-xs'} truncate w-full text-center mt-1 text-blue-200`}>
                        {att.file.type.includes('javascript') ? 'JS' : 
                         att.file.type.includes('python') ? 'PY' : 
                         att.file.type.includes('html') ? 'HTML' :
                         att.file.type.includes('css') ? 'CSS' :
                         att.file.type.includes('markdown') ? 'MD' :
                         att.file.type.includes('csv') ? 'CSV' :
                         att.file.type.includes('xml') ? 'XML' :
                         'TXT'}
                      </span>
                    </div>
                  ) : (
                    <div className={`${isMobile ? 'h-12 w-20' : 'h-16 w-24'} flex flex-col items-center justify-center text-white p-1 rounded-md`}>
                      <FiPaperclip size={isMobile ? 16 : 20} />
                      <span className={`${isMobile ? 'text-xs' : 'text-xs'} truncate w-full text-center mt-1`}>{att.file.name}</span>
                    </div>
                  )}
                  <button onClick={() => removeAttachment(index)} className={`absolute ${isMobile ? '-top-1 -right-1' : '-top-1.5 -right-1.5'} bg-gray-800 hover:bg-gray-700 rounded-full ${isMobile ? 'p-0.5' : 'p-0.5'} text-white opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <FiX size={isMobile ? 12 : 14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                logger.debug('PromptBar: Input changed', { 
                  length: e.target.value.length,
                  preview: e.target.value.substring(0, 50) + (e.target.value.length > 50 ? '...' : '')
                });
              }}
              className={`
                w-full outline-none
                ${isMobile ? 'text-sm' : 'text-base'} text-white placeholder-purple-300/60 resize-none rounded-xl ${
                  isMobile ? 'px-3 py-2' : 'px-4 py-3'
                }
                scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent
                transition-all
              `}
              placeholder={isMobile ? "Ask anything..." : "Ask anything..."}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  logger.debug('PromptBar: Enter key pressed, triggering LLM request');
                  handleAskLLM();
                }
              }}
              rows={1}
              style={{ 
                minHeight: isMobile ? '2rem' : '2.5rem', 
                lineHeight: 1.5, 
                scrollbarColor: 'rgba(168, 85, 247, 0.3) transparent', 
                scrollbarWidth: 'thin' 
              }}
            />
          </div>
        </div>
        <div className={`${isMobile ? 'px-2 py-2' : 'px-3 py-2'} flex items-center justify-between`}>
          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
            <button 
              onClick={() => {
                logger.debug('PromptBar: File upload button clicked');
                fileInputRef.current?.click();
              }} 
              className={`text-white/70 hover:text-white transition-colors ${isMobile ? 'p-1' : 'p-1.5'} rounded-full hover:bg-white/10`}
              title="Upload Files"
            >
              <FiPlus size={isMobile ? 18 : 22} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              hidden
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp, image/heic, image/heif, application/pdf, text/plain, text/html, text/css, text/markdown, text/csv, text/xml, text/rtf, application/x-javascript, text/javascript, application/x-python, text/x-python"
            />
            
            {supportsAudioInput && (
              <>
                <button 
                  onClick={() => {
                    logger.debug('PromptBar: Audio upload button clicked');
                    audioInputRef.current?.click();
                  }} 
                  className={`text-white/70 hover:text-white transition-colors ${isMobile ? 'p-1' : 'p-1.5'} rounded-full hover:bg-white/10`}
                  title="Upload Audio"
                >
                  <FiFileText size={isMobile ? 16 : 20} />
                </button>
                <input 
                  type="file" 
                  ref={audioInputRef} 
                  multiple 
                  hidden
                  onChange={handleAudioInput}
                  accept="audio/*"
                />
              </>
            )}
            
            <div className="flex-shrink-0">
              <select
                value={selectedModel}
                onChange={(e) => {
                  const newModel = e.target.value;
                  logger.info('PromptBar: Model selection changed', { 
                    previousModel: selectedModel,
                    newModel,
                    modelDef: models.find(m => m.id === newModel)
                  });
                  setSelectedModel(newModel);
                  
                  // Get new model definition to set appropriate defaults
                  const newModelDef = models.find(m => m.id === newModel);
                  
                  // Reset thinking toggle based on model support
                  setEnableThinking(!!newModelDef?.isThinking);
                  
                  // Reset grounding toggle based on model support
                  if (newModelDef?.supportsGrounding) {
                    // For models that support direct grounding, keep it disabled by default
                    setGrounding({ enabled: false, dynamicThreshold: 0.3 });
                  } else {
                    // For models that don't support grounding, disable it
                    setGrounding({ enabled: false, dynamicThreshold: 0.3 });
                  }
                  
                }}
                className={`bg-transparent ${isMobile ? 'text-xs' : 'text-sm'} text-white/80 outline-none border-none pr-2 ${
                  isMobile ? 'h-6 min-w-[100px]' : 'h-8'
                } rounded w-auto appearance-none cursor-pointer`}
              >
                {models.map(model => (
                  <option key={model.id} value={model.id} className="bg-neutral-800">
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
            {/* Advanced Options Toggle - Show on mobile as compact button */}
            {isMobile ? (
              <button 
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className={`text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 ${
                  showAdvancedOptions ? 'bg-white/10 text-white' : ''
                }`}
                title="Options"
              >
                <IoOptionsOutline size={16} />
              </button>
            ) : (
              <button 
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className={`text-white/70 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 ${
                  showAdvancedOptions ? 'bg-white/10 text-white' : ''
                }`}
                title="Advanced Options"
              >
                <IoOptionsOutline size={20} />
              </button>
            )}
            
            {/* Voice Recording Button */}
            <button 
              onClick={() => onShowVoiceModal?.()}
              className={`transition-colors ${isMobile ? 'p-1' : 'p-1.5'} rounded-full hover:bg-white/10 ${
                isRecording ? 'text-red-400' : 'text-white/70 hover:text-white'
              }`} 
              disabled={!supportsAudioInput}
              title={supportsAudioInput ? "Voice Input" : "Voice input not supported for this model"}
            >
              <FiMic size={isMobile ? 16 : 20} />
            </button>
            
            {/* Cancel Edit Button - Only show in edit mode */}
            {editingState?.isEditing && (
              <button
                onClick={onCancelEdit}
                className={`
                  ${isMobile ? 'w-8 h-8' : 'w-9 h-9'} rounded-full text-white
                  flex items-center justify-center transition-colors
                  bg-gray-600 hover:bg-gray-500 mr-2
                `}
                title="Cancel edit"
              >
                <FiX size={isMobile ? 14 : 18} />
              </button>
            )}
            
            <button
              onClick={isLoading ? handleCancelRequest : handleAskLLM}
              disabled={shouldDisableSend && !isLoading}
              className={`
                ${isMobile ? 'w-8 h-8' : 'w-9 h-9'} rounded-full text-white
                flex items-center justify-center transition-colors
                ${isLoading 
                  ? 'bg-red-600 hover:bg-red-500' 
                  : editingState?.isEditing 
                    ? 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-600'
                    : 'bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-600'
                }
              `}
              title={isLoading ? "Stop request" : editingState?.isEditing ? "Save & Resend" : "Send message"}
            >
              {isLoading ? (
                <FaStop size={isMobile ? 12 : 14} />
              ) : (
                <FiSend size={isMobile ? 14 : 18} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Model Info Modal */}
      {showModelInfo && selectedModelDef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             onClick={() => setShowModelInfo(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className={`relative z-10 bg-neutral-900 ${isMobile ? 'rounded-lg' : 'rounded-xl'} border border-white/10 ${
            isMobile ? 'p-4 max-w-sm' : 'p-6 max-w-md'
          } w-full`}
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-white`}>{selectedModelDef.name}</h3>
              <button
                onClick={() => setShowModelInfo(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <FiX size={isMobile ? 18 : 20} />
              </button>
            </div>
            
            <div className={`space-y-3 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              <div>
                <span className="text-white/60">Model ID:</span>
                <span className={`text-white ml-2 font-mono ${isMobile ? 'text-xs' : ''}`}>{selectedModelDef.id}</span>
              </div>
              
              <div>
                <span className="text-white/60">Supported Inputs:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedModelDef.supportedInputs.map(input => (
                    <span key={input} className={`${isMobile ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5'} bg-blue-600/20 text-blue-300 rounded text-xs`}>
                      {input}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <span className="text-white/60">Supported Outputs:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedModelDef.supportedOutputs.map(output => (
                    <span key={output} className={`${isMobile ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5'} bg-green-600/20 text-green-300 rounded text-xs`}>
                      {output}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <span className="text-white/60">Capabilities:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedModelDef.capabilities && Object.entries(selectedModelDef.capabilities).map(([key, value]) => 
                    value && (
                      <span key={key} className={`${isMobile ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5'} bg-purple-600/20 text-purple-300 rounded text-xs`}>
                        {key}
                      </span>
                    )
                  )}
                </div>
              </div>
              
              {selectedModelDef.supportsGrounding && (
                <div>
                  <span className="text-white/60">Features:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className={`${isMobile ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5'} bg-yellow-600/20 text-yellow-300 rounded text-xs`}>
                      Web Search
                    </span>
                    {selectedModelDef.supportsCitations && (
                      <span className={`${isMobile ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5'} bg-yellow-600/20 text-yellow-300 rounded text-xs`}>
                        Citations
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
