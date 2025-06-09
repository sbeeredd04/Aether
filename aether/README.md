# Aether AI - Technical Implementation

This directory contains the core Next.js application for Aether AI's visual conversation interface.

## Overview

Aether AI is a Next.js-based web application that provides a visual, graph-based interface for AI conversations. The application allows users to create branching conversation trees, enabling exploration of multiple conversation paths and maintaining context across different discussion threads.

## Architecture

### Core Technologies

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Graph Visualization**: React Flow
- **AI Integration**: Google Generative AI
- **Markdown Processing**: React Markdown with syntax highlighting

### Key Components

- **CustomChatNode**: Individual conversation nodes in the graph
- **NodeSidebar**: Context panel showing conversation history
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

For contribution guidelines, see the main [Contributing Guide](../CONTRIBUTING.md).

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make changes in the `aether/` directory
4. Test thoroughly
5. Submit a pull request

## Related Documentation

- [Main README](../README.md) - Project overview
- [Contributing Guide](../CONTRIBUTING.md) - Contribution guidelines
- [Architecture Guide](../docs/ARCHITECTURE.md) - Detailed architecture
- [User Guide](../docs/USER_GUIDE.md) - Usage instructions
