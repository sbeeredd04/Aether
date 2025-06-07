'use client';

import { useState, useEffect, useRef } from 'react';
import ChatCanvas from '@/components/ChatCanvas';
import NodeSidebar from '@/components/NodeSidebar';
import PromptBar from '@/components/PromptBar';
import { useChatStore } from '@/store/chatStore';
import { FiSettings, FiActivity, FiInfo } from 'react-icons/fi';
import { BsLayoutSidebarInsetReverse } from "react-icons/bs";
import SettingsPanel from '@/components/SettingsPanel';
import VoiceInputModal from '@/components/VoiceInputModal';
import ImageModal from '@/components/ImageModal';
import { runHealthCheck, HealthCheckReport, getLastHealthCheckReport } from '@/utils/modelHealthCheck';

export default function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default width (96 * 4 = 384px)
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [healthCheckReport, setHealthCheckReport] = useState<HealthCheckReport | null>(null);
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [showHealthReport, setShowHealthReport] = useState(false);
  
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
  
  const activeNode = nodes.find(n => n.id === activeNodeId);
  const isRootNode = activeNodeId === 'root';
  
  // Open sidebar when an active node is selected
  useEffect(() => {
    if (activeNodeId) {
      setIsSidebarOpen(true);
    }
  }, [activeNodeId]);

  // Load last health check report on mount
  useEffect(() => {
    const lastReport = getLastHealthCheckReport();
    if (lastReport) {
      setHealthCheckReport(lastReport);
    }
  }, []);

  // Health check handler
  const handleHealthCheck = async () => {
    if (isRunningHealthCheck) return;
    
    setIsRunningHealthCheck(true);
    console.log('Starting health check');
    
    try {
      const report = await runHealthCheck();
      setHealthCheckReport(report);
      setShowHealthReport(true);
      console.log('Health check completed', { 
        totalModels: report.totalModels,
        successfulModels: report.successfulModels,
        failedModels: report.failedModels
      });
    } catch (error) {
      console.error('Health check failed', { error });
    } finally {
      setIsRunningHealthCheck(false);
    }
  };

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
      createNodeAndEdge(activeNodeId, 'New Chat', 'branch');
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
          onClick={handleHealthCheck}
          disabled={isRunningHealthCheck}
          className="text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm p-2 rounded-md disabled:opacity-50"
          aria-label="Run Health Check"
        >
          {isRunningHealthCheck ? (
            <span className="animate-spin h-5 w-5 block border-2 border-t-transparent border-current rounded-full" />
          ) : (
            <FiActivity size={22} />
          )}
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
          <ChatCanvas disableInteractions={showVoiceModal || showImageModal || showHealthReport || isSettingsOpen} />
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

      {/* Health Check Report Modal */}
      {showHealthReport && healthCheckReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             onClick={() => setShowHealthReport(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 bg-neutral-900 rounded-xl border border-white/10 p-6 max-w-md w-full"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Health Check Report</h3>
              <button
                onClick={() => setShowHealthReport(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Total Models:</span>
                <span className="text-white">{healthCheckReport.totalModels}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Working:</span>
                <span className="text-green-400">{healthCheckReport.successfulModels}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Failed:</span>
                <span className="text-red-400">{healthCheckReport.failedModels}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Report Time:</span>
                <span className="text-white/60 text-xs">
                  {new Date(healthCheckReport.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              {healthCheckReport.failedModels > 0 && (
                <div className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-500/20">
                  <h4 className="text-red-400 font-medium mb-2">Failed Models:</h4>
                  <div className="space-y-1">
                    {healthCheckReport.results
                      .filter(result => result.status === 'error')
                      .map((result, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="text-white/80">{result.modelId}:</span>
                          <span className="text-red-300 ml-2">{result.error}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 