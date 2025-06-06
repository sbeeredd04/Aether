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

import { useChatStore } from '../store/chatStore';
import CustomChatNode from './CustomChatNode';
import PromptBar from './PromptBar';

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

export default function ChatCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, activeNodeId } = useChatStore();
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
        </ReactFlow>
      </div>
      <PromptBar node={activeNode} />
    </div>
  );
} 