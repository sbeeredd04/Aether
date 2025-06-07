import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiPaperclip, FiX, FiPlus, FiMic, FiSettings, FiSearch, FiVolume2, FiUpload } from 'react-icons/fi';
import { useChatStore } from '../store/chatStore';
import { models, getTTSVoices, getModelById } from '../utils/models';
import logger from '../utils/logger';

interface PromptBarProps {
  node: any;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onShowVoiceModal?: () => void;
  onShowImageModal?: (imageSrc: string, imageTitle: string) => void;
  voiceTranscript?: string;
  onClearVoiceTranscript?: () => void;
}

interface Attachment {
  file: File;
  previewUrl: string;
}

interface TTSOptions {
  voiceName?: string;
  multiSpeaker?: Array<{ speaker: string; voiceName: string }>;
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
  onClearVoiceTranscript 
}: PromptBarProps) {
  // Early return check BEFORE any hooks
  if (!node) {
    logger.warn('PromptBar: No active node provided');
    return null;
  }

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const [enableThinking, setEnableThinking] = useState(true);
  const [ttsOptions, setTtsOptions] = useState<TTSOptions>({});
  const [grounding, setGrounding] = useState<GroundingOptions>({ enabled: false, dynamicThreshold: 0.3 });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // New modal states
  const [showModelInfo, setShowModelInfo] = useState(false);
  
  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  
  const addMessageToNode = useChatStore((s) => s.addMessageToNode);
  const getPathToNode = useChatStore((s) => s.getPathToNode);

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
      groundingEnabled: grounding.enabled,
      hasTtsOptions: !!ttsOptions.voiceName || !!ttsOptions.multiSpeaker
    });
  }, [node?.id, isLoading, selectedModel, attachments.length, enableThinking, grounding.enabled, ttsOptions]);

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

  const selectedModelDef = models.find(m => m.id === selectedModel);
  const isAudioOnlyModel = selectedModelDef?.isMultimedia === 'audio' && !selectedModelDef?.apiModel.includes('-live-');
  const isTTSModel = selectedModelDef?.capabilities?.tts;
  const supportsThinking = selectedModelDef?.isThinking;
  const supportsGrounding = selectedModelDef?.supportsGrounding;
  const supportsAudioInput = selectedModelDef?.supportedInputs.includes('audio');
  
  logger.debug('PromptBar: Model capabilities analysis', {
    selectedModel,
    selectedModelDef: selectedModelDef ? {
      id: selectedModelDef.id,
      name: selectedModelDef.name,
      isMultimedia: selectedModelDef.isMultimedia,
      apiModel: selectedModelDef.apiModel,
      capabilities: selectedModelDef.capabilities
    } : null,
    isAudioOnlyModel,
    isTTSModel,
    supportsThinking,
    supportsGrounding,
    supportsAudioInput
  });

  // Disable send button for certain conditions
  const shouldDisableSend = isLoading || 
    (!input.trim() && attachments.length === 0) ||
    (isAudioOnlyModel && !isTTSModel && true); // TODO: Add voice input check

  logger.debug('PromptBar: Send button state', {
    shouldDisableSend,
    isLoading,
    hasInput: !!input.trim(),
    hasAttachments: attachments.length > 0,
    isAudioOnlyModel,
    isTTSModel
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

  const handleAskLLM = async () => {
    logger.info('PromptBar: Starting LLM request', { 
      nodeId: node.id,
      prompt: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      selectedModel,
      attachmentsCount: attachments.length,
      enableThinking,
      groundingEnabled: grounding.enabled,
      hasTtsOptions: !!ttsOptions.voiceName || !!ttsOptions.multiSpeaker
    });

    if (!input.trim() && attachments.length === 0) {
      logger.warn('PromptBar: Request blocked - no input or attachments');
      return;
    }
    
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
      
      // Clear input and attachments
      setInput('');
      setAttachments([]);
      logger.debug('PromptBar: Input and attachments cleared');

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
      const savedSettings = localStorage.getItem('mutec-settings');
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

      logger.info('PromptBar: Making API request', {
        endpoint: '/api/chat',
        modelId: selectedModel,
        hasPrompt: !!input,
        attachmentsCount: attachmentData.length,
        historyLength: history.length,
        enableThinking: supportsThinking ? enableThinking : undefined,
        groundingEnabled: supportsGrounding ? grounding.enabled : undefined,
        hasTtsOptions: isTTSModel && (!!ttsOptions.voiceName || !!ttsOptions.multiSpeaker)
      });

      // Prepare request payload
      const requestPayload: any = {
        apiKey,
        modelId: selectedModel,
        history,
        prompt: input,
        attachments: attachmentData,
      };

      // Add model-specific options
      if (supportsThinking) {
        requestPayload.enableThinking = enableThinking;
      }

      if (supportsGrounding) {
        requestPayload.grounding = grounding;
      }

      if (isTTSModel && (ttsOptions.voiceName || ttsOptions.multiSpeaker)) {
        requestPayload.ttsOptions = ttsOptions;
      }

      // Add grounding pipeline flag if model supports it
      const currentModel = getModelById(selectedModel);
      if (currentModel?.useGroundingPipeline) {
        requestPayload.useGroundingPipeline = true;
        // Ensure grounding is enabled for pipeline
        requestPayload.grounding = { enabled: true, dynamicThreshold: 0.3 };
      }

      // Make API call
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });
      
      logger.info('PromptBar: API response received', { 
        status: response.status,
        statusText: response.statusText,
        ok: response.ok 
      });

      if (!response.ok) {
        logger.error('PromptBar: API response not ok', { 
          status: response.status,
          statusText: response.statusText 
        });
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('PromptBar: API response data received', { 
        hasText: !!data.text,
        hasAudio: !!data.audio,
        hasImages: !!data.images,
        hasError: !!data.error,
        imageCount: data.images?.length || 0
      });
      
      // Handle different response types
      if (data.text) {
        logger.info('PromptBar: Processing text response', { 
          responseLength: data.text.length,
          preview: data.text.substring(0, 100) + (data.text.length > 100 ? '...' : ''),
          hasGroundingMetadata: !!data.groundingMetadata
        });
        
        const modelMessage: any = { 
          role: 'model' as const, 
          content: data.text 
        };
        
        // Add grounding metadata if present
        if (data.groundingMetadata) {
          modelMessage.groundingMetadata = data.groundingMetadata;
          logger.debug('PromptBar: Added grounding metadata to message', {
            hasSearchQueries: !!data.groundingMetadata.webSearchQueries,
            searchQueriesCount: data.groundingMetadata.webSearchQueries?.length || 0,
            hasCitations: !!data.groundingMetadata.citations,
            citationsCount: data.groundingMetadata.citations?.length || 0,
            hasSearchEntryPoint: !!data.groundingMetadata.searchEntryPoint
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
          attachments: imageAttachments
        };
        addMessageToNode(node.id, modelMessage, false);
        logger.debug('PromptBar: Image response added to node');
        
      } else if (data.error) {
        logger.error('PromptBar: API returned error', { error: data.error });
        addMessageToNode(node.id, { role: 'model', content: `Error: ${data.error}` });
        
      } else {
        logger.warn('PromptBar: Unknown response format', { responseKeys: Object.keys(data) });
        addMessageToNode(node.id, { role: 'model', content: 'Error: Unknown response format from server' });
      }

      logger.info('PromptBar: Request completed successfully');

    } catch (error: any) {
      logger.error('PromptBar: Request failed', { 
        error: error.message,
        stack: error.stack,
        nodeId: node.id,
        selectedModel
      });
      addMessageToNode(node.id, { role: 'model', content: `Error: ${error.message}` });
    } finally {
      setIsLoading(false);
      logger.debug('PromptBar: Loading state set to false');
    }
  };

  const ttsVoices = getTTSVoices();

  return (
    <div className="w-full flex justify-center items-end pointer-events-none">
      <div
        className={`
          w-full max-w-3xl bg-neutral-900/80 backdrop-blur-md
          rounded-2xl shadow-lg flex flex-col pointer-events-auto transition-colors
          ${isDragOver ? 'ring-2 ring-purple-400/50 bg-purple-900/20' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-purple-600/20 border-2 border-dashed border-purple-400 rounded-2xl 
                          flex items-center justify-center z-10 pointer-events-none">
            <div className="text-purple-300 text-center">
              <FiUpload size={24} className="mx-auto mb-2" />
              <p>Drop files here</p>
            </div>
          </div>
        )}
        {/* Advanced Options Panel */}
        {showAdvancedOptions && (
          <div className="p-3 border-b border-white/10 space-y-3">
            {/* Thinking Toggle */}
            {supportsThinking && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <FiSettings size={16} />
                  Thinking Mode
                </label>
                <button
                  onClick={() => setEnableThinking(!enableThinking)}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    enableThinking ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    enableThinking ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            )}

            {/* Grounding Toggle */}
            {supportsGrounding && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <FiSearch size={16} />
                    Web Search
                  </label>
                  <button
                    onClick={() => setGrounding(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      grounding.enabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      grounding.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {grounding.enabled && selectedModelDef?.apiModel.includes('1.5') && (
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
                )}
              </div>
            )}

            {/* TTS Options */}
            {isTTSModel && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <FiVolume2 size={16} />
                  Voice Options
                </label>
                <select
                  value={ttsOptions.voiceName || ''}
                  onChange={(e) => setTtsOptions(prev => ({ ...prev, voiceName: e.target.value || undefined }))}
                  className="w-full bg-neutral-800 text-white text-sm rounded px-2 py-1 border border-white/10"
                >
                  <option value="">Default Voice</option>
                  {ttsVoices.map(voice => (
                    <option key={voice.id} value={voice.id}>{voice.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="p-3 flex-grow">
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((att, index) => (
                <div key={index} className="relative group bg-neutral-700/60 rounded-lg p-1">
                   {att.file.type.startsWith('image/') ? (
                    <img src={att.previewUrl} alt={att.file.name} className="h-16 w-16 object-cover rounded-md" />
                   ) : att.file.type.startsWith('audio/') ? (
                    <div className="h-16 w-24 flex flex-col items-center justify-center text-white p-1 rounded-md">
                      <FiVolume2 size={20} />
                      <span className="text-xs truncate w-full text-center mt-1">{att.file.name}</span>
                    </div>
                   ) : (
                    <div className="h-16 w-24 flex flex-col items-center justify-center text-white p-1 rounded-md">
                      <FiPaperclip size={20} />
                      <span className="text-xs truncate w-full text-center mt-1">{att.file.name}</span>
                    </div>
                   )}
                  <button onClick={() => removeAttachment(index)} className="absolute -top-1.5 -right-1.5 bg-gray-800 hover:bg-gray-700 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
            className="
              w-full bg-transparent outline-none border-none text-base text-white
              placeholder-gray-400/90 resize-none scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent
            "
            placeholder="Ask anything..."
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                logger.debug('PromptBar: Enter key pressed, triggering LLM request');
                handleAskLLM();
              }
            }}
            rows={1}
            style={{ minHeight: '2rem', lineHeight: 1.5, scrollbarColor: 'rgba(255,255,255,0.3) transparent', scrollbarWidth: 'thin' }}
          />
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                logger.debug('PromptBar: File upload button clicked');
                fileInputRef.current?.click();
              }} 
              className="text-white/70 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
              title="Upload Files"
            >
              <FiPlus size={22} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              hidden
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp, image/heic, image/heif, application/pdf"
            />
            
            {supportsAudioInput && (
              <>
                <button 
                  onClick={() => {
                    logger.debug('PromptBar: Audio upload button clicked');
                    audioInputRef.current?.click();
                  }} 
                  className="text-white/70 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
                  title="Upload Audio"
                >
                  <FiVolume2 size={20} />
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
                  // Reset options when model changes
                  setEnableThinking(true);
                  setGrounding({ enabled: false, dynamicThreshold: 0.3 });
                  setTtsOptions({});
                }}
                className="bg-transparent text-sm text-white/80 outline-none border-none pr-2 h-8 rounded w-auto appearance-none cursor-pointer"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id} className="bg-neutral-800">{model.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Advanced Options Toggle */}
            <button 
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className={`text-white/70 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 ${
                showAdvancedOptions ? 'bg-white/10 text-white' : ''
              }`}
              title="Advanced Options"
                          >
                <FiSettings size={20} />
              </button>
            
            {/* Voice Recording Button */}
            <button 
              onClick={() => onShowVoiceModal?.()}
              className={`transition-colors p-1.5 rounded-full hover:bg-white/10 ${
                isRecording ? 'text-red-400' : 'text-white/70 hover:text-white'
              }`} 
              disabled={!supportsAudioInput}
              title={supportsAudioInput ? "Voice Input" : "Voice input not supported for this model"}
            >
              <FiMic size={20} />
            </button>
            
            <button
              onClick={handleAskLLM}
              disabled={shouldDisableSend}
              className="
                w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 text-white
                disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-600
                flex items-center justify-center transition-colors
              "
            >
              {isLoading ? (
                <span className="animate-spin h-5 w-5 block border-2 border-t-transparent border-current rounded-full" />
              ) : (
                <FiSend size={18} />
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
          <div className="relative z-10 bg-neutral-900 rounded-xl border border-white/10 p-6 max-w-md w-full"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{selectedModelDef.name}</h3>
              <button
                onClick={() => setShowModelInfo(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-white/60">Model ID:</span>
                <span className="text-white ml-2 font-mono">{selectedModelDef.id}</span>
              </div>
              
              <div>
                <span className="text-white/60">Supported Inputs:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedModelDef.supportedInputs.map(input => (
                    <span key={input} className="px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded text-xs">
                      {input}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <span className="text-white/60">Supported Outputs:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedModelDef.supportedOutputs.map(output => (
                    <span key={output} className="px-2 py-0.5 bg-green-600/20 text-green-300 rounded text-xs">
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
                      <span key={key} className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded text-xs">
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
                    <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-300 rounded text-xs">
                      Web Search
                    </span>
                    {selectedModelDef.supportsCitations && (
                      <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-300 rounded text-xs">
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
