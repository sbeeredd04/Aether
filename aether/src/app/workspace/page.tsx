'use client';

import { useState, useEffect, useRef } from 'react';
import ChatCanvas from '@/components/ChatCanvas';
import NodeSidebar from '@/components/NodeSidebar';
import PromptBar from '@/components/PromptBar';
import { useChatStore } from '@/store/chatStore';
import { FiSettings, FiHome, FiMenu, FiX } from 'react-icons/fi';
import { FaInfo, FaGithub, FaExternalLinkAlt } from 'react-icons/fa';
import { BsLayoutSidebarInsetReverse } from "react-icons/bs";
import { BiMessageSquareDetail, BiNetworkChart } from "react-icons/bi";
import Link from 'next/link';
import Image from 'next/image';
import SettingsPanel from '@/components/SettingsPanel';
import VoiceInputModal from '@/components/VoiceInputModal';
import ImageModal from '@/components/ImageModal';
import ModelInfoModal from '@/components/ModelInfoModal';

// Streaming state interface for NodeSidebar
interface StreamingState {
  isStreaming: boolean;
  currentThoughts: string;
  currentMessage: string;
  isShowingThoughts: boolean;
  isThinkingPhase: boolean;
  messagePhase: boolean;
  thoughtStartTime?: number;
  thoughtEndTime?: number;
}

export default function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(600);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'chat'>('canvas');
  
  // Streaming state management
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentThoughts: '',
    currentMessage: '',
    isShowingThoughts: false,
    isThinkingPhase: false,
    messagePhase: false
  });
  
  // Modal states
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{src: string, title: string} | null>(null);
  
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  
  const activeNodeId = useChatStore(s => s.activeNodeId);
  const nodes = useChatStore(s => s.nodes);
  const resetNode = useChatStore(s => s.resetNode);
  const deleteNodeAndDescendants = useChatStore(s => s.deleteNodeAndDescendants);
  const createNodeAndEdge = useChatStore(s => s.createNodeAndEdge);
  const setActiveNodeId = useChatStore(s => s.setActiveNodeId);
  const loadFromSession = useChatStore(s => s.loadFromSession);
  
  const activeNode = nodes.find(n => n.id === activeNodeId);
  const isRootNode = activeNodeId === 'root';
  
  // Check if mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-switch to chat tab when a node is selected on mobile
  useEffect(() => {
    if (activeNodeId && isMobile) {
      setActiveTab('chat');
    }
  }, [activeNodeId, isMobile]);

  // Open sidebar when an active node is selected (desktop only)
  useEffect(() => {
    if (activeNodeId && !isMobile) {
      setIsSidebarOpen(true);
    }
  }, [activeNodeId, isMobile]);

  // Load session on mount
  useEffect(() => {
    const sessionLoaded = loadFromSession();
    if (sessionLoaded) {
      console.log('Session restored successfully');
    }
  }, [loadFromSession]);

  // Handle resize events for desktop sidebar
  useEffect(() => {
    if (!isSidebarOpen || isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      
      const newWidth = startWidthRef.current - (e.clientX - startXRef.current);
      const maxWidth = window.innerWidth * 0.5;
      const limitedWidth = Math.max(250, Math.min(newWidth, maxWidth));
      
      setSidebarWidth(limitedWidth);
    };

    const handleMouseUp = () => {
      resizingRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSidebarOpen, isMobile]);

  const startResize = (e: React.MouseEvent) => {
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };
  
  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };
  
  const handleReset = () => {
    if (activeNodeId) {
      resetNode(activeNodeId);
      // Reset streaming state when resetting node
      setStreamingState({
        isStreaming: false,
        currentThoughts: '',
        currentMessage: '',
        isShowingThoughts: false,
        isThinkingPhase: false,
        messagePhase: false
      });
    }
  };
  
  const handleDelete = () => {
    if (activeNodeId && activeNodeId !== 'root') {
      deleteNodeAndDescendants(activeNodeId);
      setIsSidebarOpen(false);
      // Reset streaming state when deleting node
      setStreamingState({
        isStreaming: false,
        currentThoughts: '',
        currentMessage: '',
        isShowingThoughts: false,
        isThinkingPhase: false,
        messagePhase: false
      });
    }
  };
  
  const handleBranch = () => {
    if (activeNodeId) {
      const newNodeId = createNodeAndEdge(activeNodeId, 'New Chat', 'branch');
      setActiveNodeId(newNodeId); // Set the new branch as active
      console.log('Branch created and set as active:', { sourceNodeId: activeNodeId, newNodeId });
    }
  };

  const handleVoiceInput = (transcript: string) => {
    setVoiceTranscript(transcript);
  };

  const [voiceTranscript, setVoiceTranscript] = useState<string>('');

  const clearVoiceTranscript = () => {
    setVoiceTranscript('');
  };

  const handleImageClick = (imageSrc: string, imageTitle: string) => {
    setSelectedImage({ src: imageSrc, title: imageTitle });
    setShowImageModal(true);
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // Streaming event handlers for PromptBar
  const handleStreamingStart = () => {
    console.log('🔄 Workspace: Streaming started');
    setStreamingState({
      isStreaming: true,
      currentThoughts: '',
      currentMessage: '',
      isShowingThoughts: false,
      isThinkingPhase: true,
      messagePhase: false,
      thoughtStartTime: Date.now()
    });
  };

  const handleStreamingThought = (thought: string) => {
    console.log('🔄 Workspace: Thought chunk received', { length: thought.length });
    setStreamingState(prev => ({
      ...prev,
      currentThoughts: prev.currentThoughts + thought,
      isThinkingPhase: true,
      isShowingThoughts: true
    }));
  };

  const handleStreamingMessage = (messageChunk: string) => {
    console.log('🔄 Workspace: Message chunk received', { length: messageChunk.length });
    setStreamingState(prev => {
      // Capture end time if this is the first message chunk (thinking just ended)
      const shouldCaptureEndTime = prev.isThinkingPhase && !prev.thoughtEndTime;
      
      return {
        ...prev,
        currentMessage: prev.currentMessage + messageChunk,
        messagePhase: true,
        isThinkingPhase: false,
        thoughtEndTime: shouldCaptureEndTime ? Date.now() : prev.thoughtEndTime
      };
    });
  };

  const handleStreamingComplete = () => {
    console.log('🔄 Workspace: Streaming complete');
    setStreamingState(prev => ({
      isStreaming: false,
      currentThoughts: '',
      currentMessage: '',
      isShowingThoughts: false,
      isThinkingPhase: false,
      messagePhase: false,
      thoughtStartTime: prev.thoughtStartTime,
      thoughtEndTime: prev.thoughtEndTime || Date.now()
    }));
  };

  const handleStreamingError = (error: string) => {
    console.error('🔄 Workspace: Streaming error', { error });
    setStreamingState({
      isStreaming: false,
      currentThoughts: '',
      currentMessage: '',
      isShowingThoughts: false,
      isThinkingPhase: false,
      messagePhase: false
    });
  };

  // Mobile menu items
  const mobileMenuItems = [
    { icon: <FiHome size={20} />, label: 'Home', href: '/' },
    { icon: <FaInfo size={20} />, label: 'Model Info', action: () => setShowModelInfo(true) },
    { icon: <FiSettings size={20} />, label: 'Settings', action: () => setSettingsOpen(true) },
    { icon: <FaGithub size={20} />, label: 'GitHub', href: 'https://github.com/sbeeredd04/Aether', external: true },
  ];

  return (
    <main className="bg-[#000000] h-screen flex flex-col relative overflow-hidden">
      {/* Desktop Layout */}
      {!isMobile && (
        <>
          {/* Desktop Top Control Bar */}
          <div className="absolute top-4 left-4 flex gap-3 z-50 items-center">
            <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-md">
              <Image src="/aether.svg" alt="Aether AI" width={40} height={40} />
              <span className="text-white font-major-mono text-3xl font-normal">Aether</span>
            </div>
            
            <Link href="/" className="text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm p-2 rounded-md">
              <FiHome size={22} />
            </Link>
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm p-2 rounded-md">
                <BsLayoutSidebarInsetReverse size={22} />
              </button>
            )}
            <button onClick={() => setShowModelInfo(true)} className="text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm p-2 rounded-md">
              <FaInfo size={22} />
            </button>
            <button onClick={() => setSettingsOpen(true)} className="text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm p-2 rounded-md">
              <FiSettings size={22} />
            </button>
          </div>

          {/* Desktop Main Content */}
          <div className="flex flex-1 h-full">
            <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'pr-[10px]' : ''}`}>
              <ChatCanvas disableInteractions={showVoiceModal || showImageModal || showModelInfo || isSettingsOpen} isMobile={false} />
            </div>
            
            {isSidebarOpen && (
              <div className="relative h-full flex">
                <div className="w-[10px] h-full cursor-ew-resize hover:bg-purple-500/50 z-50 bg-white/10" onMouseDown={startResize} />
                <div className="bg-black/30 backdrop-blur-sm border-l border-white/10 shadow-xl z-40 h-full" style={{ width: `${sidebarWidth}px` }}>
                  <NodeSidebar
                    isOpen={true}
                    onClose={handleCloseSidebar}
                    data={activeNode?.data || null}
                    nodeId={activeNodeId}
                    isRootNode={isRootNode}
                    onReset={handleReset}
                    onDelete={handleDelete}
                    onBranch={handleBranch}
                    width={sidebarWidth}
                    isActiveNodeLoading={isLoading}
                    onImageClick={handleImageClick}
                    streamingState={streamingState}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Desktop PromptBar */}
          <div
            className="absolute left-0 bottom-0 w-full flex justify-center items-end pointer-events-none mb-6"
            style={{
              paddingRight: isSidebarOpen ? sidebarWidth + 10 : 0,
              transition: 'padding-right 0.2s',
              zIndex: 60,
            }}
          >
            <PromptBar 
              node={activeNode} 
              isLoading={isLoading} 
              setIsLoading={setIsLoading}
              onShowVoiceModal={() => setShowVoiceModal(true)}
              onShowImageModal={handleImageClick}
              voiceTranscript={voiceTranscript}
              onClearVoiceTranscript={clearVoiceTranscript}
              onStreamingStart={handleStreamingStart}
              onStreamingThought={handleStreamingThought}
              onStreamingMessage={handleStreamingMessage}
              onStreamingComplete={handleStreamingComplete}
              onStreamingError={handleStreamingError}
            />
          </div>

          {/* Desktop Footer */}
          <div className="absolute bottom-4 right-4 z-40">
            <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2">
              <div className="flex items-center gap-3 text-sm text-white/70">
                <span className="font-space-grotesk">Developed by</span>
                <div className="flex items-center gap-2">
                  <span className="font-space-grotesk font-medium text-white/90">Sri Ujjwal Reddy</span>
                  <div className="flex items-center gap-2">
                    <a href="https://github.com/sbeeredd04" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
                      <FaGithub size={16} />
                    </a>
                    <a href="https://sriujjwalreddy.com" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
                      <FaExternalLinkAlt size={14} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-sm border-b border-white/10 z-50">
            <div className="flex items-center gap-2">
              <Image src="/aether.svg" alt="Aether AI" width={24} height={24} />
              <span className="text-white font-major-mono text-lg font-normal">Aether</span>
            </div>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white/80 hover:text-white transition-colors p-2"
            >
              {isMobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="absolute top-16 left-0 right-0 bg-black/90 backdrop-blur-md border-b border-white/10 z-40">
              <div className="p-4 space-y-3">
                {mobileMenuItems.map((item, index) => (
                  <div key={index}>
                    {item.href ? (
                      item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-white/80 hover:text-white transition-colors py-2"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.icon}
                          <span className="text-sm">{item.label}</span>
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className="flex items-center gap-3 text-white/80 hover:text-white transition-colors py-2"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.icon}
                          <span className="text-sm">{item.label}</span>
                        </Link>
                      )
                    ) : (
                      <button
                        onClick={() => {
                          item.action?.();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 text-white/80 hover:text-white transition-colors py-2 w-full text-left"
                      >
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Tab Switcher */}
          <div className="flex bg-black/40 backdrop-blur-sm border-b border-white/10">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all ${
                activeTab === 'canvas'
                  ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-900/20'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <BiNetworkChart size={18} />
              Canvas
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-900/20'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <BiMessageSquareDetail size={18} />
              Chat
            </button>
          </div>

          {/* Mobile Content Area */}
          <div className="flex-1 relative overflow-hidden">
            {/* Canvas View */}
            <div className={`absolute inset-0 transition-transform duration-300 ${
              activeTab === 'canvas' ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <ChatCanvas disableInteractions={showVoiceModal || showImageModal || showModelInfo || isSettingsOpen} isMobile={true} />
            </div>
            
            {/* Chat View */}
            <div className={`absolute inset-0 transition-transform duration-300 ${
              activeTab === 'chat' ? 'translate-x-0' : 'translate-x-full'
            }`}>
              {activeNode ? (
                <NodeSidebar
                  isOpen={true}
                  onClose={() => {}}
                  data={activeNode.data}
                  nodeId={activeNodeId}
                  isRootNode={isRootNode}
                  onReset={handleReset}
                  onDelete={handleDelete}
                  onBranch={handleBranch}
                  width={window.innerWidth}
                  isActiveNodeLoading={isLoading}
                  onImageClick={handleImageClick}
                  isMobile={true}
                  streamingState={streamingState}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white/60 text-center p-8">
                  <div>
                    <BiMessageSquareDetail size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No conversation selected</p>
                    <p className="text-sm">Tap a node in the Canvas to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile PromptBar */}
          <div className="p-3 bg-black/40 backdrop-blur-sm border-t border-white/10">
            <PromptBar 
              node={activeNode} 
              isLoading={isLoading} 
              setIsLoading={setIsLoading}
              onShowVoiceModal={() => setShowVoiceModal(true)}
              onShowImageModal={handleImageClick}
              voiceTranscript={voiceTranscript}
              onClearVoiceTranscript={clearVoiceTranscript}
              isMobile={true}
              onStreamingStart={handleStreamingStart}
              onStreamingThought={handleStreamingThought}
              onStreamingMessage={handleStreamingMessage}
              onStreamingComplete={handleStreamingComplete}
              onStreamingError={handleStreamingError}
            />
          </div>
        </div>
      )}
      
      {/* Modals */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      <VoiceInputModal isOpen={showVoiceModal} onClose={() => setShowVoiceModal(false)} onTranscriptComplete={handleVoiceInput} />
      {selectedImage && (
        <ImageModal isOpen={showImageModal} onClose={handleCloseImageModal} imageSrc={selectedImage.src} imageTitle={selectedImage.title} />
      )}
      <ModelInfoModal isOpen={showModelInfo} onClose={() => setShowModelInfo(false)} />
    </main>
  );
} 