'use client';

import React, { useCallback } from 'react';
import { 
  ReactFlow,
  Controls,
  Background,
  MarkerType,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useChatStore } from '../store/chatStore';
import CustomChatNode from './CustomChatNode';

const nodeTypes = { chatNode: CustomChatNode };

export default function ChatCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useChatStore();

  const handleConnect = useCallback(
    (params: any) => {
      // This is a placeholder. In our current setup, edges are created
      // programmatically when branching, not by user interaction.
      // You could extend this to allow manual node connection if needed.
      console.log('Connect event:', params);
      // Example of adding an edge manually, though it's disabled for now.
      // useChatStore.setState((state) => ({
      //   edges: addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, state.edges),
      // }));
    },
    []
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-100 dark:bg-gray-900"
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
} 