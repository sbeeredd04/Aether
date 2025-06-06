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

const nodeTypes = { chatNode: CustomChatNode };

const flowStyle = {
  backgroundColor: 'var(--background)',
};

export default function ChatCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useChatStore();
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const handleConnect = useCallback(
    (params: any) => {
      // This is a placeholder. In our current setup, edges are created
      // programmatically when branching, not by user interaction.
      console.log('Connect event:', params);
    },
    []
  );

  return (
    <div className="w-screen h-screen">
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
        defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={12} 
          size={1} 
          color="currentColor"
          className="opacity-[0.02]"
        />
        <Controls className="glass-morphism !bg-transparent controls-custom" />
        <Panel position="top-right" className="m-4">
          <button 
            onClick={() => setSettingsOpen(true)}
            className="glass-morphism p-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
            aria-label="Open Settings"
          >
            <FiSettings size={20} />
          </button>
        </Panel>
      </ReactFlow>
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
} 