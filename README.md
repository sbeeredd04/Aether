# Mutec

Mutec is a visual, graph-based chat interface that enables multi-threaded conversations with AI models. It transforms traditional linear chat experiences into an explorable tree of conversation branches.

## Overview

Mutec allows users to create branching conversations from any point in a chat history, visualizing the relationship between different conversation threads. This approach enables exploring multiple lines of thought or questions within a single workspace.

![Mutec Interface](https://placeholder-for-screenshot.png)

## Features

- **Visual Graph Interface**: Conversations displayed as connected nodes in an interactive graph
- **Branching Conversations**: Create new conversation branches from any point
- **Thread Highlighting**: Active conversation paths are visually highlighted
- **Conversation History**: View complete history of any conversation path
- **Resizable Sidebar**: Adjust the UI to your preference
- **Node Management**: Reset or delete conversation nodes

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Visualization**: React Flow
- **Styling**: Tailwind CSS
- **AI Integration**: Gemini API (with plans to add more models)

## Developer Roadmap

### Immediate Tasks

- [✓] Implement backend chat history persistence
- [✓] Fix scrollbar styling and behavior
- [✓] Improve node titles to better reflect conversation content
- [✓] Update sidebar UI to display conversation context more clearly
- [✓] Add model badges to nodes to show which AI model answered the question
- [ ] Implement markdown rendering for model outputs
- [ ] Multiple models and their support 
    - [ ] Add multiple models and their support placeholders to the prompt bar
    - [ ] document support / File upload
    - [ ] grounding with google search
    - [ ] add image generation and video generation and speech geneeration as well
    - [ ] video and sccreen sharing understanding and support / Live API


### Future Enhancements

- [ ] User authentication and profiles
- [ ] Shareable conversation graphs
- [ ] Export conversations to different formats
- [ ] Mobile-responsive design

## Project Structure

The project follows a standard Next.js structure with React components:

- `/src/components`: UI components including nodes, canvas, and sidebar
- `/src/store`: State management using Zustand
- `/src/app`: Next.js app router pages
- `/src/utils`: Utility functions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.