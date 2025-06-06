'use client';

import React, { useCallback, useState } from 'react';
import { 
  ReactFlow,
  Controls,
  Background,
  MarkerType,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FiSettings, FiSidebar } from 'react-icons/fi';

import { useChatStore } from '../store/chatStore';
import CustomChatNode from './CustomChatNode';
import SettingsPanel from './SettingsPanel';
import PromptBar from './PromptBar';

interface ChatCanvasProps {
  onOpenSidebar?: () => void;
}

const nodeTypes = { chatNode: CustomChatNode };

const flowStyle = {
  background: '#000000',
};

// Custom styling for controls
const controlsStyle = {
  button: {
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '4px',
    margin: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  path: {
    fill: 'white',
  }
};

export default function ChatCanvas({ onOpenSidebar }: ChatCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, activeNodeId, setActiveNodeId } = useChatStore();
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const activeNode = nodes.find(n => n.id === activeNodeId);

  const handleConnect = useCallback(
    (params: any) => {
      // This is a placeholder. In our current setup, edges are created
      // programmatically when branching, not by user interaction.
      console.log('Connect event:', params);
    },
    []
  );

  return (
    <div className="w-full h-full" style={{ background: '#000000' }}>
      <div className="h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          nodeTypes={nodeTypes}
          fitView
          style={flowStyle}
          minZoom={0.2}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
          nodesDraggable
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1} 
            color="rgba(255, 255, 255, 0.8)"
            className="opacity-30"
          />
          <Controls 
            className="backdrop-blur-sm bg-black/30 border border-white/10 rounded-lg p-1"
          />
          <Panel position="top-right" className="m-4 flex gap-3">
            {onOpenSidebar && (
              <button 
                onClick={onOpenSidebar}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Open Sidebar"
              >
                <FiSidebar size={22} />
              </button>
            )}
            <button 
              onClick={() => setSettingsOpen(true)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Open Settings"
            >
              <FiSettings size={22} />
            </button>
          </Panel>
        </ReactFlow>
      </div>
      <PromptBar node={activeNode} />
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
} 