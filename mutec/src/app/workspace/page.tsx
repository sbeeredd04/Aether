'use client';

import { useState, useEffect, useRef } from 'react';
import ChatCanvas from '@/components/ChatCanvas';
import NodeSidebar from '@/components/NodeSidebar';
import PromptBar from '@/components/PromptBar';
import { useChatStore } from '@/store/chatStore';
import { FiSettings } from 'react-icons/fi';
import { BsLayoutSidebarInsetReverse } from "react-icons/bs";
import SettingsPanel from '@/components/SettingsPanel';

export default function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default width (96 * 4 = 384px)
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
          <ChatCanvas />
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
        <PromptBar node={activeNode} isLoading={isLoading} setIsLoading={setIsLoading} />
      </div>
      
      {/* Settings panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
} 