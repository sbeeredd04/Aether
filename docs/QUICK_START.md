# Aether AI - Quick Start Guide

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Major+Mono+Display&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet">

<div align="center">
  <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px;">
    <img src="../aether/public/aether.svg" alt="Aether AI Logo" width="50" height="50" />
    <h1 style="font-family: 'Major Mono Display', monospace; font-size: 32px; margin: 0; color: #333;">Quick Start</h1>
  </div>
</div>

Get up and running with Aether AI in just a few minutes. This guide will take you from zero to your first conversation tree.

## 🚀 Try it Now

### Option 1: Live Demo (Fastest)

Visit the live demo at **[aether.sriujjwalreddy.com](https://aether.sriujjwalreddy.com)** 

No installation required! Just:
1. Visit the link
2. Start typing your first message
3. Create branches and explore the multiverse

### Option 2: Local Development

#### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Google AI API Key** - [Get one here](https://makersuite.google.com/app/apikey)

#### 5-Minute Setup

```bash
# 1. Clone and navigate
git clone https://github.com/sbeeredd04/Aether.git
cd Aether/aether

# 2. Install dependencies (takes ~2 minutes)
npm install

# 3. Set up your API key
echo "GOOGLE_AI_API_KEY=your_api_key_here" > .env.local

# 4. Start the development server
npm run dev

# 5. Open your browser
open http://localhost:3000
```

## 🎯 Your First 5 Minutes

### Step 1: Start a Conversation
1. Type your first message in the prompt bar
2. Click **Send** or press **Enter**
3. Watch as the AI responds and creates your first node

### Step 2: Create Your First Branch
1. Click the **+** button on any AI response
2. Ask a follow-up question or explore a different angle
3. See your conversation tree grow!

### Step 3: Navigate the Multiverse
1. Click on any node to view its conversation
2. Use the sidebar to see the full conversation thread
3. Switch between different conversation paths

### Step 4: Upload a File
1. Drag and drop any file into the conversation
2. Ask the AI questions about your file
3. Watch as it analyzes and responds with context

### Step 5: Explore Advanced Features
1. Try different AI models using the model selector
2. Enable web search for research-backed responses
3. Export your conversation tree for later

## 🛠️ Quick Configuration

### Essential Environment Variables

```bash
# Required
GOOGLE_AI_API_KEY=your_gemini_api_key

# Optional (for enhanced features)
NEXT_PUBLIC_APP_NAME=Aether
NEXT_PUBLIC_APP_VERSION=0.1.0
```

### Model Selection Quick Guide

| Model | Best For | Speed | Capabilities |
|-------|----------|-------|--------------|
| **Gemini 2.0 Flash** | General chat | ⚡ Fast | Standard conversation |
| **Gemini 2.5 Flash** | Complex reasoning | 🧠 Thinking | Advanced analysis |
| **Gemini Flash Web** | Research | 🌐 Grounded | Real-time web search |

## 💡 Quick Tips

### Keyboard Shortcuts
- **Enter**: Send message
- **Shift + Enter**: New line in message
- **Escape**: Close sidebar/modals
- **Space**: Pan graph view

### Best Practices
1. **Start Broad**: Begin with general questions, then branch into specifics
2. **Use Branches**: Don't overwrite - create new branches to explore alternatives
3. **Upload Context**: Add relevant files to enhance AI understanding
4. **Save Your Work**: Accept persistent storage to keep your conversations

### Common Use Cases

#### 🔬 Research & Analysis
```
"Explain quantum computing" 
├── "How does it compare to classical computing?"
├── "What are practical applications?"
└── "What are the current limitations?"
```

#### ✍️ Creative Writing
```
"Write a story about time travel"
├── "Make it more sci-fi focused"
├── "Add a romantic subplot"
└── "Create a darker, dystopian version"
```

#### 🧮 Problem Solving
```
"Help me plan a mobile app"
├── "Focus on user interface design"
├── "Discuss backend architecture"
└── "Explore monetization strategies"
```

## 🔧 Troubleshooting

### Common Issues

**❌ "API key not working"**
- Check your `.env.local` file exists in the `aether/` directory
- Verify your API key is valid at [Google AI Studio](https://makersuite.google.com/)
- Make sure the key starts with `AIza`

**❌ "Build errors"**
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version with `node --version` (needs 18+)
- Try deleting `node_modules` and `package-lock.json`, then `npm install`

**❌ "Slow performance"**
- Clear browser storage if you have large conversation trees
- Try reducing the number of open conversation branches
- Check your internet connection for API calls

**❌ "Conversations not saving"**
- Accept persistent storage when prompted
- Check browser storage permissions
- Export important conversations as backup

### Getting Help

- 📖 **Documentation**: [Full docs](./README.md)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/sbeeredd04/Aether/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/sbeeredd04/Aether/discussions)
- 📧 **Email**: [sricodespace@gmail.com](mailto:sricodespace@gmail.com)

## 🎨 Customization

### Theme & Appearance
Aether uses a carefully crafted design system:
- **Dark Mode**: Optimized for extended use
- **Typography**: Major Mono Display (headings) + Space Grotesk (body)
- **Colors**: Purple/blue gradients with high contrast
- **Animations**: Smooth transitions and silk-like background effects

### Storage Options
- **Session Storage**: Temporary (clears on browser close)
- **Persistent Storage**: Permanent with user consent
- **Export/Import**: JSON-based workspace backups

## 📚 Next Steps

Once you're comfortable with the basics:

1. **Read the [User Guide](./USER_GUIDE.md)** for comprehensive usage instructions
2. **Explore [Features](./FEATURES.md)** to discover advanced capabilities
3. **Check the [Architecture Guide](./ARCHITECTURE.md)** if you're interested in technical details
4. **Contribute** by reading our [Contributing Guide](../CONTRIBUTING.md)

## 🌟 Pro Tips

### Advanced Workflows
1. **Document Analysis**: Upload PDFs, then create branches for different analysis angles
2. **Research Trees**: Start with a topic, branch into subtopics, then dive deep
3. **Creative Exploration**: Use branches to explore "what if" scenarios
4. **Learning Paths**: Create structured learning trees for complex subjects

### Productivity Hacks
- Use web search for fact-checking and current information
- Upload relevant documents before asking questions for better context
- Create multiple branches to compare different AI model responses
- Export important conversations before major changes

---

<div align="center">
  <p style="font-family: 'Space Grotesk', sans-serif;">
    Ready to explore the multiverse? 
    <br>
    <a href="https://aether.sriujjwalreddy.com">Start your journey now!</a>
  </p>
</div>