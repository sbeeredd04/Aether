'use client';

import { useState, useEffect, useRef } from 'react';
import ChatCanvas from '@/components/ChatCanvas';
import NodeSidebar from '@/components/NodeSidebar';
import { useChatStore } from '@/store/chatStore';

export default function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default width (96 * 4 = 384px)
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
    const handleMouseMove = (e) => {
      if (!resizingRef.current) return;
      
      const newWidth = startWidthRef.current - (e.clientX - startXRef.current);
      // Limit sidebar width between 250px and 50% of screen width
      const maxWidth = window.innerWidth * 0.5;
      const limitedWidth = Math.max(250, Math.min(newWidth, maxWidth));
      
      setSidebarWidth(limitedWidth);
    };

    const handleMouseUp = () => {
      resizingRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (resizingRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResize = (e) => {
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
    <main className="bg-[#000000] flex h-screen relative overflow-hidden">
      <div className={`flex-1 transition-all ${isSidebarOpen ? 'mr-[10px]' : ''}`}>
        <ChatCanvas onOpenSidebar={() => setIsSidebarOpen(true)} />
      </div>
      
      {isSidebarOpen && (
        <>
          <div 
            className="absolute top-0 bottom-0 bg-white/10 w-1 cursor-ew-resize hover:bg-purple-500/50 z-50"
            style={{ left: `calc(100% - ${sidebarWidth + 5}px)` }}
            onMouseDown={startResize}
          />
          
          <div 
            className="absolute right-0 top-0 bottom-0 bg-black/30 backdrop-blur-sm border-l border-white/10 shadow-xl z-40"
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
            />
          </div>
        </>
      )}
    </main>
  );
} 