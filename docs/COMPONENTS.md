# Aether AI - Component Reference

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Major+Mono+Display&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet">

<div align="center">
  <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px;">
    <img src="../aether/public/aether.svg" alt="Aether AI Logo" width="50" height="50" />
    <h1 style="font-family: 'Major Mono Display', monospace; font-size: 32px; margin: 0; color: #333;">Component Reference</h1>
  </div>
</div>

Comprehensive documentation of all React components in the Aether AI application, including props, usage examples, and implementation details.

## Table of Contents

- [Core Components](#core-components)
- [UI Components](#ui-components)
- [Modal Components](#modal-components)
- [Layout Components](#layout-components)
- [Utility Components](#utility-components)
- [Custom Hooks](#custom-hooks)
- [Component Patterns](#component-patterns)
- [Testing Components](#testing-components)

## Core Components

### CustomChatNode

The main conversation node component that displays chat history and handles user interactions.

```typescript
interface CustomChatNodeProps {
  /** Node data containing conversation history */
  data: CustomNodeData;
  /** Whether the node is currently selected */
  isSelected: boolean;
  /** Callback when node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Callback when branch button is clicked */
  onBranch?: (nodeId: string) => void;
  /** Callback when delete button is clicked */
  onDelete?: (nodeId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

const CustomChatNode: React.FC<CustomChatNodeProps> = ({
  data,
  isSelected,
  onNodeClick,
  onBranch,
  onDelete,
  className
}) => {
  // Component implementation
};
```

**Usage Example:**
```tsx
<CustomChatNode
  data={{
    label: "Conversation Node",
    chatHistory: [
      { role: 'user', content: 'Hello!', timestamp: Date.now() },
      { role: 'model', content: 'Hi there!', timestamp: Date.now() }
    ]
  }}
  isSelected={true}
  onNodeClick={(id) => console.log('Node clicked:', id)}
  onBranch={(id) => createBranch(id)}
  onDelete={(id) => deleteNode(id)}
/>
```

**Key Features:**
- Displays conversation history with proper message formatting
- Handles markdown rendering with syntax highlighting
- Shows attachment previews
- Provides action buttons for branching and deletion
- Supports responsive design for mobile devices

### NodeSidebar

Context panel that shows detailed conversation information and document context.

```typescript
interface NodeSidebarProps {
  /** Whether the sidebar is open */
  isOpen: boolean;
  /** Callback to close the sidebar */
  onClose: () => void;
  /** Node data to display */
  data: CustomNodeData | null;
  /** ID of the current node */
  nodeId: string | null;
  /** Whether this is the root node */
  isRootNode?: boolean;
  /** Callback to reset conversation */
  onReset?: () => void;
  /** Callback to delete conversation */
  onDelete?: () => void;
  /** Callback to branch conversation */
  onBranch?: () => void;
  /** Sidebar width in pixels */
  width?: number;
  /** Whether active node is loading */
  isActiveNodeLoading?: boolean;
  /** Callback when image is clicked */
  onImageClick?: (imageUrl: string) => void;
  /** Whether running on mobile device */
  isMobile?: boolean;
  /** Current streaming state */
  streamingState?: StreamingState;
}
```

**Usage Example:**
```tsx
<NodeSidebar
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
  data={activeNodeData}
  nodeId={activeNodeId}
  isRootNode={activeNodeId === 'root'}
  onReset={handleReset}
  onDelete={handleDelete}
  onBranch={handleBranch}
  width={384}
  isMobile={window.innerWidth < 768}
/>
```

**Key Features:**
- Shows conversation thread from root to current node
- Displays document context and attachments
- Provides quick action buttons
- Shows real-time streaming status
- Responsive design with mobile optimization

### PromptBar

Input interface for user messages with model selection and settings.

```typescript
interface PromptBarProps {
  /** Current conversation node ID */
  nodeId: string | null;
  /** Whether AI is currently generating */
  isGenerating: boolean;
  /** Placeholder text for input */
  placeholder?: string;
  /** Whether to show model selector */
  showModelSelector?: boolean;
  /** Whether to show settings button */
  showSettings?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

**Usage Example:**
```tsx
<PromptBar
  nodeId={activeNodeId}
  isGenerating={store.isGenerating}
  placeholder="Type your message..."
  showModelSelector={true}
  showSettings={true}
/>
```

**Key Features:**
- Multi-line text input with auto-resize
- File upload via drag-and-drop or click
- Model selection dropdown
- Settings panel integration
- Voice input modal trigger
- Send button with loading state

### AetherDemo

Main workspace component that orchestrates the conversation graph.

```typescript
interface AetherDemoProps {
  /** Initial nodes for the graph */
  initialNodes?: Node<CustomNodeData>[];
  /** Initial edges for the graph */
  initialEdges?: Edge[];
  /** Whether to show welcome message */
  showWelcome?: boolean;
  /** Custom styling */
  className?: string;
}
```

**Usage Example:**
```tsx
<AetherDemo
  initialNodes={[]}
  initialEdges={[]}
  showWelcome={true}
  className="h-screen w-full"
/>
```

**Key Features:**
- React Flow integration for graph visualization
- Node and edge management
- Sidebar integration
- Background pattern rendering
- Mobile responsiveness
- Keyboard shortcuts

## UI Components

### Button Components

#### Primary Button

```typescript
interface ButtonProps {
  /** Button content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}
```

**Usage Example:**
```tsx
<Button
  variant="primary"
  size="md"
  loading={isLoading}
  icon={<PlusIcon />}
  onClick={handleClick}
>
  Create Branch
</Button>
```

#### Icon Button

```typescript
interface IconButtonProps {
  /** Icon to display */
  icon: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether button is disabled */
  disabled?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Additional CSS classes */
  className?: string;
}
```

### Input Components

#### Text Input

```typescript
interface TextInputProps {
  /** Input value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'url';
  /** Additional CSS classes */
  className?: string;
}
```

#### Textarea

```typescript
interface TextareaProps {
  /** Textarea value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Number of rows */
  rows?: number;
  /** Whether to auto-resize */
  autoResize?: boolean;
  /** Whether textarea is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

### Dropdown Components

#### Select Dropdown

```typescript
interface SelectProps<T> {
  /** Selected value */
  value: T;
  /** Change handler */
  onChange: (value: T) => void;
  /** Available options */
  options: Array<{
    value: T;
    label: string;
    disabled?: boolean;
  }>;
  /** Placeholder text */
  placeholder?: string;
  /** Whether select is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

**Usage Example:**
```tsx
<Select
  value={selectedModel}
  onChange={setSelectedModel}
  options={[
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }
  ]}
  placeholder="Select model..."
/>
```

### Silk Background

Animated background component with flowing silk-like effects.

```typescript
interface SilkProps {
  /** Animation speed multiplier */
  speed?: number;
  /** Number of silk strands */
  count?: number;
  /** Color theme */
  theme?: 'purple' | 'blue' | 'gradient';
  /** Whether animation is paused */
  paused?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

**Usage Example:**
```tsx
<Silk
  speed={1.5}
  count={3}
  theme="gradient"
  className="fixed inset-0 -z-10"
/>
```

## Modal Components

### Base Modal

```typescript
interface ModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Whether clicking overlay closes modal */
  closeOnOverlayClick?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

### ModelInfoModal

Displays detailed information about AI models.

```typescript
interface ModelInfoModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Model to display info for */
  model: ModelDefinition | null;
}
```

**Usage Example:**
```tsx
<ModelInfoModal
  isOpen={showModelInfo}
  onClose={() => setShowModelInfo(false)}
  model={selectedModel}
/>
```

### SettingsPanel

Configuration panel for user preferences and app settings.

```typescript
interface SettingsPanelProps {
  /** Whether panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Current settings */
  settings: AppSettings;
  /** Settings change handler */
  onSettingsChange: (settings: Partial<AppSettings>) => void;
}
```

### ImageModal

Full-screen image viewer with zoom and pan capabilities.

```typescript
interface ImageModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Image URL to display */
  imageUrl: string | null;
  /** Image alt text */
  alt?: string;
  /** Whether to show download button */
  showDownload?: boolean;
}
```

### VoiceInputModal

Voice recording interface for speech-to-text input.

```typescript
interface VoiceInputModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Callback when voice input is complete */
  onVoiceInput: (transcript: string) => void;
  /** Recording language */
  language?: string;
}
```

## Layout Components

### Container

Responsive container component with max-width constraints.

```typescript
interface ContainerProps {
  /** Container content */
  children: React.ReactNode;
  /** Container size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to center content */
  centered?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

### Grid

Responsive grid layout component.

```typescript
interface GridProps {
  /** Grid content */
  children: React.ReactNode;
  /** Number of columns */
  cols?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  /** Gap between items */
  gap?: number;
  /** Additional CSS classes */
  className?: string;
}
```

### Stack

Vertical or horizontal stack layout component.

```typescript
interface StackProps {
  /** Stack content */
  children: React.ReactNode;
  /** Stack direction */
  direction?: 'horizontal' | 'vertical';
  /** Space between items */
  spacing?: number;
  /** Alignment */
  align?: 'start' | 'center' | 'end';
  /** Justification */
  justify?: 'start' | 'center' | 'end' | 'between';
  /** Additional CSS classes */
  className?: string;
}
```

## Utility Components

### LoadingSpinner

Animated loading indicator with customizable appearance.

```typescript
interface LoadingSpinnerProps {
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg';
  /** Spinner color */
  color?: 'primary' | 'secondary' | 'white';
  /** Loading text */
  text?: string;
  /** Additional CSS classes */
  className?: string;
}
```

### ErrorBoundary

React error boundary for catching and displaying component errors.

```typescript
interface ErrorBoundaryProps {
  /** Content to render */
  children: React.ReactNode;
  /** Fallback component for errors */
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  /** Error handler callback */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
```

### CopyButton

Button component for copying text to clipboard.

```typescript
interface CopyButtonProps {
  /** Text to copy */
  text: string;
  /** Button label */
  label?: string;
  /** Success message */
  successMessage?: string;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}
```

**Usage Example:**
```tsx
<CopyButton
  text={codeBlock}
  label="Copy code"
  successMessage="Copied!"
  size="sm"
/>
```

### Toast

Toast notification component for user feedback.

```typescript
interface ToastProps {
  /** Whether toast is visible */
  isVisible: boolean;
  /** Toast message */
  message: string;
  /** Toast type */
  type?: 'success' | 'error' | 'warning' | 'info';
  /** Auto-dismiss duration in ms */
  duration?: number;
  /** Close handler */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}
```

## Custom Hooks

### useChat

Hook for managing chat operations in a specific node.

```typescript
const useChat = (nodeId: string | null) => {
  const store = useChatStore();
  
  const sendMessage = useCallback(async (content: string, attachments?: AttachmentData[]) => {
    if (!nodeId) return;
    
    await store.addMessageToNode(nodeId, {
      role: 'user',
      content,
      attachments,
      timestamp: Date.now()
    });
    
    await store.generateResponse(nodeId);
  }, [nodeId, store]);
  
  return {
    messages: nodeId ? store.getNodeMessages(nodeId) : [],
    sendMessage,
    isLoading: store.isGenerating,
    nodeData: nodeId ? store.getNode(nodeId) : null
  };
};
```

### useFileUpload

Hook for handling file upload operations.

```typescript
const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const uploadFile = useCallback(async (file: File): Promise<AttachmentData | null> => {
    setUploading(true);
    setError(null);
    
    try {
      const attachment = await processFile(file);
      return attachment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);
  
  return { uploadFile, uploading, error };
};
```

### useLocalStorage

Hook for managing local storage with type safety.

```typescript
const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  
  const setStoredValue = useCallback((newValue: T | ((val: T) => T)) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, value]);
  
  return [value, setStoredValue] as const;
};
```

### useDebounce

Hook for debouncing rapidly changing values.

```typescript
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};
```

## Component Patterns

### Compound Components

```typescript
// Card compound component
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className }: CardProps) => (
  <div className={clsx('bg-gray-900 rounded-lg border border-gray-700', className)}>
    {children}
  </div>
);

const CardHeader = ({ children, className }: CardHeaderProps) => (
  <div className={clsx('p-4 border-b border-gray-700', className)}>
    {children}
  </div>
);

const CardBody = ({ children, className }: CardBodyProps) => (
  <div className={clsx('p-4', className)}>
    {children}
  </div>
);

const CardFooter = ({ children, className }: CardFooterProps) => (
  <div className={clsx('p-4 border-t border-gray-700', className)}>
    {children}
  </div>
);

// Usage
<Card>
  <CardHeader>
    <h3>Card Title</h3>
  </CardHeader>
  <CardBody>
    <p>Card content</p>
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Render Props Pattern

```typescript
interface DataFetcherProps<T> {
  url: string;
  children: (data: {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => React.ReactNode;
}

const DataFetcher = <T,>({ url, children }: DataFetcherProps<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(url);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fetch failed'));
    } finally {
      setLoading(false);
    }
  }, [url]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return <>{children({ data, loading, error, refetch: fetchData })}</>;
};

// Usage
<DataFetcher<ModelDefinition[]> url="/api/models">
  {({ data, loading, error }) => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} />;
    return <ModelList models={data || []} />;
  }}
</DataFetcher>
```

## Testing Components

### Component Testing Setup

```typescript
// Test utilities
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Mock store provider for testing
const createMockStore = (initialState = {}) => ({
  ...defaultStoreState,
  ...initialState
});

const renderWithStore = (component: React.ReactElement, storeState = {}) => {
  const mockStore = createMockStore(storeState);
  return render(
    <StoreProvider value={mockStore}>
      {component}
    </StoreProvider>
  );
};
```

### Component Test Examples

```typescript
// CustomChatNode test
describe('CustomChatNode', () => {
  const mockProps = {
    data: {
      label: 'Test Node',
      chatHistory: [
        { role: 'user' as const, content: 'Hello', timestamp: Date.now() },
        { role: 'model' as const, content: 'Hi there!', timestamp: Date.now() }
      ]
    },
    isSelected: false,
    onNodeClick: jest.fn(),
    onBranch: jest.fn(),
    onDelete: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders messages correctly', () => {
    render(<CustomChatNode {...mockProps} />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });
  
  it('handles branch action', async () => {
    const user = userEvent.setup();
    render(<CustomChatNode {...mockProps} />);
    
    const branchButton = screen.getByRole('button', { name: /branch/i });
    await user.click(branchButton);
    
    expect(mockProps.onBranch).toHaveBeenCalledTimes(1);
  });
  
  it('shows selected state', () => {
    render(<CustomChatNode {...mockProps} isSelected={true} />);
    
    const nodeElement = screen.getByTestId('chat-node');
    expect(nodeElement).toHaveClass('selected');
  });
});

// PromptBar test
describe('PromptBar', () => {
  const mockProps = {
    nodeId: 'test-node',
    isGenerating: false
  };
  
  it('sends message on submit', async () => {
    const user = userEvent.setup();
    renderWithStore(<PromptBar {...mockProps} />);
    
    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(input, 'Test message');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
  });
  
  it('disables input when generating', () => {
    renderWithStore(<PromptBar {...mockProps} isGenerating={true} />);
    
    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /send/i });
    
    expect(input).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});
```

### Integration Testing

```typescript
// Full workflow test
describe('Chat Workflow Integration', () => {
  it('creates conversation and branches correctly', async () => {
    const user = userEvent.setup();
    render(<AetherDemo />);
    
    // Type message
    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello, AI!');
    
    // Send message
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);
    
    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
    });
    
    // Create branch
    const branchButton = screen.getByRole('button', { name: /branch/i });
    await user.click(branchButton);
    
    // Verify new node exists
    await waitFor(() => {
      expect(screen.getAllByTestId('chat-node')).toHaveLength(2);
    });
  });
});
```

---

## Related Documentation

- [Development Guide](./DEVELOPMENT.md) - Component development guidelines
- [Architecture Guide](./ARCHITECTURE.md) - System architecture overview
- [API Reference](./API.md) - API documentation
- [User Guide](./USER_GUIDE.md) - End-user functionality

---

<div align="center">
  <p style="font-family: 'Space Grotesk', sans-serif;">
    For component questions or suggestions, please 
    <a href="https://github.com/sbeeredd04/Aether/issues">open an issue</a> 
    on GitHub.
  </p>
</div>