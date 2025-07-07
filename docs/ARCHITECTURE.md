# Aether AI - Technical Architecture Guide

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Major+Mono+Display&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet">

<div align="center">
  <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px;">
    <img src="../aether/public/aether.svg" alt="Aether AI Logo" width="50" height="50" />
    <h1 style="font-family: 'Major Mono Display', monospace; font-size: 32px; margin: 0; color: #333;">Architecture Guide</h1>
  </div>
</div>

This document provides a comprehensive technical overview of the Aether AI Chat Multiverse architecture, covering system design, component relationships, data flows, and infrastructure patterns.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Principles](#architecture-principles)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Storage Architecture](#storage-architecture)
- [AI Pipeline Architecture](#ai-pipeline-architecture)
- [Security Architecture](#security-architecture)
- [Performance Architecture](#performance-architecture)
- [Deployment Architecture](#deployment-architecture)

## System Overview

Aether AI is a modern web application built on Next.js that transforms traditional linear AI conversations into visual, explorable conversation trees. The system enables users to branch conversations at any point, creating a multiverse of dialogue possibilities while maintaining full context and state persistence.

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js Frontend]
        Browser[Browser APIs]
        Storage[Local Storage]
    end
    
    subgraph "Application Layer"
        Router[App Router]
        Components[React Components]
        Store[Zustand Store]
        Utils[Utility Layer]
    end
    
    subgraph "External Services"
        Gemini[Google Gemini AI]
        WebSearch[Web Grounding]
        CDN[Asset CDN]
    end
    
    subgraph "Infrastructure"
        Vercel[Vercel Platform]
        Edge[Edge Functions]
        Analytics[Performance Analytics]
    end
    
    UI --> Router
    Router --> Components
    Components --> Store
    Store --> Utils
    Utils --> Gemini
    Utils --> WebSearch
    Browser --> Storage
    Vercel --> Edge
    Edge --> Analytics
    CDN --> UI
    
    style UI fill:#1a1a1a,stroke:#8b5cf6,color:#ffffff
    style Gemini fill:#4285f4,stroke:#ffffff,color:#ffffff
    style Store fill:#10b981,stroke:#ffffff,color:#ffffff
    style Vercel fill:#000000,stroke:#ffffff,color:#ffffff
```

## Architecture Principles

### 1. **Client-First Architecture**
- All processing happens in the browser
- No server-side state management
- Privacy-preserving local storage
- Offline-capable design patterns

### 2. **Component-Driven Design**
- Modular, reusable React components
- Clear separation of concerns
- TypeScript for type safety
- Functional programming patterns

### 3. **Graph-Based Data Model**
- Conversations as directed acyclic graphs (DAGs)
- Nodes represent conversation states
- Edges represent conversation flow
- Immutable state updates

### 4. **Progressive Enhancement**
- Core functionality without JavaScript
- Enhanced features with full interactivity
- Graceful degradation patterns
- Mobile-first responsive design

## Tech Stack

### Frontend Technologies

```mermaid
graph LR
    subgraph "Core Framework"
        NextJS[Next.js 15]
        React[React 19]
        TS[TypeScript]
    end
    
    subgraph "State Management"
        Zustand[Zustand Store]
        ReactFlow[React Flow]
        Storage[Browser Storage]
    end
    
    subgraph "Styling & UI"
        Tailwind[Tailwind CSS 4]
        Fonts[Google Fonts]
        Framer[Framer Motion]
        GSAP[GSAP Animations]
    end
    
    subgraph "Content Processing"
        Markdown[React Markdown]
        Syntax[Syntax Highlighting]
        Math[KaTeX Math]
        Icons[Lucide React]
    end
    
    NextJS --> React
    React --> TS
    Zustand --> ReactFlow
    ReactFlow --> Storage
    Tailwind --> Fonts
    Fonts --> Framer
    Framer --> GSAP
    Markdown --> Syntax
    Syntax --> Math
    Math --> Icons
    
    style NextJS fill:#000000,stroke:#ffffff,color:#ffffff
    style React fill:#61dafb,stroke:#000000,color:#000000
    style Zustand fill:#ff6b35,stroke:#ffffff,color:#ffffff
    style Tailwind fill:#06b6d4,stroke:#ffffff,color:#ffffff
```

### Development Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Runtime** | Node.js | 18+ | Development environment |
| **Package Manager** | npm | Latest | Dependency management |
| **Framework** | Next.js | 15.3.3 | React framework with SSR |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Build Tool** | Next.js Build | Built-in | Production optimization |
| **Linting** | ESLint | Built-in | Code quality enforcement |

### AI & External Services

| Service | Provider | Purpose | Integration |
|---------|----------|---------|-------------|
| **AI Models** | Google Gemini | Text generation, reasoning | REST API |
| **Web Search** | Google Search | Grounded responses | Gemini Grounding |
| **Image Generation** | Gemini Flash | Visual content creation | API calls |
| **Font Delivery** | Google Fonts | Typography | CDN |
| **Hosting** | Vercel | Deployment platform | Git integration |

## System Architecture

The system follows a layered architecture pattern with clear separation between presentation, business logic, and data layers:

```mermaid
graph TD
    subgraph "Presentation Layer"
        LandingPage[Landing Page]
        WorkspaceUI[Workspace Interface]
        GraphView[Graph Visualization]
        Sidebar[Context Sidebar]
    end
    
    subgraph "Business Logic Layer"
        ChatStore[Chat Store Manager]
        NodeManager[Node Management]
        EdgeManager[Edge Management]
        AIManager[AI Integration Manager]
    end
    
    subgraph "Service Layer"
        GeminiService[Gemini AI Service]
        StorageService[Storage Service]
        WorkspaceService[Workspace Service]
        UtilServices[Utility Services]
    end
    
    subgraph "Data Layer"
        SessionStorage[Session Storage]
        LocalStorage[Local Storage]
        BrowserAPIs[Browser APIs]
        ExternalAPIs[External APIs]
    end
    
    LandingPage --> ChatStore
    WorkspaceUI --> ChatStore
    GraphView --> NodeManager
    Sidebar --> EdgeManager
    
    ChatStore --> GeminiService
    NodeManager --> StorageService
    EdgeManager --> WorkspaceService
    AIManager --> UtilServices
    
    GeminiService --> ExternalAPIs
    StorageService --> SessionStorage
    StorageService --> LocalStorage
    WorkspaceService --> BrowserAPIs
    
    style ChatStore fill:#8b5cf6,stroke:#ffffff,color:#ffffff
    style GeminiService fill:#4285f4,stroke:#ffffff,color:#ffffff
    style StorageService fill:#10b981,stroke:#ffffff,color:#ffffff
```

## Component Architecture

The application is built using a component hierarchy that promotes reusability and maintainability:

```mermaid
graph TD
    subgraph "App Shell"
        RootLayout[Root Layout]
        GlobalStyles[Global Styles]
        FontLoader[Font Loader]
    end
    
    subgraph "Pages"
        LandingPage[Landing Page]
        WorkspacePage[Workspace Page]
    end
    
    subgraph "Core Components"
        AetherDemo[Aether Demo]
        CustomChatNode[Custom Chat Node]
        NodeSidebar[Node Sidebar]
        PromptBar[Prompt Bar]
    end
    
    subgraph "UI Components"
        SilkBackground[Silk Background]
        CopyButton[Copy Button]
        ModelInfoModal[Model Info Modal]
        SettingsPanel[Settings Panel]
        ImageModal[Image Modal]
        VoiceInputModal[Voice Input Modal]
    end
    
    subgraph "Utility Components"
        MarkdownRenderer[Markdown Renderer]
        SyntaxHighlighter[Syntax Highlighter]
        IconLibrary[Icon Library]
    end
    
    RootLayout --> LandingPage
    RootLayout --> WorkspacePage
    WorkspacePage --> AetherDemo
    AetherDemo --> CustomChatNode
    AetherDemo --> NodeSidebar
    AetherDemo --> PromptBar
    
    CustomChatNode --> CopyButton
    CustomChatNode --> MarkdownRenderer
    NodeSidebar --> SyntaxHighlighter
    PromptBar --> ModelInfoModal
    PromptBar --> SettingsPanel
    PromptBar --> ImageModal
    PromptBar --> VoiceInputModal
    
    MarkdownRenderer --> IconLibrary
    SilkBackground --> WorkspacePage
    
    style CustomChatNode fill:#8b5cf6,stroke:#ffffff,color:#ffffff
    style PromptBar fill:#10b981,stroke:#ffffff,color:#ffffff
    style NodeSidebar fill:#f59e0b,stroke:#ffffff,color:#ffffff
```

### Component Responsibilities

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **CustomChatNode** | Individual conversation nodes | Message display, branching, actions |
| **NodeSidebar** | Context and history panel | Thread view, document context, navigation |
| **PromptBar** | User input interface | Model selection, file upload, settings |
| **AetherDemo** | Main workspace orchestrator | Graph management, node coordination |
| **SettingsPanel** | Configuration interface | Model settings, preferences, export |

## Data Flow

The application implements unidirectional data flow with reactive state updates:

```mermaid
graph TD
    subgraph "User Interactions"
        UserInput[User Input]
        NodeClick[Node Selection]
        BranchCreate[Branch Creation]
        FileUpload[File Upload]
    end
    
    subgraph "State Management"
        ZustandStore[Zustand Store]
        NodeState[Node State]
        EdgeState[Edge State]
        UIState[UI State]
    end
    
    subgraph "Side Effects"
        AICall[AI API Call]
        Storage[Storage Update]
        GraphUpdate[Graph Update]
        UIUpdate[UI Update]
    end
    
    subgraph "External Systems"
        GeminiAPI[Gemini API]
        BrowserStorage[Browser Storage]
        WebSearch[Web Search]
    end
    
    UserInput --> ZustandStore
    NodeClick --> ZustandStore
    BranchCreate --> ZustandStore
    FileUpload --> ZustandStore
    
    ZustandStore --> NodeState
    ZustandStore --> EdgeState
    ZustandStore --> UIState
    
    NodeState --> AICall
    EdgeState --> Storage
    UIState --> GraphUpdate
    UIState --> UIUpdate
    
    AICall --> GeminiAPI
    Storage --> BrowserStorage
    AICall --> WebSearch
    
    GeminiAPI --> ZustandStore
    BrowserStorage --> ZustandStore
    WebSearch --> ZustandStore
    
    style ZustandStore fill:#ff6b35,stroke:#ffffff,color:#ffffff
    style GeminiAPI fill:#4285f4,stroke:#ffffff,color:#ffffff
    style BrowserStorage fill:#10b981,stroke:#ffffff,color:#ffffff
```

### Data Flow Patterns

1. **User Action → Store Update → Side Effect → Store Update**
2. **API Response → Store Update → UI Re-render**
3. **Storage Change → Store Hydration → UI Sync**
4. **Graph Manipulation → Store Update → Persistence**

## Storage Architecture

The application implements a sophisticated storage system with user consent and automatic persistence:

```mermaid
graph TD
    subgraph "Storage Decision Layer"
        UserConsent{User Consent?}
        StorageType[Storage Type Selection]
    end
    
    subgraph "Persistent Storage Path"
        LocalStorage[localStorage]
        PersistentManager[Persistent Storage Manager]
        Compression[Data Compression]
        Validation[Data Validation]
    end
    
    subgraph "Session Storage Path"
        SessionStorage[sessionStorage]
        SessionManager[Session Manager]
        Cleanup[Automatic Cleanup]
    end
    
    subgraph "Data Operations"
        Save[Save Operation]
        Load[Load Operation]
        Export[Export Functionality]
        Import[Import Functionality]
    end
    
    subgraph "Data Types"
        Nodes[Conversation Nodes]
        Edges[Graph Edges]
        Settings[User Settings]
        Attachments[File Attachments]
    end
    
    StorageType --> UserConsent
    UserConsent -->|Yes| LocalStorage
    UserConsent -->|No| SessionStorage
    
    LocalStorage --> PersistentManager
    PersistentManager --> Compression
    Compression --> Validation
    
    SessionStorage --> SessionManager
    SessionManager --> Cleanup
    
    Validation --> Save
    Cleanup --> Save
    Save --> Nodes
    Save --> Edges
    Save --> Settings
    Save --> Attachments
    
    Load --> Export
    Load --> Import
    
    style UserConsent fill:#8b5cf6,stroke:#ffffff,color:#ffffff
    style PersistentManager fill:#10b981,stroke:#ffffff,color:#ffffff
    style Compression fill:#f59e0b,stroke:#ffffff,color:#ffffff
```

### Storage Features

- **Consent-Based Persistence**: User explicitly opts into persistent storage
- **Automatic Compression**: Large datasets compressed automatically
- **Data Validation**: Integrity checks on load/save operations
- **Export/Import**: Full workspace backup and restore capabilities
- **Quota Management**: Storage limit monitoring and cleanup
- **Migration Support**: Backward compatibility with version updates

## AI Pipeline Architecture

The AI integration follows a pipeline pattern for different model types and capabilities:

```mermaid
graph TD
    subgraph "Input Processing"
        UserPrompt[User Prompt]
        FileProcessing[File Processing]
        ContextGathering[Context Gathering]
        ModelSelection[Model Selection]
    end
    
    subgraph "Pipeline Router"
        PipelineDecision{Pipeline Type}
        StandardPipeline[Standard Pipeline]
        ThinkingPipeline[Thinking Pipeline]
        GroundingPipeline[Grounding Pipeline]
        MultimediaPipeline[Multimedia Pipeline]
    end
    
    subgraph "API Integration"
        GeminiClient[Gemini Client]
        RequestFormatter[Request Formatter]
        ResponseHandler[Response Handler]
        ErrorHandler[Error Handler]
    end
    
    subgraph "Output Processing"
        ContentParsing[Content Parsing]
        MetadataExtraction[Metadata Extraction]
        CitationProcessing[Citation Processing]
        MarkdownRendering[Markdown Rendering]
    end
    
    UserPrompt --> ModelSelection
    FileProcessing --> ModelSelection
    ContextGathering --> ModelSelection
    ModelSelection --> PipelineDecision
    
    PipelineDecision --> StandardPipeline
    PipelineDecision --> ThinkingPipeline
    PipelineDecision --> GroundingPipeline
    PipelineDecision --> MultimediaPipeline
    
    StandardPipeline --> GeminiClient
    ThinkingPipeline --> GeminiClient
    GroundingPipeline --> GeminiClient
    MultimediaPipeline --> GeminiClient
    
    GeminiClient --> RequestFormatter
    RequestFormatter --> ResponseHandler
    ResponseHandler --> ErrorHandler
    
    ErrorHandler --> ContentParsing
    ContentParsing --> MetadataExtraction
    MetadataExtraction --> CitationProcessing
    CitationProcessing --> MarkdownRendering
    
    style PipelineDecision fill:#8b5cf6,stroke:#ffffff,color:#ffffff
    style GeminiClient fill:#4285f4,stroke:#ffffff,color:#ffffff
    style ThinkingPipeline fill:#10b981,stroke:#ffffff,color:#ffffff
```

### AI Model Types

| Model Type | Features | Use Cases |
|------------|----------|-----------|
| **Gemini 2.5 Flash** | Fast responses, thinking mode | General conversation, reasoning |
| **Gemini Flash Web** | Web grounding, citations | Research, fact-checking |
| **Multimedia Models** | Image/audio processing | Media analysis, generation |
| **Thinking Models** | Step-by-step reasoning | Complex problem solving |

## Security Architecture

Security is implemented through multiple layers of protection:

```mermaid
graph TD
    subgraph "Client Security"
        CSP[Content Security Policy]
        HTTPS[HTTPS Encryption]
        LocalOnly[Local-Only Processing]
    end
    
    subgraph "Data Security"
        NoServerState[No Server State]
        LocalStorage[Encrypted Local Storage]
        APIKeyProtection[API Key Protection]
    end
    
    subgraph "API Security"
        RateLimiting[Rate Limiting]
        InputValidation[Input Validation]
        OutputSanitization[Output Sanitization]
    end
    
    subgraph "Privacy Protection"
        NoTelemetry[No User Tracking]
        ConsentBased[Consent-Based Storage]
        DataMinimization[Data Minimization]
    end
    
    CSP --> LocalOnly
    HTTPS --> NoServerState
    LocalOnly --> LocalStorage
    NoServerState --> APIKeyProtection
    
    APIKeyProtection --> RateLimiting
    LocalStorage --> InputValidation
    RateLimiting --> OutputSanitization
    
    InputValidation --> NoTelemetry
    OutputSanitization --> ConsentBased
    NoTelemetry --> DataMinimization
    
    style LocalOnly fill:#10b981,stroke:#ffffff,color:#ffffff
    style NoServerState fill:#8b5cf6,stroke:#ffffff,color:#ffffff
    style ConsentBased fill:#f59e0b,stroke:#ffffff,color:#ffffff
```

## Performance Architecture

Performance optimization is achieved through multiple strategies:

```mermaid
graph LR
    subgraph "Frontend Optimization"
        CodeSplitting[Code Splitting]
        LazyLoading[Lazy Loading]
        TreeShaking[Tree Shaking]
        Compression[Asset Compression]
    end
    
    subgraph "Runtime Optimization"
        VirtualizationRF[React Flow Virtualization]
        StateOptimization[Zustand Optimization]
        MemoryManagement[Memory Management]
        DebounceThrottling[Debounce/Throttling]
    end
    
    subgraph "Network Optimization"
        CDNDelivery[CDN Delivery]
        EdgeFunctions[Edge Functions]
        RequestBatching[Request Batching]
        CachingStrategy[Caching Strategy]
    end
    
    subgraph "Storage Optimization"
        DataCompression[Data Compression]
        SessionOptimization[Session Optimization]
        QuotaManagement[Quota Management]
        CleanupStrategy[Cleanup Strategy]
    end
    
    CodeSplitting --> VirtualizationRF
    LazyLoading --> StateOptimization
    TreeShaking --> MemoryManagement
    Compression --> DebounceThrottling
    
    VirtualizationRF --> CDNDelivery
    StateOptimization --> EdgeFunctions
    MemoryManagement --> RequestBatching
    DebounceThrottling --> CachingStrategy
    
    CDNDelivery --> DataCompression
    EdgeFunctions --> SessionOptimization
    RequestBatching --> QuotaManagement
    CachingStrategy --> CleanupStrategy
    
    style VirtualizationRF fill:#8b5cf6,stroke:#ffffff,color:#ffffff
    style StateOptimization fill:#10b981,stroke:#ffffff,color:#ffffff
    style DataCompression fill:#f59e0b,stroke:#ffffff,color:#ffffff
```

## Deployment Architecture

The application is deployed using a modern, serverless architecture:

```mermaid
graph TD
    subgraph "Development"
        LocalDev[Local Development]
        GitRepo[Git Repository]
        CIPipeline[CI Pipeline]
    end
    
    subgraph "Build Process"
        NextBuild[Next.js Build]
        TypeCheck[TypeScript Check]
        Linting[ESLint Check]
        Optimization[Asset Optimization]
    end
    
    subgraph "Vercel Platform"
        EdgeNetwork[Edge Network]
        StaticAssets[Static Assets]
        ServerlessAPI[Serverless Functions]
        Analytics[Web Analytics]
    end
    
    subgraph "External Dependencies"
        GoogleFonts[Google Fonts CDN]
        GeminiAPI[Gemini API]
        DomainDNS[Custom Domain DNS]
    end
    
    LocalDev --> GitRepo
    GitRepo --> CIPipeline
    CIPipeline --> NextBuild
    
    NextBuild --> TypeCheck
    TypeCheck --> Linting
    Linting --> Optimization
    
    Optimization --> EdgeNetwork
    EdgeNetwork --> StaticAssets
    StaticAssets --> ServerlessAPI
    ServerlessAPI --> Analytics
    
    StaticAssets --> GoogleFonts
    ServerlessAPI --> GeminiAPI
    EdgeNetwork --> DomainDNS
    
    style EdgeNetwork fill:#000000,stroke:#ffffff,color:#ffffff
    style GeminiAPI fill:#4285f4,stroke:#ffffff,color:#ffffff
    style NextBuild fill:#8b5cf6,stroke:#ffffff,color:#ffffff
```

### Deployment Features

- **Automatic Deployment**: Git push triggers build and deployment
- **Edge Distribution**: Global CDN for optimal performance
- **Zero-Downtime Deployment**: Blue-green deployment strategy
- **Environment Management**: Separate staging and production environments
- **Custom Domain**: SSL-enabled custom domain configuration
- **Performance Monitoring**: Real-time analytics and monitoring

---

## Related Documentation

- [Development Guide](./DEVELOPMENT.md) - Developer setup and workflow
- [Component Reference](./COMPONENTS.md) - Component API documentation  
- [API Reference](./API.md) - External API integration guide
- [User Guide](./USER_GUIDE.md) - End-user documentation
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment guide

---

<div align="center">
  <p style="font-family: 'Space Grotesk', sans-serif;">
    For technical questions about the architecture, please 
    <a href="https://github.com/sbeeredd04/Aether/issues">open an issue</a> 
    or contact the development team.
  </p>
</div>