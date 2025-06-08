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
import { ChatManager } from '../utils/chatManager';
import logger from '../utils/logger';

export interface AttachmentData {
  name: string;
  type: string;
  data: string; // base64
  previewUrl: string; // object URL for client-side display
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  attachments?: AttachmentData[];
  modelId?: string; // Track which model generated this response
}

export type CustomNodeData = {
  label: string;
  chatHistory: ChatMessage[];
};

// Session storage interface
interface SessionData {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  activeNodeId: string | null;
  timestamp: number;
  version: string;
}

interface ChatState {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  chatManager: ChatManager | null;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addMessageToNode: (nodeId: string, message: ChatMessage, isPartial?: boolean) => void;
  removeLastMessageFromNode: (nodeId: string) => void;
  createNodeAndEdge: (sourceNodeId: string, label: string, type: 'response' | 'branch') => string; // Return new nodeId
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
  initializeChatManager: (apiKey: string) => void;
  sendMessageToNode: (nodeId: string, message: string) => Promise<void>;
  // Session management methods
  saveToSession: () => void;
  loadFromSession: () => boolean;
  clearSession: () => void;
  copyToClipboard: (content: string) => Promise<void>;
}

const ROOT_NODE: Node<CustomNodeData> = {
  id: 'root',
  type: 'chatNode',
  data: { label: 'Start your conversation', chatHistory: [] },
  position: { x: 250, y: 50 },
};

const SESSION_STORAGE_KEY = 'mutec-chat-session';
const SESSION_VERSION = '1.0.0';

// Utility functions for session management
const saveSessionData = (data: SessionData): boolean => {
  try {
    const serialized = JSON.stringify(data);
    
    // Check if data is too large (Chrome limit is ~5MB)
    if (serialized.length > 4.5 * 1024 * 1024) { // 4.5MB to be safe
      logger.warn('ChatStore: Session data too large, attempting to compress');
      
      // Try to save a compressed version with only essential data
      const compressedData: SessionData = {
        ...data,
        nodes: data.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            // Truncate very long messages to save space
            chatHistory: node.data.chatHistory.map(msg => ({
              ...msg,
              content: msg.content.length > 10000 ? msg.content.substring(0, 10000) + '...[truncated]' : msg.content,
              // Remove large attachments from session storage
              attachments: msg.attachments?.filter(att => att.data.length < 100000) || []
            }))
          }
        }))
      };
      
      const compressedSerialized = JSON.stringify(compressedData);
      if (compressedSerialized.length > 4.5 * 1024 * 1024) {
        logger.error('ChatStore: Even compressed session data is too large');
        return false;
      }
      
      sessionStorage.setItem(SESSION_STORAGE_KEY, compressedSerialized);
      logger.info('ChatStore: Session saved with compression');
      return true;
    }
    
    sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
    logger.debug('ChatStore: Session saved successfully', { 
      dataSize: serialized.length,
      nodeCount: data.nodes.length,
      edgeCount: data.edges.length
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      logger.error('ChatStore: Session storage quota exceeded');
      // Try to clear old data and save again
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        const retryData = JSON.stringify(data);
        if (retryData.length <= 4.5 * 1024 * 1024) {
          sessionStorage.setItem(SESSION_STORAGE_KEY, retryData);
          logger.info('ChatStore: Session saved after clearing old data');
          return true;
        }
      } catch (retryError) {
        logger.error('ChatStore: Failed to save session even after clearing old data', { error: retryError });
      }
    } else {
      logger.error('ChatStore: Failed to save session', { error });
    }
    return false;
  }
};

const loadSessionData = (): SessionData | null => {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      logger.debug('ChatStore: No session data found');
      return null;
    }
    
    const data: SessionData = JSON.parse(stored);
    
    // Validate session data
    if (!data.nodes || !Array.isArray(data.nodes) || !data.edges || !Array.isArray(data.edges)) {
      logger.warn('ChatStore: Invalid session data structure');
      return null;
    }
    
    // Check version compatibility
    if (data.version !== SESSION_VERSION) {
      logger.warn('ChatStore: Session version mismatch', { 
        stored: data.version, 
        current: SESSION_VERSION 
      });
      // For now, we'll still load it, but in future versions we might want to migrate
    }
    
    logger.info('ChatStore: Session data loaded successfully', {
      nodeCount: data.nodes.length,
      edgeCount: data.edges.length,
      activeNodeId: data.activeNodeId,
      timestamp: new Date(data.timestamp).toISOString()
    });
    
    return data;
  } catch (error) {
    logger.error('ChatStore: Failed to load session data', { error });
    return null;
  }
};

export const useChatStore = create<ChatState>((set, get) => ({
  nodes: [ROOT_NODE],
  edges: [],
  chatManager: null,
  activePath: {
    nodeIds: [],
    edgeIds: []
  },

  saveToSession: () => {
    const state = get();
    const sessionData: SessionData = {
      nodes: state.nodes,
      edges: state.edges,
      activeNodeId: state.activeNodeId,
      timestamp: Date.now(),
      version: SESSION_VERSION
    };
    
    saveSessionData(sessionData);
  },

  loadFromSession: () => {
    const sessionData = loadSessionData();
    if (!sessionData) {
      return false;
    }
    
    // Ensure root node exists
    const hasRoot = sessionData.nodes.some(node => node.id === 'root');
    if (!hasRoot) {
      sessionData.nodes.unshift(ROOT_NODE);
      logger.debug('ChatStore: Added missing root node to session data');
    }
    
    set((state) => {
      // Calculate active path after setting the new data
      const getPathNodeIds = (targetNodeId: string): string[] => {
        const path: string[] = [];
        let currentId: string | undefined = targetNodeId;
        
        const incoming = new Map<string, string>();
        sessionData.edges.forEach((edge) => {
          incoming.set(edge.target, edge.source);
        });
        
        while (currentId) {
          path.unshift(currentId);
          currentId = incoming.get(currentId);
          if (!currentId) break;
        }
        
        return path;
      };
      
      const getPathEdgeIds = (targetNodeId: string): string[] => {
        const nodeIds = getPathNodeIds(targetNodeId);
        const edgeIds: string[] = [];
        
        for (let i = 0; i < nodeIds.length - 1; i++) {
          const sourceId = nodeIds[i];
          const targetId = nodeIds[i + 1];
          
          const edge = sessionData.edges.find(e => e.source === sourceId && e.target === targetId);
          if (edge) {
            edgeIds.push(edge.id);
          }
        }
        
        return edgeIds;
      };
      
      return {
        nodes: sessionData.nodes,
        edges: sessionData.edges,
        activeNodeId: sessionData.activeNodeId,
        activePath: sessionData.activeNodeId ? {
          nodeIds: getPathNodeIds(sessionData.activeNodeId),
          edgeIds: getPathEdgeIds(sessionData.activeNodeId)
        } : { nodeIds: [], edgeIds: [] }
      };
    });
    
    logger.info('ChatStore: Session restored successfully');
    return true;
  },

  clearSession: () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      logger.info('ChatStore: Session cleared');
    } catch (error) {
      logger.error('ChatStore: Failed to clear session', { error });
    }
  },

  copyToClipboard: async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      logger.debug('ChatStore: Content copied to clipboard', { 
        contentLength: content.length,
        contentPreview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
      });
    } catch (error) {
      logger.error('ChatStore: Failed to copy to clipboard', { error });
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        logger.debug('ChatStore: Content copied to clipboard using fallback method');
      } catch (fallbackError) {
        logger.error('ChatStore: Fallback copy method also failed', { error: fallbackError });
        throw fallbackError;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  },

  initializeChatManager: (apiKey: string) => {
    logger.info('ChatStore: Initializing chat manager', { 
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0 
    });
    set({ chatManager: new ChatManager(apiKey) });
    logger.debug('ChatStore: Chat manager initialized successfully');
  },

  sendMessageToNode: async (nodeId: string, message: string) => {
    logger.info('ChatStore: Sending message to node', { 
      nodeId, 
      messageLength: message.length,
      messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    });

    const state = get();
    if (!state.chatManager) {
      logger.error('ChatStore: Chat manager not initialized', { nodeId });
      throw new Error('Chat manager not initialized');
    }

    const pathMessages = state.getPathToNode(nodeId);
    logger.debug('ChatStore: Retrieved path messages', { 
      nodeId, 
      pathLength: pathMessages.length 
    });

    const thread = state.chatManager.getThread(nodeId, pathMessages);
    logger.debug('ChatStore: Got thread from chat manager', { 
      nodeId, 
      hasThread: !!thread 
    });
    
    try {
      logger.debug('ChatStore: Calling chat manager sendMessage', { nodeId });
      const response = await state.chatManager.sendMessage(nodeId, message);
      logger.info('ChatStore: Received response from chat manager', { 
        nodeId, 
        responseLength: response.length,
        responsePreview: response.substring(0, 100) + (response.length > 100 ? '...' : '')
      });

      state.addMessageToNode(nodeId, { role: 'model', content: response, modelId: 'chatManager' });
      logger.debug('ChatStore: Model response added to node', { nodeId });
      
      // Save to session after successful message
      state.saveToSession();
    } catch (error) {
      logger.error('ChatStore: sendMessage failed', { 
        nodeId, 
        error: error instanceof Error ? error.message : error 
      });
      state.addMessageToNode(nodeId, { 
        role: 'model', 
        content: `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
        modelId: 'error'
      });
    }
  },

  onNodesChange: (changes) => {
    logger.debug('ChatStore: Processing node changes', { 
      changeCount: changes.length,
      changeTypes: changes.map(c => c.type)
    });

    set((state) => {
      const nodesToRemove = new Set<string>();
  
      for (const change of changes) {
        if (change.type === 'remove') {
          if (change.id === 'root') {
            logger.warn('ChatStore: Attempted to remove root node - blocked', { changeId: change.id });
            continue;
          }
          nodesToRemove.add(change.id);
          logger.debug('ChatStore: Node marked for removal', { nodeId: change.id });
        }
      }
  
      if (nodesToRemove.size > 0) {
        logger.info('ChatStore: Processing node removals', { 
          nodesToRemoveCount: nodesToRemove.size,
          nodeIds: Array.from(nodesToRemove)
        });

        const descendants = new Set<string>();
        const queue = [...nodesToRemove];
  
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          state.edges.forEach((edge) => {
            if (edge.source === currentId) {
              if (!descendants.has(edge.target)) {
                descendants.add(edge.target);
                queue.push(edge.target);
                logger.debug('ChatStore: Descendant node found', { 
                  parentId: currentId, 
                  descendantId: edge.target 
                });
              }
            }
          });
        }
  
        descendants.forEach((id) => nodesToRemove.add(id));
        
        logger.info('ChatStore: All descendants identified', { 
          totalNodesToRemove: nodesToRemove.size,
          descendants: Array.from(descendants)
        });
        
        // Clean up chat threads for removed nodes
        nodesToRemove.forEach(id => {
          state.chatManager?.deleteThread(id);
          logger.debug('ChatStore: Chat thread deleted', { nodeId: id });
        });
      }
  
      const remainingNodes = state.nodes.filter((node) => !nodesToRemove.has(node.id));
      const appliedChanges = applyNodeChanges(changes, remainingNodes);
      
      if (!appliedChanges.some(node => node.id === 'root')) {
        appliedChanges.push(ROOT_NODE);
        logger.debug('ChatStore: Root node restored to changes');
      }

      const newState = {
        nodes: appliedChanges as Node<CustomNodeData>[],
        edges: state.edges.filter((edge) => !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target)),
      };

      logger.info('ChatStore: Node changes applied', { 
        previousNodeCount: state.nodes.length,
        newNodeCount: newState.nodes.length,
        previousEdgeCount: state.edges.length,
        newEdgeCount: newState.edges.length,
        removedNodes: nodesToRemove.size
      });
  
      return newState;
    });
    
    // Save to session after node changes
    get().saveToSession();
  },

  onEdgesChange: (changes) => {
    logger.debug('ChatStore: Processing edge changes', { 
      changeCount: changes.length,
      changeTypes: changes.map(c => c.type)
    });

    set((state) => {
      const newEdges = applyEdgeChanges(changes, state.edges);
      logger.debug('ChatStore: Edge changes applied', { 
        previousEdgeCount: state.edges.length,
        newEdgeCount: newEdges.length
      });

      return { edges: newEdges };
    });
  },

  resetNode: (nodeId: string) => {
    logger.info('ChatStore: Resetting node', { nodeId });

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
            logger.debug('ChatStore: Descendant marked for removal', { 
              parentId: currentId, 
              descendantId: edge.target 
            });
          }
        });
      }

      logger.info('ChatStore: Node reset - descendants identified', { 
        nodeId,
        descendantsCount: nodesToRemove.size,
        descendants: Array.from(nodesToRemove)
      });

      const newState = {
        nodes: state.nodes.map(node => 
          node.id === nodeId 
            ? { ...node, data: { ...node.data, chatHistory: [], label: 'New Chat' } }
            : node
        ).filter(node => !nodesToRemove.has(node.id)),
        edges: state.edges.filter(edge => 
          !nodesToRemove.has(edge.target) && !nodesToRemove.has(edge.source)
        ),
      };

      logger.info('ChatStore: Node reset completed', { 
        nodeId,
        removedDescendants: nodesToRemove.size,
        remainingNodes: newState.nodes.length,
        remainingEdges: newState.edges.length
      });

      return newState;
    });
    
    // Save to session after node reset
    get().saveToSession();
  },

  addMessageToNode: (nodeId, message, isPartial = false) => {
    logger.debug('ChatStore: Adding message to node', { 
      nodeId, 
      messageRole: message.role,
      messageLength: message.content.length,
      messagePreview: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
      hasAttachments: !!message.attachments?.length,
      attachmentsCount: message.attachments?.length || 0,
      isPartial
    });

    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          const lastMessage = node.data.chatHistory[node.data.chatHistory.length - 1];
          const isSameRole = lastMessage?.role === message.role;
          
          logger.debug('ChatStore: Processing message addition', { 
            nodeId,
            hasLastMessage: !!lastMessage,
            lastMessageRole: lastMessage?.role,
            isSameRole,
            currentHistoryLength: node.data.chatHistory.length
          });
          
          const updatedChatHistory =
            isPartial && isSameRole
              ? node.data.chatHistory.map((msg: ChatMessage, idx: number) =>
                  idx === node.data.chatHistory.length - 1
                    ? { ...msg, content: message.content } // Keep attachments from original message
                    : msg
                )
              : [...node.data.chatHistory, message];

          logger.debug('ChatStore: Chat history updated', { 
            nodeId,
            previousLength: node.data.chatHistory.length,
            newLength: updatedChatHistory.length,
            wasPartialUpdate: isPartial && isSameRole
          });

          // Generate a new title when we get a model response
          if (message.role === 'model' && !isPartial && state.chatManager) {
            logger.debug('ChatStore: Generating new title for node', { nodeId });
            
            // Use the last few messages for context
            const recentMessages = updatedChatHistory.slice(-4);
            state.chatManager.generateTitle(recentMessages).then(newTitle => {
              logger.info('ChatStore: New title generated', { 
                nodeId, 
                newTitle,
                basedOnMessages: recentMessages.length
              });

              set(state => ({
                nodes: state.nodes.map(n => 
                  n.id === nodeId 
                    ? { ...n, data: { ...n.data, label: newTitle } }
                    : n
                )
              }));
              
              // Save to session after title update
              get().saveToSession();
            }).catch(error => {
              logger.error('ChatStore: Title generation failed', { 
                nodeId, 
                error: error instanceof Error ? error.message : error 
              });
              
              // Fallback to simple title
              const fallbackTitle = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
              logger.debug('ChatStore: Using fallback title', { nodeId, fallbackTitle });
              
              set(state => ({
                nodes: state.nodes.map(n => 
                  n.id === nodeId 
                    ? { ...n, data: { ...n.data, label: fallbackTitle } }
                    : n
                )
              }));
              
              // Save to session after fallback title
              get().saveToSession();
            });
          }

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
    
    // Save to session after adding message (but not for partial updates to avoid too many saves)
    if (!isPartial) {
      get().saveToSession();
    }
  },

  removeLastMessageFromNode: (nodeId) => {
    logger.info('ChatStore: Removing last message from node', { nodeId });

    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          const updatedChatHistory = node.data.chatHistory.slice(0, -1);
          
          logger.debug('ChatStore: Message removed from node', { 
            nodeId,
            previousLength: node.data.chatHistory.length,
            newLength: updatedChatHistory.length
          });

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
    
    // Save to session after removing message
    get().saveToSession();
  },

  createNodeAndEdge: (sourceNodeId, label, type) => {
    logger.info('ChatStore: Creating new node and edge', { 
      sourceNodeId, 
      label, 
      type 
    });

    const sourceNode = get().nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) {
      logger.error('ChatStore: Source node not found', { sourceNodeId });
      return '';
    }

    const newNodeId = nanoid();
    const newX = sourceNode.position.x + (type === 'branch' ? 350 : 0);
    const newY = sourceNode.position.y + 250;

    logger.debug('ChatStore: New node configuration', { 
      newNodeId,
      sourcePosition: sourceNode.position,
      newPosition: { x: newX, y: newY },
      type
    });

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

    set((state) => {
      const newState = {
        nodes: [...state.nodes, newNode],
        edges: addEdge(newEdge, state.edges),
      };

      logger.info('ChatStore: Node and edge created successfully', { 
        newNodeId,
        edgeId: newEdge.id,
        totalNodes: newState.nodes.length,
        totalEdges: newState.edges.length
      });

      return newState;
    });

    // Save to session after creating node and edge
    get().saveToSession();
    
    // Automatically set the new node as active for branch redirection
    const { setActiveNodeId } = get();
    setActiveNodeId(newNodeId);
    
    logger.info('ChatStore: New node set as active', { newNodeId });

    return newNodeId;
  },

  getPathNodeIds: (targetNodeId) => {
    logger.debug('ChatStore: Getting path node IDs', { targetNodeId });

    const { edges } = get();
    const path: string[] = [];
    let currentId: string | undefined = targetNodeId;
    
    // Build map of target -> source relationships
    const incoming = new Map<string, string>();
    edges.forEach((edge) => {
      incoming.set(edge.target, edge.source);
    });
    
    logger.debug('ChatStore: Built incoming edge map', { 
      targetNodeId,
      incomingMapSize: incoming.size
    });
    
    // Traverse up the tree to root
    while (currentId) {
      path.unshift(currentId);
      currentId = incoming.get(currentId);
      if (!currentId) break;
    }
    
    logger.debug('ChatStore: Path to node calculated', { 
      targetNodeId,
      pathLength: path.length,
      path
    });
    
    return path;
  },

  getPathEdgeIds: (targetNodeId) => {
    logger.debug('ChatStore: Getting path edge IDs', { targetNodeId });

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
        logger.debug('ChatStore: Edge found in path', { 
          sourceId, 
          targetId, 
          edgeId: edge.id 
        });
      }
    }
    
    logger.debug('ChatStore: Path edges calculated', { 
      targetNodeId,
      pathEdgesCount: edgeIds.length,
      edgeIds
    });
    
    return edgeIds;
  },

  getPathToNode: (targetNodeId) => {
    logger.debug('ChatStore: Getting conversation path to node', { targetNodeId });

    const { nodes } = get();
    const pathNodeIds = get().getPathNodeIds(targetNodeId);
    const pathMessages: ChatMessage[] = [];
    
    logger.debug('ChatStore: Processing path nodes for messages', { 
      targetNodeId,
      pathNodesCount: pathNodeIds.length,
      pathNodeIds
    });
    
    // Collect messages from all nodes in the path, maintaining conversation context
    pathNodeIds.forEach((id, index) => {
      const node = nodes.find(n => n.id === id);
      if (node?.data.chatHistory) {
        logger.debug('ChatStore: Processing node messages', { 
          nodeId: id,
          nodeIndex: index,
          messagesCount: node.data.chatHistory.length,
          nodeLabel: node.data.label
        });

        // Include all messages from this node, preserving attachments
        node.data.chatHistory.forEach((msg, msgIndex) => {
          pathMessages.push({
            role: msg.role,
            content: msg.content,
            attachments: msg.attachments || []
          });
          
          logger.debug('ChatStore: Message added to path', { 
            nodeId: id,
            messageIndex: msgIndex,
            messageRole: msg.role,
            messageLength: msg.content.length,
            hasAttachments: !!msg.attachments?.length
          });
        });
      } else {
        logger.debug('ChatStore: Node has no chat history', { nodeId: id });
      }
    });
    
    logger.info('ChatStore: Conversation path assembled', { 
      targetNodeId,
      totalMessages: pathMessages.length,
      messagesBreakdown: pathMessages.reduce((acc, msg) => {
        acc[msg.role] = (acc[msg.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalAttachments: pathMessages.reduce((sum, msg) => sum + (msg.attachments?.length || 0), 0)
    });
    
    return pathMessages;
  },

  deleteNodeAndDescendants: (nodeId) => {
    logger.info('ChatStore: Deleting node and descendants', { nodeId });

    set((state) => {
      if (nodeId === 'root') {
        logger.warn('ChatStore: Cannot delete root node', { nodeId });
        return state;
      }
      
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
              logger.debug('ChatStore: Descendant found for deletion', { 
                parentId: currentId, 
                descendantId: edge.target 
              });
            }
          }
        });
      }
      
      logger.info('ChatStore: All descendants identified for deletion', { 
        nodeId,
        totalNodesToDelete: nodesToRemove.size,
        nodeIds: Array.from(nodesToRemove)
      });
      
      // Clean up chat threads for removed nodes
      nodesToRemove.forEach(id => {
        state.chatManager?.deleteThread(id);
        logger.debug('ChatStore: Chat thread deleted for node', { nodeId: id });
      });
      
      const newState = {
        nodes: state.nodes.filter((node) => !nodesToRemove.has(node.id)),
        edges: state.edges.filter((edge) => !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target)),
      };

      logger.info('ChatStore: Node deletion completed', { 
        nodeId,
        deletedNodes: nodesToRemove.size,
        remainingNodes: newState.nodes.length,
        remainingEdges: newState.edges.length
      });

      return newState;
    });
    
    // Save to session after node deletion
    get().saveToSession();
  },

  activeNodeId: null,
  setActiveNodeId: (nodeId) => {
    logger.info('ChatStore: Setting active node', { 
      previousActiveNodeId: get().activeNodeId,
      newActiveNodeId: nodeId
    });

    if (!nodeId) {
      logger.debug('ChatStore: Clearing active node');
      set({ 
        activeNodeId: null,
        activePath: { nodeIds: [], edgeIds: [] }
      });
      get().saveToSession();
      return;
    }
    
    const nodeIds = get().getPathNodeIds(nodeId);
    const edgeIds = get().getPathEdgeIds(nodeId);
    
    logger.debug('ChatStore: Active path calculated', { 
      activeNodeId: nodeId,
      pathNodesCount: nodeIds.length,
      pathEdgesCount: edgeIds.length
    });
    
    set({ 
      activeNodeId: nodeId,
      activePath: { nodeIds, edgeIds }
    });

    logger.info('ChatStore: Active node set successfully', { 
      activeNodeId: nodeId,
      activePath: { nodeIds, edgeIds }
    });
    
    // Save to session when active node changes
    get().saveToSession();
  },
})); 