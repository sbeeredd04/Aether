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
  background: 'var(--background)',
};

export default function ChatCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, theme, setTheme, activeNodeId, setActiveNodeId } = useChatStore();
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
    <div className="w-screen h-screen flex flex-col" style={{ background: 'var(--background)' }}>
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
      </div>
      <PromptBar node={activeNode} />
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
} 