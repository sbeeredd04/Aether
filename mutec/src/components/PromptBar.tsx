import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiPaperclip, FiX, FiPlus, FiMic } from 'react-icons/fi';
import { useChatStore } from '../store/chatStore';
import { models } from '../utils/models';
import logger from '../utils/logger';

interface PromptBarProps {
  node: any;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

interface Attachment {
  file: File;
  previewUrl: string;
}

export default function PromptBar({ node, isLoading, setIsLoading }: PromptBarProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const addMessageToNode = useChatStore((s) => s.addMessageToNode);
  const getPathToNode = useChatStore((s) => s.getPathToNode);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    logger.debug('PromptBar: Component mounted/updated', { 
      nodeId: node?.id, 
      isLoading, 
      selectedModel,
      attachmentsCount: attachments.length 
    });
  }, [node?.id, isLoading, selectedModel, attachments.length]);

  useEffect(() => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = 'auto';
    const scrollHeight = ta.scrollHeight;
    const maxHeight = 200;
    ta.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    ta.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input]);

  if (!node) {
    logger.warn('PromptBar: No active node provided');
    return null;
  }

  const selectedModelDef = models.find(m => m.id === selectedModel);
  const isAudioOnlyModel = selectedModelDef?.isMultimedia === 'audio' && !selectedModelDef?.apiModel.includes('-live-');
  
  logger.debug('PromptBar: Model selection analysis', {
    selectedModel,
    selectedModelDef: selectedModelDef ? {
      id: selectedModelDef.id,
      name: selectedModelDef.name,
      isMultimedia: selectedModelDef.isMultimedia,
      apiModel: selectedModelDef.apiModel
    } : null,
    isAudioOnlyModel
  });

  // Disable send button for audio models without voice options (for now)
  const shouldDisableSend = isLoading || 
    (!input.trim() && attachments.length === 0) ||
    (isAudioOnlyModel && true); // TODO: Add voice options check

  logger.debug('PromptBar: Send button state', {
    shouldDisableSend,
    isLoading,
    hasInput: !!input.trim(),
    hasAttachments: attachments.length > 0,
    isAudioOnlyModel
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
  
  const handleAskLLM = async () => {
    logger.info('PromptBar: Starting LLM request', { 
      nodeId: node.id,
      prompt: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      selectedModel,
      attachmentsCount: attachments.length 
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
        historyLength: history.length
      });

      // Make API call
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          modelId: selectedModel,
          history,
          prompt: input,
          attachments: attachmentData,
          // TODO: Add ttsOptions when voice selection is implemented
        }),
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
          preview: data.text.substring(0, 100) + (data.text.length > 100 ? '...' : '')
        });
        
        const modelMessage = { role: 'model' as const, content: data.text };
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

  return (
    <div className="w-full flex justify-center items-end pointer-events-none">
      <div
        className="
          w-full max-w-3xl bg-neutral-900/80 backdrop-blur-md
          rounded-2xl shadow-lg flex flex-col pointer-events-auto
        "
      >
        <div className="p-3 flex-grow">
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((att, index) => (
                <div key={index} className="relative group bg-neutral-700/60 rounded-lg p-1">
                   {att.file.type.startsWith('image/') ? (
                    <img src={att.previewUrl} alt={att.file.name} className="h-16 w-16 object-cover rounded-md" />
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
            <button className="text-white/70 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10" disabled>
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
    </div>
  );
}
