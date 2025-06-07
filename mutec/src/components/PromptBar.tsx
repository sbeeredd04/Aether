import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiPaperclip, FiX, FiPlus, FiMic } from 'react-icons/fi';
import { useChatStore } from '../store/chatStore';
import { models } from '../utils/models';

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
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = 'auto';
    const scrollHeight = ta.scrollHeight;
    const maxHeight = 200; // Increased max height
    ta.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    ta.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input]);

  if (!node) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const newAttachments: Attachment[] = newFiles.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleAskLLM = async () => {
    if (!input.trim() && attachments.length === 0) return;
    setIsLoading(true);

    const attachmentData = await Promise.all(
      attachments.map(async (att) => {
        const reader = new FileReader();
        return new Promise<{ name: string; type: string; data: string; previewUrl: string }>((resolve) => {
          reader.onload = (e) => {
            resolve({
              name: att.file.name,
              type: att.file.type,
              data: (e.target?.result as string).split(',')[1], // base64
              previewUrl: att.previewUrl
            });
          };
          reader.readAsDataURL(att.file);
        });
      })
    );
    
    const userMessage = { 
      role: 'user' as const, 
      content: input,
      attachments: attachmentData,
    };
    addMessageToNode(node.id, userMessage);
    
    setInput('');
    setAttachments([]);

    const pathMessages = getPathToNode(node.id);
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

    try {
      const savedSettings = localStorage.getItem('mutec-settings');
      if (!savedSettings) throw new Error('API key not found.');
      const settings = JSON.parse(savedSettings);
      const apiKey = settings.apiKey;
      if (!apiKey) throw new Error('API key is empty.');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history, 
          prompt: input, 
          apiKey, 
          model: selectedModel,
          attachments: attachmentData,
        }),
      });
      const data = await response.json();
      if (data.text) {
        const modelMessage = { role: 'model' as const, content: data.text };
        addMessageToNode(node.id, modelMessage, false);
      } else if (data.error) {
        addMessageToNode(node.id, { role: 'model', content: `Error: ${data.error}` });
      }
    } catch (error: any) {
      addMessageToNode(node.id, { role: 'model', content: `Error: ${error.message}` });
    } finally {
      setIsLoading(false);
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
            onChange={(e) => setInput(e.target.value)}
            className="
              w-full bg-transparent outline-none border-none text-base text-white
              placeholder-gray-400/90 resize-none scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent
            "
            placeholder="Ask anything..."
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAskLLM();
              }
            }}
            rows={1}
            style={{ minHeight: '2rem', lineHeight: 1.5, scrollbarColor: 'rgba(255,255,255,0.3) transparent', scrollbarWidth: 'thin' }}
          />
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="text-white/70 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10">
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
                onChange={(e) => setSelectedModel(e.target.value)}
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
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
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
