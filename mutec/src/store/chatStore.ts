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

export interface CustomNodeData {
  label: string;
  chatHistory: ChatMessage[];
}

interface ChatState {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addMessageToNode: (nodeId: string, message: ChatMessage, isPartial?: boolean) => void;
  createNodeAndEdge: (sourceNodeId: string, label: string, type: 'response' | 'branch') => void;
  getPathToNode: (targetNodeId: string) => ChatMessage[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  nodes: [
    {
      id: 'start-node',
      type: 'chatNode',
      data: { label: 'Start your conversation:', chatHistory: [] },
      position: { x: 250, y: 50 },
    },
  ],
  edges: [],

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as Node<CustomNodeData>[],
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
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

          return {
            ...node,
            data: {
              ...node.data,
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

  getPathToNode: (targetNodeId: string): ChatMessage[] => {
    const { nodes, edges } = get();
    const pathMessages: ChatMessage[] = [];
    let currentNodeId: string | undefined = targetNodeId;

    const incomingEdgesMap = new Map<string, string>();
    edges.forEach((edge) => {
      incomingEdgesMap.set(edge.target, edge.source);
    });

    while (currentNodeId) {
      const currentNode = nodes.find((n) => n.id === currentNodeId);
      if (currentNode?.data.chatHistory) {
        // Add messages in reverse order and then reverse the whole array at the end
        pathMessages.push(...[...currentNode.data.chatHistory].reverse());
      }
      currentNodeId = incomingEdgesMap.get(currentNodeId);
    }
    
    return pathMessages.reverse();
  },
})); 