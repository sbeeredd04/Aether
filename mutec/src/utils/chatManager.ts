import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../store/chatStore";
import logger from './logger';

export interface ChatThread {
  id: string;
  history: ChatMessage[];
  chat: any; // GoogleGenAI chat instance
  isLoading?: boolean;
}

export class ChatManager {
  private threads: Map<string, ChatThread> = new Map();
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google Gemini API key is required.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  // Create a new chat thread with history from root to the target node
  createThread(nodeId: string, history: ChatMessage[]) {
    if (this.threads.has(nodeId)) {
      return this.threads.get(nodeId)!;
    }

    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    const chat = this.ai.chats.create({
      model: 'gemini-2.0-flash',
      history: formattedHistory,
    });

    const thread: ChatThread = {
      id: nodeId,
      history,
      chat,
      isLoading: false
    };

    this.threads.set(nodeId, thread);
    return thread;
  }

  // Get an existing thread or create a new one
  getThread(nodeId: string, history: ChatMessage[]) {
    return this.threads.get(nodeId) || this.createThread(nodeId, history);
  }

  // Send a message to a specific thread
  async sendMessage(nodeId: string, message: string) {
    const thread = this.threads.get(nodeId);
    if (!thread) {
      throw new Error(`No chat thread found for node ${nodeId}`);
    }

    try {
      thread.isLoading = true;
      const result = await thread.chat.sendMessage({ message });
      const response = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Update thread history
      thread.history.push(
        { role: 'user', content: message },
        { role: 'model', content: response }
      );

      return response;
    } catch (error) {
      logger.error('Error sending message to Gemini API', { error });
      if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
          throw new Error('The provided Google Gemini API key is not valid. Please check and try again.');
        }
        if (error.message.includes('request had content')) {
          throw new Error('The request was blocked due to safety settings. Please modify your prompt.');
        }
      }
      throw new Error('An unexpected error occurred with the Gemini API.');
    } finally {
      thread.isLoading = false;
    }
  }

  // Delete a thread
  deleteThread(nodeId: string) {
    this.threads.delete(nodeId);
  }

  // Clear all threads
  clearThreads() {
    this.threads.clear();
  }

  // Generate a title for a conversation node
  async generateTitle(messages: ChatMessage[]): Promise<string> {
    try {
      const modelName = 'gemini-1.5-flash';

      const formattedHistory = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      // Create a prompt that asks for a concise title
      const prompt = `Based on the following conversation, provide a concise title (maximum 5 words) that captures the main topic. Only return the title, without any additional text or quotation marks.

Conversation:
${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;
      
      const chat = this.ai.chats.create({
        model: modelName,
        history: formattedHistory,
      });

      const result = await chat.sendMessage({ message: prompt });
      const response = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Clean up the response and ensure it's not too long
      const title = response.trim().replace(/^["']|["']$/g, '');
      return title.length > 30 ? title.substring(0, 27) + '...' : title;
    } catch (error) {
      logger.error('Error generating title with Gemini API', { error });
      // Fallback to a simple title if generation fails
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        return lastMessage.content.substring(0, 30) + (lastMessage.content.length > 30 ? '...' : '');
      }
      return 'New Chat';
    }
  }
} 