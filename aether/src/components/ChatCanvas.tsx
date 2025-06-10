'use client';

import React, { useCallback, useMemo } from 'react';
import { 
  ReactFlow,
  Controls,
  Background,
  MarkerType,
  BackgroundVariant,
  Panel,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useChatStore } from '../store/chatStore';
import CustomChatNode from './CustomChatNode';
// import PromptBar from './PromptBar'; // No longer needed

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

interface ChatCanvasProps {
  disableInteractions?: boolean;
  isMobile?: boolean;
}

const ChatCanvas: React.FC<ChatCanvasProps> = ({ disableInteractions = false, isMobile = false }) => {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    activeNodeId, 
    activePath,
    chatManager 
  } = useChatStore();
  const activeNode = nodes.find(n => n.id === activeNodeId);

  // Style edges based on whether they are part of the active path
  const styledEdges = useMemo(() => {
    return edges.map(edge => {
      const isInActivePath = activePath.edgeIds.includes(edge.id);
      return {
        ...edge,
        style: {
          stroke: isInActivePath ? '#a855f7' : '#555555',
          strokeWidth: isInActivePath ? (isMobile ? 3 : 4) : (isMobile ? 1.5 : 2),
          strokeOpacity: isInActivePath ? 0.9 : 0.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isInActivePath ? '#a855f7' : '#555555',
          width: isInActivePath ? (isMobile ? 10 : 12) : (isMobile ? 6 : 8),
          height: isInActivePath ? (isMobile ? 10 : 12) : (isMobile ? 6 : 8),
          strokeWidth: 0,
        },
        className: isInActivePath ? 'animated-edge' : '',
        animated: isInActivePath,
      };
    });
  }, [edges, activePath.edgeIds, isMobile]);

  const handleConnect = useCallback(
    (params: any) => {
      console.log('Connect event:', params);
    },
    []
  );

  return (
    <div className="w-full h-full" style={{ background: '#000000' }}>
      <div className="h-full">
        <ReactFlow
          nodes={nodes.map(node => {
            const thread = chatManager?.getThread(node.id, node.data.chatHistory);
            return {
              ...node,
              data: {
                ...node.data,
                isLoading: thread?.isLoading || false,
                isMobile
              }
            };
          })}
          edges={styledEdges}
          onNodesChange={disableInteractions ? undefined : onNodesChange}
          onEdgesChange={disableInteractions ? undefined : onEdgesChange}
          onConnect={disableInteractions ? undefined : handleConnect}
          nodeTypes={nodeTypes}
          fitView
          style={flowStyle}
          minZoom={isMobile ? 0.3 : 0.2}
          maxZoom={isMobile ? 2 : 1.5}
          defaultViewport={{ x: 0, y: 0, zoom: isMobile ? 0.7 : 0.5 }}
          nodesDraggable={!disableInteractions}
          edgesFocusable={!disableInteractions}
          panOnDrag={!disableInteractions}
          zoomOnScroll={!disableInteractions}
          zoomOnPinch={!disableInteractions}
          panOnScroll={!disableInteractions}
          // Mobile-specific props
          zoomOnDoubleClick={!isMobile}
          panOnScrollMode={isMobile ? 'free' : 'vertical'}
          preventScrolling={isMobile}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={isMobile ? 15 : 20} 
            size={isMobile ? 0.8 : 1} 
            color="rgba(255, 255, 255, 0.8)"
            className="opacity-30"
          />
          <Controls 
            className="backdrop-blur-sm bg-black/30 border border-white/10 rounded-lg p-1"
            showZoom={!isMobile}
            showFitView={true}
            showInteractive={!isMobile}
            fitViewOptions={{ 
              padding: isMobile ? 0.1 : 0.2,
              includeHiddenNodes: false,
              minZoom: isMobile ? 0.3 : 0.2,
              maxZoom: isMobile ? 2 : 1.5,
            }}
          />
        </ReactFlow>
      </div>
      {/* PromptBar removed from here */}
    </div>
  );
};

export default ChatCanvas; 