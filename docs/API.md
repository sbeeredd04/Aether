# Aether AI - API Reference

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Major+Mono+Display&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet">

<div align="center">
  <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px;">
    <img src="../aether/public/aether.svg" alt="Aether AI Logo" width="50" height="50" />
    <h1 style="font-family: 'Major Mono Display', monospace; font-size: 32px; margin: 0; color: #333;">API Reference</h1>
  </div>
</div>

Comprehensive API documentation for Aether AI's internal APIs, external integrations, and developer interfaces.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Core APIs](#core-apis)
- [Store API](#store-api)
- [Utility APIs](#utility-apis)
- [External Integrations](#external-integrations)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## Overview

Aether AI provides several API layers for different purposes:

- **Store API**: State management through Zustand
- **Utility APIs**: Helper functions for common operations
- **External APIs**: Integration with Google Gemini and other services
- **Component APIs**: Props and interfaces for React components

## Authentication

### Google Gemini API

All AI functionality requires a valid Google AI API key.

```typescript
// Environment variable
GOOGLE_AI_API_KEY=your_api_key_here

// Usage in code
const client = new GoogleGenAI(process.env.GOOGLE_AI_API_KEY);
```

### API Key Management

```typescript
interface APIConfiguration {
  googleAI: {
    apiKey: string;
    endpoint?: string;
    timeout?: number;
  };
}

const validateAPIKey = (key: string): boolean => {
  return key.startsWith('AIza') && key.length >= 39;
};
```

## Core APIs

### Chat Store API

The primary state management interface for conversations and graph data.

#### Store State

```typescript
interface ChatState {
  // Graph data
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  activeNodeId: string | null;
  
  // UI state
  isGenerating: boolean;
  sidebarOpen: boolean;
  selectedModel: string;
  
  // Settings
  webSearchEnabled: boolean;
  persistentStorageEnabled: boolean;
  
  // Actions
  addNode: (node: Node<CustomNodeData>) => void;
  updateNode: (nodeId: string, updates: Partial<CustomNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: Edge) => void;
  setActiveNode: (nodeId: string | null) => void;
  
  // Async operations
  generateResponse: (nodeId: string, prompt: string) => Promise<void>;
  saveToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  exportWorkspace: () => Promise<string>;
  importWorkspace: (data: string) => Promise<void>;
}
```

#### Node Operations

```typescript
// Add a new conversation node
const addNode = (node: Node<CustomNodeData>) => void;

// Example usage
const newNode: Node<CustomNodeData> = {
  id: nanoid(),
  type: 'chatNode',
  position: { x: 100, y: 100 },
  data: {
    label: 'New Conversation',
    chatHistory: []
  }
};

store.addNode(newNode);
```

```typescript
// Update existing node
const updateNode = (
  nodeId: string, 
  updates: Partial<CustomNodeData>
) => void;

// Example usage
store.updateNode('node-123', {
  label: 'Updated Conversation',
  chatHistory: [...existingHistory, newMessage]
});
```

```typescript
// Delete node and associated edges
const deleteNode = (nodeId: string) => void;

// Example usage
store.deleteNode('node-123');
```

#### Message Operations

```typescript
// Add message to specific node
const addMessageToNode = (
  nodeId: string,
  message: ChatMessage
) => Promise<void>;

// Message interface
interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  attachments?: AttachmentData[];
  modelId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Example usage
await store.addMessageToNode('node-123', {
  role: 'user',
  content: 'Hello, AI!',
  timestamp: Date.now()
});
```

#### AI Generation

```typescript
// Generate AI response for a node
const generateResponse = (
  nodeId: string,
  options?: GenerationOptions
) => Promise<void>;

interface GenerationOptions {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  webSearchEnabled?: boolean;
  systemPrompt?: string;
}

// Example usage
await store.generateResponse('node-123', {
  modelId: 'gemini-2.0-flash',
  temperature: 0.7,
  webSearchEnabled: true
});
```

### Graph Operations API

```typescript
// Create node and connecting edge
const createNodeAndEdge = (
  sourceNodeId: string,
  position: { x: number; y: number },
  initialMessage?: ChatMessage
) => Promise<string>; // Returns new node ID

// Branch conversation from existing node
const branchFromNode = (
  sourceNodeId: string,
  branchPrompt: string
) => Promise<string>;

// Reset node to specific message index
const resetNodeToMessage = (
  nodeId: string,
  messageIndex: number
) => void;

// Example usage
const newNodeId = await store.createNodeAndEdge('source-123', { x: 200, y: 200 });
await store.branchFromNode('node-123', 'What about a different approach?');
store.resetNodeToMessage('node-123', 2);
```

## Store API

### Selectors

```typescript
// Get specific node data
const useNodeData = (nodeId: string) => {
  return useChatStore(state => 
    state.nodes.find(n => n.id === nodeId)?.data
  );
};

// Get active conversation
const useActiveConversation = () => {
  return useChatStore(state => {
    if (!state.activeNodeId) return null;
    return state.nodes.find(n => n.id === state.activeNodeId);
  });
};

// Get conversation thread (path from root to node)
const useConversationThread = (nodeId: string) => {
  return useChatStore(state => {
    const getPath = (id: string): Node<CustomNodeData>[] => {
      const node = state.nodes.find(n => n.id === id);
      if (!node) return [];
      
      const parentEdge = state.edges.find(e => e.target === id);
      if (!parentEdge) return [node];
      
      return [...getPath(parentEdge.source), node];
    };
    
    return getPath(nodeId);
  });
};

// Get node statistics
const useNodeStats = () => {
  return useChatStore(state => ({
    totalNodes: state.nodes.length,
    totalMessages: state.nodes.reduce(
      (acc, node) => acc + node.data.chatHistory.length, 
      0
    ),
    activeConversations: state.nodes.filter(
      node => node.data.chatHistory.length > 0
    ).length
  }));
};
```

### Actions

```typescript
// UI state management
const toggleSidebar = () => void;
const setSelectedModel = (modelId: string) => void;
const toggleWebSearch = () => void;
const togglePersistentStorage = () => void;

// Bulk operations
const clearAllData = () => void;
const duplicateNode = (nodeId: string) => Promise<string>;
const mergeNodes = (nodeIds: string[]) => Promise<string>;

// Example usage
store.toggleSidebar();
store.setSelectedModel('gemini-2.5-flash');
const duplicatedNodeId = await store.duplicateNode('node-123');
```

## Utility APIs

### Gemini Client API

```typescript
class GeminiClient {
  constructor(apiKey: string);
  
  // Generate content with streaming
  generateContentStream(
    messages: ChatMessage[],
    options: GenerationOptions
  ): AsyncGenerator<TextChunk, GenerateResult>;
  
  // Generate content (non-streaming)
  generateContent(
    messages: ChatMessage[],
    options: GenerationOptions
  ): Promise<GenerateResult>;
  
  // Health check
  checkHealth(): Promise<boolean>;
  
  // Get available models
  getModels(): Promise<ModelDefinition[]>;
}

// Response types
interface GenerateResult {
  type: 'text' | 'image' | 'audio';
  content: string;
  metadata?: {
    finishReason: string;
    safetyRatings: SafetyRating[];
    citations?: Citation[];
  };
}

interface TextChunk {
  text: string;
  isComplete: boolean;
}
```

### Storage API

```typescript
// Persistent storage manager
class PersistentStorageManager {
  // Check if persistent storage is available
  static isAvailable(): boolean;
  
  // Get user consent for persistent storage
  static async requestConsent(): Promise<boolean>;
  
  // Save data to persistent storage
  static async save(key: string, data: any): Promise<void>;
  
  // Load data from persistent storage
  static async load<T>(key: string): Promise<T | null>;
  
  // Clear all persistent data
  static async clear(): Promise<void>;
  
  // Get storage usage statistics
  static async getStorageStats(): Promise<StorageStats>;
  
  // Compress large data before saving
  static async compress(data: any): Promise<string>;
  
  // Decompress data after loading
  static async decompress(compressedData: string): Promise<any>;
}

interface StorageStats {
  used: number;
  available: number;
  percentage: number;
  quota: number;
}
```

### Workspace Manager API

```typescript
class WorkspaceManager {
  // Export complete workspace
  static exportWorkspace(
    nodes: Node<CustomNodeData>[],
    edges: Edge[],
    metadata?: WorkspaceMetadata
  ): Promise<string>;
  
  // Import workspace from JSON
  static importWorkspace(
    data: string
  ): Promise<{
    nodes: Node<CustomNodeData>[];
    edges: Edge[];
    metadata: WorkspaceMetadata;
  }>;
  
  // Validate workspace data
  static validateWorkspace(data: any): ValidationResult;
  
  // Generate workspace summary
  static generateSummary(
    nodes: Node<CustomNodeData>[],
    edges: Edge[]
  ): WorkspaceSummary;
}

interface WorkspaceMetadata {
  exportedAt: number;
  exportVersion: string;
  nodeCount: number;
  edgeCount: number;
  totalMessages: number;
  source: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface WorkspaceSummary {
  totalNodes: number;
  totalConversations: number;
  longestThread: number;
  modelUsage: Record<string, number>;
  createdAt: number;
  lastModified: number;
}
```

### Model Manager API

```typescript
// Get available AI models
const getModels = (): ModelDefinition[];

// Get specific model by ID
const getModelById = (id: string): ModelDefinition | undefined;

// Check if model supports feature
const modelSupports = (
  modelId: string, 
  feature: ModelFeature
): boolean;

// Get optimal model for task
const getOptimalModel = (
  task: TaskType,
  requirements: ModelRequirements
): ModelDefinition;

// Model types
interface ModelDefinition {
  id: string;
  name: string;
  apiModel: string;
  supportedInputs: InputType[];
  supportedOutputs: OutputType[];
  capabilities: ModelCapabilities;
  isThinking?: boolean;
  supportsGrounding?: boolean;
  optimizedFor?: string;
}

type ModelFeature = 
  | 'thinking' 
  | 'grounding' 
  | 'documents' 
  | 'images' 
  | 'audio';

type TaskType = 
  | 'conversation' 
  | 'research' 
  | 'analysis' 
  | 'creative';
```

## External Integrations

### Google Gemini API

```typescript
// Direct API integration
interface GeminiAPIClient {
  // Text generation
  generateText(request: GenerateTextRequest): Promise<GenerateTextResponse>;
  
  // Streaming text generation
  generateTextStream(
    request: GenerateTextRequest
  ): AsyncGenerator<GenerateTextResponse>;
  
  // Multimodal generation
  generateMultimodal(
    request: GenerateMultimodalRequest
  ): Promise<GenerateMultimodalResponse>;
  
  // Web grounding
  generateGroundedText(
    request: GroundedTextRequest
  ): Promise<GroundedTextResponse>;
}

// Request types
interface GenerateTextRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'model';
    parts: Part[];
  }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
  safetySettings?: SafetySettings[];
}

interface GenerateTextResponse {
  candidates: Array<{
    content: {
      parts: Part[];
      role: string;
    };
    finishReason: string;
    safetyRatings: SafetyRating[];
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
```

### Web Search Integration

```typescript
// Google Search integration via Gemini
interface GroundingConfig {
  googleSearchRetrieval: {
    disableAttribution?: boolean;
  };
}

interface Citation {
  startIndex: number;
  endIndex: number;
  uri: string;
  title: string;
  license?: string;
  publicationDate?: string;
}

// Grounded response handling
const processGroundedResponse = (
  response: GroundedTextResponse
): {
  content: string;
  citations: Citation[];
  sources: Source[];
} => {
  // Implementation details
};
```

## Error Handling

### Error Types

```typescript
// Base error class
class AetherError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AetherError';
  }
}

// Specific error types
class APIError extends AetherError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, 'API_ERROR', statusCode, details);
  }
}

class ValidationError extends AetherError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field });
  }
}

class StorageError extends AetherError {
  constructor(message: string, operation?: string) {
    super(message, 'STORAGE_ERROR', 500, { operation });
  }
}

class ModelError extends AetherError {
  constructor(message: string, modelId?: string) {
    super(message, 'MODEL_ERROR', 500, { modelId });
  }
}
```

### Error Handling Patterns

```typescript
// Try-catch with specific error handling
const handleAPICall = async (): Promise<Result<T, AetherError>> => {
  try {
    const result = await apiCall();
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof APIError) {
      logger.error('API call failed', { error });
      return { success: false, error };
    }
    
    if (error instanceof ValidationError) {
      logger.warn('Validation failed', { error });
      return { success: false, error };
    }
    
    // Unknown error
    const unknownError = new AetherError(
      'Unknown error occurred',
      'UNKNOWN_ERROR',
      500,
      { originalError: error }
    );
    
    return { success: false, error: unknownError };
  }
};

// Result type for error handling
type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

### Global Error Handler

```typescript
// Global error boundary
const GlobalErrorHandler = {
  handleError: (error: Error, context?: string) => {
    logger.error('Global error', { error, context });
    
    // Send to error tracking service (if configured)
    if (process.env.NODE_ENV === 'production') {
      // errorTracker.reportError(error, context);
    }
    
    // Show user-friendly message
    showErrorToast(getErrorMessage(error));
  },
  
  handleApiError: (error: APIError) => {
    if (error.statusCode === 401) {
      // Handle authentication error
      redirectToLogin();
    } else if (error.statusCode >= 500) {
      // Handle server error
      showErrorToast('Service temporarily unavailable');
    } else {
      // Handle client error
      showErrorToast(error.message);
    }
  }
};
```

## Rate Limiting

### Client-Side Rate Limiting

```typescript
class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  async acquire(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }
    
    this.requests.push(now);
  }
}

// Usage
const geminiRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute

const makeAPICall = async () => {
  await geminiRateLimiter.acquire();
  return geminiClient.generateContent(messages);
};
```

### Request Queuing

```typescript
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  
  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      await request();
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.processing = false;
  }
}
```

## Examples

### Basic Conversation Flow

```typescript
// Initialize store
const store = useChatStore();

// Create initial node
const rootNode: Node<CustomNodeData> = {
  id: 'root',
  type: 'chatNode',
  position: { x: 0, y: 0 },
  data: {
    label: 'Root Conversation',
    chatHistory: []
  }
};

store.addNode(rootNode);

// Add user message
await store.addMessageToNode('root', {
  role: 'user',
  content: 'Hello, how can you help me today?',
  timestamp: Date.now()
});

// Generate AI response
await store.generateResponse('root');

// Create branch
const branchNodeId = await store.branchFromNode(
  'root', 
  'Can you explain that differently?'
);
```

### File Upload and Processing

```typescript
// Handle file upload
const handleFileUpload = async (file: File) => {
  const attachment: AttachmentData = {
    name: file.name,
    type: file.type,
    data: await fileToBase64(file),
    previewUrl: URL.createObjectURL(file)
  };
  
  await store.addMessageToNode(activeNodeId, {
    role: 'user',
    content: `I've uploaded a file: ${file.name}`,
    attachments: [attachment],
    timestamp: Date.now()
  });
  
  // Generate response with file context
  await store.generateResponse(activeNodeId, {
    includeAttachments: true
  });
};

// File to base64 utility
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
```

### Workspace Export/Import

```typescript
// Export workspace
const exportWorkspace = async () => {
  try {
    const workspaceData = await store.exportWorkspace();
    
    // Download as JSON file
    const blob = new Blob([workspaceData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `aether-workspace-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
  }
};

// Import workspace
const importWorkspace = async (file: File) => {
  try {
    const text = await file.text();
    await store.importWorkspace(text);
    
    // Show success message
    showSuccessToast('Workspace imported successfully');
  } catch (error) {
    console.error('Import failed:', error);
    showErrorToast('Failed to import workspace');
  }
};
```

### Custom Model Integration

```typescript
// Add custom model configuration
const customModel: ModelDefinition = {
  id: 'custom-gemini-model',
  name: 'Custom Gemini Configuration',
  apiModel: 'gemini-2.0-flash',
  supportedInputs: ['text', 'image'],
  supportedOutputs: ['text'],
  capabilities: {
    thinking: true,
    documentUnderstanding: true
  },
  optimizedFor: 'Custom use case',
  useGroundingPipeline: false
};

// Register custom model
modelRegistry.register(customModel);

// Use custom model
await store.generateResponse('node-id', {
  modelId: 'custom-gemini-model',
  temperature: 0.5,
  maxTokens: 1000
});
```

---

## Related Documentation

- [Architecture Guide](./ARCHITECTURE.md) - System architecture overview
- [Development Guide](./DEVELOPMENT.md) - Developer setup and guidelines
- [Component Reference](./COMPONENTS.md) - React component documentation
- [User Guide](./USER_GUIDE.md) - End-user functionality guide

---

<div align="center">
  <p style="font-family: 'Space Grotesk', sans-serif;">
    For API questions or feature requests, please 
    <a href="https://github.com/sbeeredd04/Aether/issues">open an issue</a> 
    on GitHub.
  </p>
</div>