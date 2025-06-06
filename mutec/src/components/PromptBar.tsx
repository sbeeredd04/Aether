import React, { useState, useRef, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';
import { useChatStore } from '../store/chatStore';

interface PromptBarProps {
  node: any;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function PromptBar({ node, isLoading, setIsLoading }: PromptBarProps) {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const addMessageToNode = useChatStore((s) => s.addMessageToNode);
  const getPathToNode = useChatStore((s) => s.getPathToNode);

  // Reference to the textarea so we can adjust its height dynamically
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adjust textarea height whenever `input` changes
  useEffect(() => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = 'auto';
    const scrollHeight = ta.scrollHeight;
    const minHeight = 32; // 2rem
    const maxHeight = 120; // 7.5rem
    if (scrollHeight <= minHeight) {
      ta.style.height = `${minHeight}px`;
      ta.style.overflowY = 'hidden';
    } else if (scrollHeight > minHeight && scrollHeight <= maxHeight) {
      ta.style.height = `${scrollHeight}px`;
      ta.style.overflowY = 'hidden';
    } else {
      ta.style.height = `${maxHeight}px`;
      ta.style.overflowY = 'auto';
    }
  }, [input]);

  // Return null early, but after hooks are declared
  if (!node) return null;

  const handleAskLLM = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    const userMessage = { role: 'user' as const, content: input };
    addMessageToNode(node.id, userMessage);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const pathMessages = getPathToNode(node.id);
    const history = pathMessages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));
    try {
      const savedSettings = localStorage.getItem('mutec-settings');
      if (!savedSettings) throw new Error('API key not found. Please set it in the settings panel.');
      const settings = JSON.parse(savedSettings);
      const apiKey = settings.apiKey;
      if (!apiKey) throw new Error('API key is empty. Please set it in the settings panel.');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, prompt: input, apiKey }),
      });
      const data = await response.json();
      if (data.text) {
        const modelMessage = { role: 'model' as const, content: data.text };
        addMessageToNode(node.id, modelMessage, false);
      } else if (data.error) {
        addMessageToNode(node.id, { role: 'model' as const, content: `Error: ${data.error}` });
      }
    } catch (error: any) {
      addMessageToNode(node.id, { role: 'model', content: `Error: ${error.message || error}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center items-end pointer-events-none">
      <div
        className="
          backdrop-blur-sm
          bg-black/30
          border border-white/10
          rounded-xl
          flex items-center
          w-full max-w-3xl
          px-4
          py-1.5
          pointer-events-auto
          shadow-lg
        "
        style={{ minHeight: 48 }}
      >
        {/* Model dropdown */}
        <div className="flex-shrink-0 mr-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="
              bg-transparent
              text-base
              text-white
              outline-none
              border-none
              pr-2
              h-8
              min-w-[120px]
            "
          >
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          </select>
        </div>

        {/* Textarea wrapper */}
        <div className="flex-1 mx-2 flex items-center">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="
              w-full
              bg-transparent
              outline-none
              border-none
              text-sm
              text-white
              placeholder-gray-400
              resize-none
              min-h-[32px]
              max-h-[120px]
              overflow-y-auto
              py-1
              pr-10
              leading-snug
              transition-all
              scrollbar-thin scrollbar-thumb-white/80 scrollbar-track-transparent
            "
            placeholder="Type your message..."
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAskLLM();
              }
            }}
            style={{ lineHeight: 1.4, scrollbarColor: 'rgba(255,255,255,0.8) transparent', scrollbarWidth: 'thin' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleAskLLM}
          disabled={isLoading || !input.trim()}
          className="
            flex-shrink-0
            rounded-full
            bg-transparent
            text-white
            p-2
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center
            ml-2
          "
          style={{ width: '2.2rem', height: '2.2rem' }}
        >
          {isLoading ? (
            <span className="animate-spin h-5 w-5 block border-2 border-t-transparent border-current rounded-full" />
          ) : (
            <FiSend size={20} />
          )}
        </button>
      </div>
    </div>
  );
}
