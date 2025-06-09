# Aether AI - Visual Conversation Trees

<div align="center">
  <img src="./assets/logo.png" alt="Aether AI Logo" width="120" height="120" />
  
  [![GitHub stars](https://img.shields.io/github/stars/sbeeredd04/Aether?style=for-the-badge)](https://github.com/sbeeredd04/Aether/stargazers)
  [![GitHub license](https://img.shields.io/github/license/sbeeredd04/Aether?style=for-the-badge)](https://github.com/sbeeredd04/Aether/blob/main/LICENSE)
  [![GitHub issues](https://img.shields.io/github/issues/sbeeredd04/Aether?style=for-the-badge)](https://github.com/sbeeredd04/Aether/issues)
  [![GitHub contributors](https://img.shields.io/github/contributors/sbeeredd04/Aether?style=for-the-badge)](https://github.com/sbeeredd04/Aether/graphs/contributors)

  **Transform your AI conversations into explorable trees of thought**
  
  [Try Demo](https://aether-ai.vercel.app) • [Documentation](./docs/README.md) • [Report Bug](https://github.com/sbeeredd04/Aether/issues) • [Feature Request](https://github.com/sbeeredd04/Aether/issues)
</div>

---

## Table of Contents

- [About](#about)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)
- [Support](#support)

---

## About

Aether AI revolutionizes how you interact with artificial intelligence by transforming linear conversations into visual, explorable trees. Instead of losing context in long chat threads, you can:

- **Branch conversations** from any point to explore different ideas
- **Navigate visually** through your conversation history
- **Compare responses** from multiple AI models side-by-side
- **Never lose context** with persistent conversation trees

![Aether AI Demo](./assets/demo.gif)

## Key Features

### Visual Conversation Trees
Transform linear chats into explorable graphs. Every conversation becomes a visual journey you can navigate and explore.

### Multiple AI Models
- Gemini 2.0 Flash
- Thinking models
- Image generation capabilities
- Web-grounded responses

### Infinite Branching
Create unlimited conversation branches from any point. Explore different answers without losing your original thread.

### Rich Media Support
- Upload images, audio, and files
- Generate images directly in conversations
- Full multimedia AI interactions

### Web-Grounded Responses
Get answers backed by real-time web search. Perfect for research, fact-checking, and current events.

### Developer Friendly
- Full markdown support
- Code syntax highlighting
- Copy functionality
- Session persistence

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Google AI API key (for Gemini models)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sbeeredd04/Aether.git
   cd Aether/aether
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your API keys to `.env.local`:
   ```env
   GOOGLE_AI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Basic Usage

1. **Start a conversation**: Type your question or prompt in the input field
2. **Create branches**: Click the "+" button on any node to create a new branch
3. **Navigate**: Use the visual tree to navigate between different conversation paths
4. **View context**: Check the sidebar for full conversation history

### Advanced Features

- **Model Selection**: Choose different AI models for different types of responses
- **Image Upload**: Drag and drop images for visual analysis
- **Web Search**: Toggle web grounding for real-time information
- **Export**: Save your conversation trees for future reference

For detailed usage instructions, see our [User Guide](./docs/USER_GUIDE.md).

## Architecture

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Visualization**: React Flow
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **AI Integration**: Google Generative AI
- **Markdown**: React Markdown with syntax highlighting

### Project Structure

```
aether/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── page.tsx        # Landing page
│   │   └── workspace/      # Main application
│   ├── components/         # React components
│   │   ├── ui/            # UI components
│   │   ├── nodes/         # Node components
│   │   └── ...
│   ├── store/             # Zustand state management
│   ├── utils/             # Utility functions
│   └── config/            # Configuration files
├── public/                # Static assets
├── docs/                 # Documentation
└── ...
```

For detailed architecture information, see our [Architecture Guide](./docs/ARCHITECTURE.md).

## Contributing

We welcome contributions from the community! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting pull requests.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- We use TypeScript for type safety
- Follow the existing code style and conventions
- Use meaningful commit messages
- Write tests for new features

See our [Development Guide](./docs/DEVELOPMENT.md) for detailed information.

## Roadmap

### Current Version (v0.1.0)
- ✅ Visual conversation trees
- ✅ Multiple AI models
- ✅ Web-grounded responses
- ✅ Image generation
- ✅ Rich markdown support

### Upcoming Features
- [ ] Real-time collaboration
- [ ] Voice conversations
- [ ] Mobile app
- [ ] Plugin system
- [ ] Advanced export options
- [ ] Team workspaces

See our [detailed roadmap](./docs/ROADMAP.md) for more information.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- Thanks to the React Flow team for the amazing graph visualization library
- Google for the Gemini AI API
- All our contributors and the open source community

## Support

- [Documentation](./docs/README.md)
- [Report Issues](https://github.com/sbeeredd04/Aether/issues)
- [Discussions](https://github.com/sbeeredd04/Aether/discussions)
- [Email Support](mailto:sricodespace@gmail.com)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=sbeeredd04/Aether&type=Date)](https://star-history.com/#sbeeredd04/Aether&Date)

---

<div align="center">
  Made with ❤️ by the Aether AI team
  
  [Website](https://aether-ai.vercel.app) • [GitHub](https://github.com/sbeeredd04/Aether)
</div>