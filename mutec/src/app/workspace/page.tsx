'use client';

import { useState, useEffect, useRef } from 'react';
import ChatCanvas from '@/components/ChatCanvas';
import NodeSidebar from '@/components/NodeSidebar';
import PromptBar from '@/components/PromptBar';
import { useChatStore } from '@/store/chatStore';
import { FiSettings } from 'react-icons/fi';
import { FaInfo } from 'react-icons/fa';
import { BsLayoutSidebarInsetReverse } from "react-icons/bs";
import SettingsPanel from '@/components/SettingsPanel';
import VoiceInputModal from '@/components/VoiceInputModal';
import ImageModal from '@/components/ImageModal';
import ModelInfoModal from '@/components/ModelInfoModal';

export default function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default width (96 * 4 = 384px)
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  
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
  
  // Open sidebar when an active node is selected
  useEffect(() => {
    if (activeNodeId) {
      setIsSidebarOpen(true);
    }
  }, [activeNodeId]);

  // Load session on mount
  useEffect(() => {
    // Load previous session if available
    const sessionLoaded = loadFromSession();
    if (sessionLoaded) {
      console.log('Session restored successfully');
    }
  }, [loadFromSession]);

  // Handle resize events
  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      
      const newWidth = startWidthRef.current - (e.clientX - startXRef.current);
      // Limit sidebar width between 250px and 50% of screen width
      const maxWidth = window.innerWidth * 0.5;
      const limitedWidth = Math.max(250, Math.min(newWidth, maxWidth));
      
      setSidebarWidth(limitedWidth);
      console.log('Resizing sidebar to:', limitedWidth);
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
  }, [isSidebarOpen]);

  const startResize = (e: React.MouseEvent) => {
    console.log('Start resizing');
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
    }
  };
  
  const handleDelete = () => {
    if (activeNodeId && activeNodeId !== 'root') {
      deleteNodeAndDescendants(activeNodeId);
      setIsSidebarOpen(false);
    }
  };
  
  const handleBranch = () => {
    if (activeNodeId) {
      const newNodeId = createNodeAndEdge(activeNodeId, 'New Chat', 'branch');
      console.log('Branch created:', { sourceNodeId: activeNodeId, newNodeId });
    }
  };

  // Modal handlers
  const handleVoiceInput = (transcript: string) => {
    console.log('Voice input received:', transcript);
    // Pass the transcript to the PromptBar through a ref or callback
    // For now, we'll store it in a state that PromptBar can access
    setVoiceTranscript(transcript);
  };

  const [voiceTranscript, setVoiceTranscript] = useState<string>('');

  // Reset voice transcript after it's used
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

  return (
    <main className="bg-[#000000] h-screen flex flex-col relative overflow-hidden">
      {/* Top control bar */}
      <div className="absolute top-4 left-4 flex gap-3 z-50">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm p-2 rounded-md"
            aria-label="Open Sidebar"
          >
            <BsLayoutSidebarInsetReverse size={22} />
          </button>
        )}
        <button 
          onClick={() => setShowModelInfo(true)}
          className="text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm p-2 rounded-md"
          aria-label="Model Information"
        >
          <FaInfo size={22} />
        </button>
        <button 
          onClick={() => setSettingsOpen(true)}
          className="text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm p-2 rounded-md"
          aria-label="Open Settings"
        >
          <FiSettings size={22} />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 h-full">
        {/* Canvas area */}
        <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'pr-[10px]' : ''}`}>
          <ChatCanvas disableInteractions={showVoiceModal || showImageModal || showModelInfo || isSettingsOpen} />
        </div>
        
        {/* Sidebar area */}
        {isSidebarOpen && (
          <div className="relative h-full flex">
            {/* Resize handle */}
            <div 
              className="w-[10px] h-full cursor-ew-resize hover:bg-purple-500/50 z-50 bg-white/10"
              onMouseDown={startResize}
            />
            
            {/* Sidebar content */}
            <div 
              className="bg-black/30 backdrop-blur-sm border-l border-white/10 shadow-xl z-40 h-full"
              style={{ width: `${sidebarWidth}px` }}
            >
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
              />
            </div>
          </div>
        )}
      </div>
      
      {/* PromptBar centered in visible canvas area, offset for sidebar */}
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
        />
      </div>
      
      {/* Settings panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Voice Input Modal */}
      <VoiceInputModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onTranscriptComplete={handleVoiceInput}
      />

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          isOpen={showImageModal}
          onClose={handleCloseImageModal}
          imageSrc={selectedImage.src}
          imageTitle={selectedImage.title}
        />
      )}

      {/* Model Info Modal */}
      <ModelInfoModal
        isOpen={showModelInfo}
        onClose={() => setShowModelInfo(false)}
      />
    </main>
  );
} 