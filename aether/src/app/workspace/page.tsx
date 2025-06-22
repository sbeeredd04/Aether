'use client';

import { useState, useEffect, useRef } from 'react';
import ChatCanvas from '@/components/ChatCanvas';
import NodeSidebar from '@/components/NodeSidebar';
import PromptBar from '@/components/PromptBar';
import { useChatStore } from '@/store/chatStore';
import { FaGithub, FaExternalLinkAlt } from 'react-icons/fa';
import { BiMessageSquareDetail, BiNetworkChart } from "react-icons/bi";
import Link from 'next/link';
import Image from 'next/image';
import SettingsPanel from '@/components/SettingsPanel';
import VoiceInputModal from '@/components/VoiceInputModal';
import ImageModal from '@/components/ImageModal';
import ModelInfoModal from '@/components/ModelInfoModal';
import WorkspaceSelector from '@/components/WorkspaceSelector';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { WorkspaceMetadata } from '@/utils/workspaceManager';

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
  groundingEnabled?: boolean;
  useGroundingPipeline?: boolean;
  modelSupportsThinking?: boolean;
  groundingMetadata?: {
    searchEntryPoint?: {
      renderedContent: string;
    };
    groundingChunks?: Array<{
      web?: {
        uri: string;
        title: string;
      };
    }>;
    groundingSupports?: Array<{
      segment: {
        startIndex?: number;
        endIndex?: number;
        text: string;
      };
      groundingChunkIndices: number[];
      confidenceScores: number[];
    }>;
    webSearchQueries?: string[];
    citations?: Array<{
      title: string;
      uri: string;
      snippet?: string;
      confidenceScore?: number;
    }>;
    loadingMessage?: string;
  };
}

export default function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(600);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
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
  const loadFromStorage = useChatStore(s => s.loadFromStorage);
  const needsStorageConsent = useChatStore(s => s.needsStorageConsent);
  const setStorageConsent = useChatStore(s => s.setStorageConsent);
  const getStorageStats = useChatStore(s => s.getStorageStats);
  
  // Workspace management
  const getCurrentWorkspace = useChatStore(s => s.getCurrentWorkspace);
  const switchWorkspace = useChatStore(s => s.switchWorkspace);
  const createNewWorkspace = useChatStore(s => s.createNewWorkspace);
  const renameCurrentWorkspace = useChatStore(s => s.renameCurrentWorkspace);
  const deleteWorkspace = useChatStore(s => s.deleteWorkspace);
  
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceMetadata | null>(null);
  
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

  // Initialize toast system
  const { toasts, removeToast, showConsent, showSuccess, showError } = useToast();

  // Load current workspace on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const workspace = getCurrentWorkspace();
      setCurrentWorkspace(workspace);
    }
  }, [getCurrentWorkspace]);
  
  // Load workspace on mount
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Only run once on initial mount
    let mounted = true;
    
    const loadTimer = setTimeout(() => {
      if (!mounted) return;
      
      try {
        const workspaceLoaded = loadFromStorage();
        if (workspaceLoaded && mounted) {
          console.log('Workspace restored successfully');
          const workspace = getCurrentWorkspace();
          setCurrentWorkspace(workspace);
          if (workspace && mounted) {
            showSuccess(
              'Workspace Restored',
              `Loaded "${workspace.name}" with ${workspace.totalMessages} messages across ${workspace.totalNodes} conversations.`,
              3000
            );
          }
        }
      } catch (error) {
        console.error('Error loading workspace:', error);
      }
    }, 150);

    return () => {
      mounted = false;
      clearTimeout(loadTimer);
    };
  }, []); // Remove dependencies to ensure it only runs once

  // Check for storage consent on mount
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    let mounted = true;
    
    const consentTimer = setTimeout(() => {
      if (!mounted) return;
      
      try {
        if (needsStorageConsent() && mounted) {
          showConsent(
            'Save Your Workspace Data',
            'Would you like to save your conversations and workspace data locally in your browser? This allows your work to persist even after closing the tab. Your data remains private and never leaves your device.',
            () => {
              if (mounted) {
                setStorageConsent(true);
                showSuccess(
                  'Data Saving Enabled',
                  'Your workspace will now be saved automatically. You can disable this anytime in settings.',
                  4000
                );
              }
            },
            () => {
              if (mounted) {
                setStorageConsent(false);
                showError(
                  'Session-Only Mode',
                  'Your workspace will only be saved for this session. Closing the tab will lose your work.',
                  5000
                );
              }
            }
          );
        }
      } catch (error) {
        console.error('Error checking storage consent:', error);
      }
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(consentTimer);
    };
  }, []); // Remove dependencies to ensure it only runs once

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

  // Workspace handlers
  const handleWorkspaceChange = (workspaceId: string) => {
    const success = switchWorkspace(workspaceId);
    if (success) {
      const newWorkspace = getCurrentWorkspace();
      setCurrentWorkspace(newWorkspace);
      showSuccess(
        'Workspace Switched',
        `Switched to "${newWorkspace?.name || 'Unknown'}" workspace`,
        2000
      );
    } else {
      showError(
        'Switch Failed',
        'Failed to switch workspace. Please try again.',
        3000
      );
    }
  };

  const handleWorkspaceRename = (workspaceId: string, newName: string) => {
    const success = renameCurrentWorkspace(newName);
    if (success) {
      const updatedWorkspace = getCurrentWorkspace();
      setCurrentWorkspace(updatedWorkspace);
      // Don't show toast here - WorkspaceSelector handles it
    } else {
      showError(
        'Rename Failed',
        'Failed to rename workspace. Please try again.',
        3000
      );
    }
  };

  // Handle toasts from WorkspaceSelector
  const handleWorkspaceToast = (type: 'success' | 'error' | 'consent', title: string, message: string, onAccept?: () => void, onDecline?: () => void) => {
    if (type === 'consent' && onAccept && onDecline) {
      showConsent(title, message, onAccept, onDecline);
    } else if (type === 'success') {
      showSuccess(title, message, 2000);
    } else if (type === 'error') {
      showError(title, message, 3000);
    }
  };

  // Streaming event handlers for PromptBar
  const handleStreamingStart = (config: { groundingEnabled: boolean; useGroundingPipeline: boolean; modelSupportsThinking: boolean; }) => {
    console.log('🔄 Workspace: Streaming started', config);
    setStreamingState({
      isStreaming: true,
      currentThoughts: '',
      currentMessage: '',
      isShowingThoughts: false,
      isThinkingPhase: true,
      messagePhase: false,
      thoughtStartTime: Date.now(),
      groundingEnabled: config.groundingEnabled,
      useGroundingPipeline: config.useGroundingPipeline,
      modelSupportsThinking: config.modelSupportsThinking
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

  const handleStreamingGrounding = (metadata: any) => {
    console.log('🔄 Workspace: Grounding metadata received', metadata);
    setStreamingState(prev => ({
      ...prev,
      groundingMetadata: metadata
    }));
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
      thoughtEndTime: prev.thoughtEndTime || Date.now(),
      groundingEnabled: prev.groundingEnabled,
      useGroundingPipeline: prev.useGroundingPipeline,
      modelSupportsThinking: prev.modelSupportsThinking
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



  return (
    <main className="bg-[#000000] h-screen flex flex-col relative overflow-hidden">
      {/* Desktop Layout */}
      {!isMobile && (
        <>
          {/* Desktop Navigation Bar */}
          <WorkspaceSelector
            currentWorkspace={currentWorkspace}
            onWorkspaceChange={handleWorkspaceChange}
            onWorkspaceRename={handleWorkspaceRename}
            isMobile={false}
            isSidebarOpen={isSidebarOpen}
            sidebarWidth={sidebarWidth}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onShowSettings={() => setSettingsOpen(true)}
            onShowModelInfo={() => setShowModelInfo(true)}
            onShowToast={handleWorkspaceToast}
          />

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
              onStreamingGrounding={handleStreamingGrounding}
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
          {/* Mobile Navigation Bar */}
          <div className="relative">
            <WorkspaceSelector
              currentWorkspace={currentWorkspace}
              onWorkspaceChange={handleWorkspaceChange}
              onWorkspaceRename={handleWorkspaceRename}
              isMobile={true}
              onShowSettings={() => setSettingsOpen(true)}
              onShowModelInfo={() => setShowModelInfo(true)}
              onShowToast={handleWorkspaceToast}
            />
          </div>

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
          <div className="flex-1 relative overflow-hidden" style={{ marginTop: '80px' }}>
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
              onStreamingGrounding={handleStreamingGrounding}
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
      
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </main>
  );
} 