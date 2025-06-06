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
  background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(200,200,255,0.4) 100%)',
  // fallback for dark mode
  // will be overridden by dark mode class
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
    <div className="w-screen h-screen bg-gradient-to-br from-white/80 via-blue-100/60 to-blue-200/40 dark:from-[#181c24] dark:via-[#23283a] dark:to-[#1a1d2b] transition-colors duration-300">
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
          gap={16} 
          size={1.5} 
          color="currentColor"
          className="opacity-10 dark:opacity-5"
        />
        <Controls className="glass-morphism !bg-transparent controls-custom" />
        <Panel position="top-right" className="m-4">
          <button 
            onClick={() => setSettingsOpen(true)}
            className="glass-morphism p-2 rounded-2xl hover:bg-white hover:bg-opacity-20 transition-colors"
            aria-label="Open Settings"
          >
            <FiSettings size={22} />
          </button>
        </Panel>
      </ReactFlow>
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
} 