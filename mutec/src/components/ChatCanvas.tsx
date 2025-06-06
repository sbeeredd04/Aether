'use client';

import React, { useCallback, useState } from 'react';
import { 
  ReactFlow,
  Controls,
  Background,
  MarkerType,
  addEdge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FiSettings } from 'react-icons/fi';

import { useChatStore } from '../store/chatStore';
import CustomChatNode from './CustomChatNode';
import SettingsPanel from './SettingsPanel';

const nodeTypes = { chatNode: CustomChatNode };

export default function ChatCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useChatStore();
  const [isSettingsOpen, setSettingsOpen] = useState(false);

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
        <Panel position="top-right">
            <button 
                onClick={() => setSettingsOpen(true)}
                className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
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