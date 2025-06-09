'use client';

import React from 'react';
import { ReactFlow, Node, Edge, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { SiGooglegemini } from 'react-icons/si';

// Custom node component for the demo
const DemoNode = ({ data }: { data: any }) => {
  const isRoot = data.label === 'Root Node';
  const hasResponse = data.hasResponse;
  
  return (
    <div className={`
      backdrop-blur-sm 
      ${data.isActive ? 'bg-neutral-900/40 border-purple-500 ring-2 ring-purple-500' : 'bg-black/20 border-white/20'}
      border rounded-xl p-3 transition-all min-w-[200px] max-w-[250px]
    `}>
      {/* Root node indicator */}
      {isRoot && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
        </div>
      )}
      
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-1.5 h-1.5 !bg-purple-400" 
      />
      
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium text-sm text-white truncate flex-1">
          {data.label}
        </div>
        <div className="flex gap-1">
          {hasResponse && (
            <button className="text-gray-400 hover:text-white text-xs">
              <FiPlus size={12} />
            </button>
          )}
          <button className="text-gray-400 hover:text-white text-xs">
            <FiRefreshCw size={12} />
          </button>
          {!isRoot && (
            <button className="text-red-400 hover:text-red-300 text-xs">
              <FiTrash2 size={12} />
            </button>
          )}
        </div>
      </div>
      
      {hasResponse && (
        <div className="relative">
          <div className="max-h-[60px] overflow-hidden text-xs text-white/80 bg-neutral-900/30 rounded-lg p-2 mb-1">
            {data.response}
          </div>
          <div className="absolute bottom-1 right-1">
            <SiGooglegemini size={12} className="text-blue-300" />
          </div>
        </div>
      )}
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-1.5 h-1.5 !bg-purple-400" 
      />
    </div>
  );
};

// Demo sidebar component
const DemoSidebar = () => {
  return (
    <div className="w-64 h-full bg-black/40 rounded-xl border border-white/10 flex flex-col">
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-white">Story Ideas</h3>
          <button className="text-gray-400 text-xs">×</button>
        </div>
        <div className="text-xs text-white/50">3 messages</div>
      </div>
      
      <div className="flex gap-2 px-3 py-2 border-b border-white/10 bg-black/20">
        <button className="text-purple-300 text-xs flex items-center gap-1">
          <FiPlus size={10} /> Branch
        </button>
        <button className="text-blue-300 text-xs flex items-center gap-1">
          <FiRefreshCw size={10} /> Reset
        </button>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="bg-purple-600/20 border border-purple-400/30 rounded-lg p-2 max-w-[80%]">
              <div className="text-xs font-semibold text-gray-300 mb-1">You</div>
              <div className="text-xs text-white">Write a story about a magical forest</div>
            </div>
          </div>
          
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-lg p-2 max-w-[80%] relative">
              <div className="absolute -top-3 -left-3">
                <SiGooglegemini size={14} className="text-blue-300" />
              </div>
              <div className="text-xs font-semibold text-gray-300 mb-1">Gemini 2.0</div>
              <div className="text-xs text-white">Once upon a time, in a mystical forest...</div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <div className="bg-purple-600/20 border border-purple-400/30 rounded-lg p-2 max-w-[80%]">
              <div className="text-xs font-semibold text-gray-300 mb-1">You</div>
              <div className="text-xs text-white">Make it more adventurous</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  demo: DemoNode,
};

const initialNodes: Node[] = [
  {
    id: 'root',
    type: 'demo',
    position: { x: 250, y: 50 },
    data: { 
      label: 'Root Node',
      hasResponse: false,
      isActive: false
    },
  },
  {
    id: 'story',
    type: 'demo',
    position: { x: 250, y: 200 },
    data: { 
      label: 'Story Ideas',
      hasResponse: true,
      isActive: true,
      response: 'Once upon a time, in a mystical forest where ancient trees whispered secrets...'
    },
  },
  {
    id: 'adventure',
    type: 'demo',
    position: { x: 100, y: 350 },
    data: { 
      label: 'Adventure Version',
      hasResponse: true,
      isActive: false,
      response: 'The brave explorer wielded her enchanted sword as she ventured deeper...'
    },
  },
  {
    id: 'mystery',
    type: 'demo',
    position: { x: 400, y: 350 },
    data: { 
      label: 'Mystery Version',
      hasResponse: true,
      isActive: false,
      response: 'Strange symbols glowed on the trees as she discovered the hidden truth...'
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'root-story',
    source: 'root',
    target: 'story',
    style: { stroke: '#a855f7', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#a855f7' },
  },
  {
    id: 'story-adventure',
    source: 'story',
    target: 'adventure',
    style: { stroke: '#a855f7', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#a855f7' },
  },
  {
    id: 'story-mystery',
    source: 'story',
    target: 'mystery',
    style: { stroke: '#a855f7', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#a855f7' },
  },
];

export default function MutecDemo() {
  return (
    <div className="w-full h-full flex bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl overflow-hidden border border-white/20">
      {/* Canvas Area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          className="bg-transparent"
        >
          <div className="absolute top-3 left-3 z-10">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
              <div className="text-white/80 text-xs font-medium">Interactive Demo</div>
              <div className="text-white/60 text-xs">Try branching conversations →</div>
            </div>
          </div>
        </ReactFlow>
      </div>
      
      {/* Demo Sidebar */}
      <div className="w-64 p-3">
        <DemoSidebar />
      </div>
    </div>
  );
} 