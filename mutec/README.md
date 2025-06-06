# Mutec - Multi-threaded Chat Exploration

Mutec is an innovative chat interface that allows users to explore multiple conversation threads in a visual, graph-based format. The application enables branching conversations, creating a tree of chat interactions that can be navigated, explored, and managed.

## Project Overview

Mutec transforms the traditional linear chat experience into a dynamic, multi-threaded conversation space. Users can:

- Create branching conversations from any point in a chat
- Visualize the relationship between different conversation threads
- Navigate between different branches of a conversation
- View the complete history of a conversation path
- Reset or delete specific conversation branches

## Key Features

- **Visual Graph Interface**: Conversations are displayed as nodes in a graph, with connections showing the relationship between different parts of the conversation.
- **Branching Conversations**: Create new conversation branches from any point in a chat.
- **Thread Highlighting**: Active conversation paths are highlighted to show the current context.
- **Conversation History**: View the complete history of any conversation path in the sidebar.
- **Node Management**: Reset or delete conversation nodes as needed.
- **Responsive Design**: Works across different screen sizes with resizable sidebar.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Developer Notes

### Upcoming Tasks

1. **Backend Integration**
   - Implement chat history persistence
   - Add user authentication
   - Create API for saving/loading conversation graphs

2. **UI Improvements**
   - Fix scrollbar styling and behavior
   - Improve node titles to better reflect conversation content
   - Enhance sidebar UI to better display conversation context
   - Increase node size for better readability

3. **Chat Functionality**
   - Add model badges to nodes to show which AI model answered the question
   - Add support for multiple AI models
   - Implement markdown rendering for model outputs
   - Add code highlighting for technical conversations

4. **Performance Optimization**
   - Optimize graph rendering for large conversation trees
   - Implement lazy loading for conversation history

### Current Limitations

- Conversations are not yet persisted between sessions
- Limited to a single AI model
- No markdown support in responses
- Fixed node size may limit content display

## Learn More

This project uses Next.js, React Flow for the graph visualization, and Tailwind CSS for styling.

- [Next.js Documentation](https://nextjs.org/docs)
- [React Flow Documentation](https://reactflow.dev/docs/introduction/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
