# Aether AI - Chat Multiverse

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Major+Mono+Display&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet">

<div align="center">
  <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px;">
    <img src="./public/aether.svg" alt="Aether AI Logo" width="60" height="60" />
    <h1 style="font-family: 'Major Mono Display', monospace; font-size: 36px; margin: 0; color: #333;">Aether</h1>
  </div>
</div>

> **LIVE DEMO**: [aether.sriujjwalreddy.com](https://aether.sriujjwalreddy.com)
> 
> **DEVELOPER**: [Sri Ujjwal Reddy](https://github.com/sbeeredd04) | [Portfolio](https://sriujjwalreddy.com)

This directory contains the core Next.js application for Aether AI's visual conversation multiverse interface.

## Overview

Aether AI - Chat Multiverse is a Next.js-based web application that provides a visual, graph-based interface for AI conversations. The application allows users to create branching conversation trees, enabling exploration of multiple conversation paths and maintaining context across different discussion threads. Transform your AI conversations into explorable trees of thought with our revolutionary chat multiverse approach.

## QUICK START

1. **Try the Live Demo**: Visit [aether.sriujjwalreddy.com](https://aether.sriujjwalreddy.com)
2. **Local Development**: See [Installation & Setup](#installation--setup) below
3. **GitHub Repository**: [github.com/sbeeredd04/Aether](https://github.com/sbeeredd04/Aether)

## FEATURES

- **Visual Conversation Trees**: Transform linear chats into explorable graphs
- **Infinite Branching**: Create unlimited conversation branches from any point
- **Multiple AI Models**: Access Gemini 2.0 Flash, thinking models, and more
- **Rich Media Support**: Upload images, audio, and files with multimedia AI interactions
- **Web-Grounded Responses**: Get answers backed by real-time web search
- **Session Persistence**: Automatic save/restore of conversation state
- **Modern Typography**: Major Mono Display for headings, Space Grotesk for readability

## DESIGN & BRANDING

- **Logo**: Custom Aether SVG with metallic gradient design
- **Typography**: 
  - **Headings**: Major Mono Display for a modern, technical aesthetic
  - **Body Text**: Space Grotesk optimized for readability
- **Theme**: Dark mode with purple/blue accent gradients
- **UI**: Glass morphism effects with backdrop blur

## Architecture

### Core Technologies

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 with custom font integration
- **State Management**: Zustand
- **Graph Visualization**: React Flow
- **AI Integration**: Google Generative AI
- **Markdown Processing**: React Markdown with syntax highlighting
- **Fonts**: Major Mono Display & Space Grotesk via Google Fonts

### Key Components

- **CustomChatNode**: Individual conversation nodes in the graph
- **NodeSidebar**: Context panel showing conversation history (optimized with Space Grotesk)
- **PromptBar**: Input interface with model selection and settings
- **ChatStore**: Central state management for conversations

## Project Structure

```
src/
├── app/
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Landing page
│   └── workspace/         # Main application
│       └── page.tsx       # Workspace interface
├── components/
│   ├── ui/               # Reusable UI components
│   │   ├── Silk.tsx     # Background animation
│   │   └── ...
│   ├── nodes/           # Node-specific components
│   ├── CopyButton.tsx   # Copy functionality
│   ├── CustomChatNode.tsx  # Chat node component
│   ├── AetherDemo.tsx   # Demo component
│   ├── NodeSidebar.tsx  # Sidebar component
│   └── PromptBar.tsx    # Input component
├── store/
│   └── chatStore.ts     # Zustand store
├── utils/
│   └── ...              # Utility functions
└── config/
    └── ...              # Configuration files
```

## Installation & Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Google AI API key

### Environment Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment configuration**
   Create a `.env.local` file in the root directory:
   ```env
   GOOGLE_AI_API_KEY=your_gemini_api_key_here
   ```

3. **Development server**
   ```bash
   npm run dev
   ```

4. **Production build**
   ```bash
   npm run build
   npm start
   ```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## State Management

The application uses Zustand for state management with the following key features:

- **Session Persistence**: Automatic save/restore of conversation state
- **Node Management**: Create, update, and delete conversation nodes
- **Edge Management**: Handle relationships between nodes
- **Active Node Tracking**: Maintain current conversation context

### Key Store Functions

- `addMessageToNode()`: Add messages to existing nodes
- `createNodeAndEdge()`: Create new conversation branches
- `setActiveNode()`: Set the current active conversation
- `saveToSession()`: Persist state to session storage
- `loadFromSession()`: Restore state from session storage

## BRAND IDENTITY

### Logo Design
The <span style="font-family: 'Major Mono Display', monospace;">Aether</span> logo features a distinctive design with two intersecting ellipses rotated at 45° angles, rendered with a metallic gradient effect. This symbolizes the interconnected nature of conversations and the multidimensional aspect of the chat multiverse.

### Typography System
- **Primary Font (Headings)**: Major Mono Display
  - Used for all headings, branding, and emphasis text
  - Provides a modern, technical aesthetic perfect for an AI application
  - Monospace character gives a futuristic, code-like appearance
  
- **Secondary Font (Body Text)**: Space Grotesk
  - Used for all paragraph text, UI elements, and content
  - Optimized for readability and clean user interfaces
  - Provides excellent legibility at various sizes

### Color Palette
- **Primary Background**: Deep black (#000000)
- **Accent Colors**: Purple to blue gradients with transparency
- **Text Colors**: White with various opacity levels for hierarchy
- **Interactive Elements**: Glass morphism with backdrop blur effects

## API Integration

### Google Generative AI

The application integrates with Google's Generative AI API for:

- **Text Generation**: Standard conversation responses
- **Thinking Mode**: Enhanced reasoning capabilities
- **Web Grounding**: Search-enhanced responses
- **Image Generation**: Visual content creation

### Configuration

AI model configuration is handled in the store with support for:

- Multiple model selection
- Web search integration
- Thinking mode toggle
- Custom system prompts

## Development Guidelines

### Code Style

- Use TypeScript for all new components
- Follow React functional component patterns
- Implement proper error handling
- Use Tailwind CSS for styling
- Write meaningful commit messages

### Component Structure

```typescript
interface ComponentProps {
  // Define props interface
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    <div className="tailwind-classes">
      {/* Component JSX */}
    </div>
  );
};

export default Component;
```

### Testing

- Test components with user interactions
- Verify state management functionality
- Test API integration endpoints
- Validate error handling scenarios

## Deployment

### Live Website

The application is currently deployed and accessible at:
**LIVE DEMO: [aether.sriujjwalreddy.com](https://aether.sriujjwalreddy.com)**

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the application: `npm run build`
2. Deploy the `.next` folder to your hosting provider
3. Ensure environment variables are configured

## Performance Considerations

- **Session Storage**: Large conversations are compressed automatically
- **Graph Rendering**: React Flow handles node virtualization
- **State Updates**: Zustand provides efficient re-renders
- **API Calls**: Debounced user inputs prevent excessive requests

## Troubleshooting

### Common Issues

1. **API Key Errors**: Verify GOOGLE_AI_API_KEY is set correctly
2. **Build Failures**: Check TypeScript errors and dependencies
3. **Performance Issues**: Monitor session storage size
4. **Graph Layout**: Ensure React Flow dependencies are installed

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## Contributing

We welcome contributions to Aether AI - Chat Multiverse! For detailed contribution guidelines, see the main [Contributing Guide](../CONTRIBUTING.md).

### Development Workflow

1. Fork the repository from [github.com/sbeeredd04/Aether](https://github.com/sbeeredd04/Aether)
2. Create a feature branch
3. Make changes in the `aether/` directory
4. Test thoroughly
5. Submit a pull request

### Repository Information

- **GitHub**: [github.com/sbeeredd04/Aether](https://github.com/sbeeredd04/Aether)
- **Developer**: [Sri Ujjwal Reddy](https://github.com/sbeeredd04)
- **Portfolio**: [sriujjwalreddy.com](https://sriujjwalreddy.com)

## Related Documentation

- [Main README](../README.md) - Project overview
- [Contributing Guide](../CONTRIBUTING.md) - Contribution guidelines
- [Architecture Guide](../docs/ARCHITECTURE.md) - Detailed architecture
- [User Guide](../docs/USER_GUIDE.md) - Usage instructions
