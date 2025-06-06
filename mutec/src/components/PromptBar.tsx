import React, { useState, useRef, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';
import { useChatStore } from '../store/chatStore';

export default function PromptBar({ node }: { node: any }) {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [isLoading, setIsLoading] = useState(false);
  const addMessageToNode = useChatStore((s) => s.addMessageToNode);
  const getPathToNode = useChatStore((s) => s.getPathToNode);

  // Reference to the textarea so we can adjust its height dynamically
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!node) return null;

  const handleAskLLM = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    const userMessage = { role: 'user' as const, content: input };
    addMessageToNode(node.id, userMessage);
    setInput('');
    if (textareaRef.current) {
      // Reset textarea height after sending
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

  // Adjust textarea height whenever `input` changes
  useEffect(() => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = 'auto';
    const scrollHeight = ta.scrollHeight;
    // Two predefined heights: minHeight = 1.5rem (~24px), expandedHeight = 2x (48px)
    const twoLineHeight = 48; // 2rem in pixels (approx)
    if (scrollHeight <= twoLineHeight) {
      ta.style.height = `${scrollHeight}px`;
      ta.style.overflowY = 'hidden';
    } else if (scrollHeight > twoLineHeight && scrollHeight <= 2 * twoLineHeight) {
      // Up to 2x: let it expand
      ta.style.height = `${scrollHeight}px`;
      ta.style.overflowY = 'hidden';
    } else {
      // Beyond 2x: cap height and allow scroll
      ta.style.height = `${2 * twoLineHeight}px`;
      ta.style.overflowY = 'auto';
    }
  }, [input]);

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 flex justify-center px-2 py-3 pointer-events-none">
      {/* Glass‐blur container with subtle border */}
      <div
        className="
          backdrop-blur-sm
          bg-transparent
          border border-white/20 dark:border-black/20
          rounded-2xl
          flex items-center
          w-full max-w-2xl
          px-3
          py-2
          pointer-events-auto
        "
      >
        {/* Model dropdown */}
        <div className="flex-shrink-0">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="
              bg-transparent
              text-base
              text-current
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
        <div className="flex-1 mx-2">
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
              placeholder-gray-500 dark:placeholder-gray-400
              resize-none
              min-h-[24px]
              overflow-y-hidden
              py-2
              pr-10
              leading-snug
            "
            placeholder="Type your message..."
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAskLLM();
              }
            }}
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
            text-current
            p-2
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center
          "
          style={{ width: '2.5rem', height: '2.5rem' }}
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
