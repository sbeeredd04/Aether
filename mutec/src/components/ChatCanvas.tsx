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
import { FiSettings } from 'react-icons/fi';

import { useChatStore } from '../store/chatStore';
import CustomChatNode from './CustomChatNode';
import SettingsPanel from './SettingsPanel';
import PromptBar from './PromptBar';

const nodeTypes = { chatNode: CustomChatNode };

const flowStyle = {
  background: '#000000',
};

export default function ChatCanvas() {
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
    <div className="w-screen h-screen flex flex-col" style={{ background: '#000000' }}>
      <div className="flex-1 min-h-0">
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
            className="backdrop-blur-sm bg-black/20 border border-white/10 rounded-lg p-1" 
          />
          <Panel position="top-right" className="m-4">
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