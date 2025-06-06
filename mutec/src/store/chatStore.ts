import { create } from 'zustand';
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import { nanoid } from 'nanoid';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export type CustomNodeData = {
  label: string;
  chatHistory: ChatMessage[];
};

interface ChatState {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addMessageToNode: (nodeId: string, message: ChatMessage, isPartial?: boolean) => void;
  createNodeAndEdge: (sourceNodeId: string, label: string, type: 'response' | 'branch') => void;
  getPathToNode: (targetNodeId: string) => ChatMessage[];
  getPathNodeIds: (targetNodeId: string) => string[];
  getPathEdgeIds: (targetNodeId: string) => string[];
  resetNode: (nodeId: string) => void;
  deleteNodeAndDescendants: (nodeId: string) => void;
  activeNodeId: string | null;
  activePath: {
    nodeIds: string[];
    edgeIds: string[];
  };
  setActiveNodeId: (nodeId: string | null) => void;
}

const ROOT_NODE: Node<CustomNodeData> = {
  id: 'root',
  type: 'chatNode',
  data: { label: 'Start your conversation', chatHistory: [] },
  position: { x: 250, y: 50 },
};

export const useChatStore = create<ChatState>((set, get) => ({
  nodes: [ROOT_NODE],
  edges: [],
  activePath: {
    nodeIds: [],
    edgeIds: []
  },

  onNodesChange: (changes) => {
    set((state) => {
      const nodesToRemove = new Set<string>();
  
      for (const change of changes) {
        if (change.type === 'remove') {
          // Don't allow removing the root node
          if (change.id === 'root') continue;
          nodesToRemove.add(change.id);
        }
      }
  
      if (nodesToRemove.size > 0) {
        const descendants = new Set<string>();
        const queue = [...nodesToRemove];
  
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          state.edges.forEach((edge) => {
            if (edge.source === currentId) {
              if (!descendants.has(edge.target)) {
                descendants.add(edge.target);
                queue.push(edge.target);
              }
            }
          });
        }
  
        descendants.forEach((id) => nodesToRemove.add(id));
      }
  
      const remainingNodes = state.nodes.filter((node) => !nodesToRemove.has(node.id));
      const appliedChanges = applyNodeChanges(changes, remainingNodes);
      
      // Ensure root node is always present
      if (!appliedChanges.some(node => node.id === 'root')) {
        appliedChanges.push(ROOT_NODE);
      }
  
      return {
        nodes: appliedChanges as Node<CustomNodeData>[],
        edges: state.edges.filter((edge) => !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target)),
      };
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  resetNode: (nodeId: string) => {
    set((state) => {
      // Find all descendant nodes
      const nodesToRemove = new Set<string>();
      const queue = [nodeId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        state.edges.forEach((edge) => {
          if (edge.source === currentId) {
            nodesToRemove.add(edge.target);
            queue.push(edge.target);
          }
        });
      }

      // Reset the target node and remove its descendants
      return {
        nodes: state.nodes.map(node => 
          node.id === nodeId 
            ? { ...node, data: { ...node.data, chatHistory: [], label: 'New Chat' } }
            : node
        ).filter(node => !nodesToRemove.has(node.id)),
        edges: state.edges.filter(edge => 
          !nodesToRemove.has(edge.target) && !nodesToRemove.has(edge.source)
        ),
      };
    });
  },

  addMessageToNode: (nodeId, message, isPartial = false) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          const lastMessage = node.data.chatHistory[node.data.chatHistory.length - 1];
          const isSameRole = lastMessage?.role === message.role;
          
          const updatedChatHistory =
            isPartial && isSameRole
              ? node.data.chatHistory.map((msg: ChatMessage, idx: number) =>
                  idx === node.data.chatHistory.length - 1
                    ? { ...msg, content: message.content }
                    : msg
                )
              : [...node.data.chatHistory, message];

          let newLabel = node.data.label;
          if (message.role === 'model' && !isPartial && message.content) {
            newLabel = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
          } else if (message.role === 'user' && !isPartial && message.content) {
            newLabel = `User: ${message.content.substring(0, 20)}...`;
          }

          return {
            ...node,
            data: {
              ...node.data,
              label: newLabel,
              chatHistory: updatedChatHistory,
            },
          };
        }
        return node;
      }),
    }));
  },

  createNodeAndEdge: (sourceNodeId, label, type) => {
    const sourceNode = get().nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const newNodeId = nanoid();
    const newX = sourceNode.position.x + (type === 'branch' ? 350 : 0);
    const newY = sourceNode.position.y + 250;

    const newNode: Node<CustomNodeData> = {
      id: newNodeId,
      type: 'chatNode',
      data: { label, chatHistory: [] },
      position: { x: newX, y: newY },
    };

    const newEdge: Edge = {
      id: `e-${sourceNodeId}-${newNodeId}`,
      source: sourceNodeId,
      target: newNodeId,
      markerEnd: { type: MarkerType.ArrowClosed },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      edges: addEdge(newEdge, state.edges),
    }));
  },

  getPathNodeIds: (targetNodeId) => {
    const { edges } = get();
    const path: string[] = [];
    let currentId: string | undefined = targetNodeId;
    
    // Build map of target -> source relationships
    const incoming = new Map<string, string>();
    edges.forEach((edge) => {
      incoming.set(edge.target, edge.source);
    });
    
    // Traverse up the tree to root
    while (currentId) {
      path.unshift(currentId);
      currentId = incoming.get(currentId);
      if (!currentId) break;
    }
    
    return path;
  },

  getPathEdgeIds: (targetNodeId) => {
    const { edges } = get();
    const nodeIds = get().getPathNodeIds(targetNodeId);
    const edgeIds: string[] = [];
    
    // Find all edges connecting nodes in the path
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const sourceId = nodeIds[i];
      const targetId = nodeIds[i + 1];
      
      const edge = edges.find(e => e.source === sourceId && e.target === targetId);
      if (edge) {
        edgeIds.push(edge.id);
      }
    }
    
    return edgeIds;
  },

  getPathToNode: (targetNodeId) => {
    const { nodes } = get();
    const pathNodeIds = get().getPathNodeIds(targetNodeId);
    const pathMessages: ChatMessage[] = [];
    
    // Collect messages from all nodes in the path
    pathNodeIds.forEach(id => {
      const node = nodes.find(n => n.id === id);
      if (node?.data.chatHistory) {
        pathMessages.push(...node.data.chatHistory);
      }
    });
    
    return pathMessages;
  },

  deleteNodeAndDescendants: (nodeId) => {
    set((state) => {
      if (nodeId === 'root') return state; // Don't delete root
      // Find all descendants
      const nodesToRemove = new Set<string>([nodeId]);
      const queue = [nodeId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        state.edges.forEach((edge) => {
          if (edge.source === currentId) {
            if (!nodesToRemove.has(edge.target)) {
              nodesToRemove.add(edge.target);
              queue.push(edge.target);
            }
          }
        });
      }
      return {
        nodes: state.nodes.filter((node) => !nodesToRemove.has(node.id)),
        edges: state.edges.filter((edge) => !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target)),
      };
    });
  },

  activeNodeId: null,
  setActiveNodeId: (nodeId) => {
    if (!nodeId) {
      set({ 
        activeNodeId: null,
        activePath: { nodeIds: [], edgeIds: [] }
      });
      return;
    }
    
    const nodeIds = get().getPathNodeIds(nodeId);
    const edgeIds = get().getPathEdgeIds(nodeId);
    
    set({ 
      activeNodeId: nodeId,
      activePath: { nodeIds, edgeIds }
    });
  },
})); 