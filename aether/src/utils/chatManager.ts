import { GoogleGenAI } from "@google/genai";
import { ChatMessage, AttachmentData } from "../store/chatStore";
import logger from './logger';

export interface ChatThread {
  id: string;
  history: ChatMessage[];
  documentContext: AttachmentData[]; // Track documents available in this thread
  chat: any; // GoogleGenAI chat instance
  isLoading?: boolean;
  parentThreadId?: string; // Track parent for inheritance
  inheritedDocuments?: AttachmentData[]; // Documents inherited from parent threads
}

export class ChatManager {
  private threads: Map<string, ChatThread> = new Map();
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google Gemini API key is required.');
    }
    this.ai = new GoogleGenAI({ apiKey });
    logger.info('ChatManager: Initialized with document support');
  }

  // Extract documents from message history
  private extractDocumentsFromHistory(history: ChatMessage[]): AttachmentData[] {
    const documents: AttachmentData[] = [];
    const seenDocuments = new Set<string>(); // Track by name+type to avoid duplicates
    
    history.forEach((msg, msgIndex) => {
      if (msg.attachments) {
        msg.attachments.forEach((att, attIndex) => {
          // Only include document types (not images/audio for now)
          const isDocument = att.type === 'application/pdf' || 
                            att.type.startsWith('text/') || 
                            att.type.includes('javascript') || 
                            att.type.includes('python');
          
          if (isDocument) {
            const docKey = `${att.name}:${att.type}:${att.data.substring(0, 50)}`;
            if (!seenDocuments.has(docKey)) {
              seenDocuments.add(docKey);
              documents.push({
                name: att.name,
                type: att.type,
                data: att.data,
                previewUrl: att.previewUrl || ''
              });
              
              logger.debug('ChatManager: Document extracted from history', {
                messageIndex: msgIndex,
                attachmentIndex: attIndex,
                fileName: att.name,
                fileType: att.type,
                dataLength: att.data.length
              });
            }
          }
        });
      }
    });
    
    logger.info('ChatManager: Documents extracted from history', {
      totalDocuments: documents.length,
      documentTypes: documents.map(d => d.type),
      documentNames: documents.map(d => d.name)
    });
    
    return documents;
  }

  // Get inherited documents from parent threads
  private getInheritedDocuments(nodeId: string): AttachmentData[] {
    const inheritedDocs: AttachmentData[] = [];
    const seenDocuments = new Set<string>();
    
    // Find all parent threads and collect their documents
    for (const [threadId, thread] of this.threads) {
      if (threadId !== nodeId && thread.documentContext) {
        thread.documentContext.forEach(doc => {
          const docKey = `${doc.name}:${doc.type}`;
          if (!seenDocuments.has(docKey)) {
            seenDocuments.add(docKey);
            inheritedDocs.push(doc);
            
            logger.debug('ChatManager: Document inherited from thread', {
              sourceThreadId: threadId,
              targetNodeId: nodeId,
              fileName: doc.name,
              fileType: doc.type
            });
          }
        });
      }
    }
    
    logger.info('ChatManager: Documents inherited', {
      nodeId,
      inheritedCount: inheritedDocs.length,
      documentNames: inheritedDocs.map(d => d.name)
    });
    
    return inheritedDocs;
  }

  // Create a new chat thread with full document context
  createThread(nodeId: string, history: ChatMessage[], parentThreadId?: string) {
    if (this.threads.has(nodeId)) {
      const existingThread = this.threads.get(nodeId)!;
      logger.debug('ChatManager: Thread already exists', { 
        nodeId, 
        hasDocuments: existingThread.documentContext.length > 0 
      });
      return existingThread;
    }

    logger.info('ChatManager: Creating new thread with document support', { 
      nodeId, 
      historyLength: history.length,
      parentThreadId
    });

    // Extract documents from current history
    const currentDocuments = this.extractDocumentsFromHistory(history);
    
    // Get inherited documents from parent if specified
    let inheritedDocuments: AttachmentData[] = [];
    if (parentThreadId && this.threads.has(parentThreadId)) {
      const parentThread = this.threads.get(parentThreadId)!;
      inheritedDocuments = [...parentThread.documentContext, ...(parentThread.inheritedDocuments || [])];
      
      logger.info('ChatManager: Inheriting documents from parent thread', {
        nodeId,
        parentThreadId,
        inheritedCount: inheritedDocuments.length,
        currentCount: currentDocuments.length
      });
    }
    
    // Combine current and inherited documents, avoiding duplicates
    const allDocuments = [...currentDocuments];
    const seenDocuments = new Set(currentDocuments.map(d => `${d.name}:${d.type}`));
    
    inheritedDocuments.forEach(doc => {
      const docKey = `${doc.name}:${doc.type}`;
      if (!seenDocuments.has(docKey)) {
        allDocuments.push(doc);
        seenDocuments.add(docKey);
      }
    });

    // Format history for Gemini API - include document context in the conversation
    const formattedHistory = history.map((msg, index) => {
      const parts: any[] = [{ text: msg.content }];
      
      // Add attachments as inline data
      if (msg.attachments) {
        msg.attachments.forEach(att => {
          let cleanData = att.data;
          if (att.data.includes(',')) {
            cleanData = att.data.split(',')[1];
          }
          
          parts.unshift({
            inlineData: {
              mimeType: att.type,
              data: cleanData,
            }
          });
          
          logger.debug('ChatManager: Added attachment to history part', {
            messageIndex: index,
            fileName: att.name,
            mimeType: att.type,
            dataLength: cleanData.length
          });
        });
      }
      
      return {
        role: msg.role,
        parts
      };
    });

    // Create the chat instance with complete history
    const chat = this.ai.chats.create({
      model: 'gemini-2.0-flash',
      history: formattedHistory,
    });

    const thread: ChatThread = {
      id: nodeId,
      history,
      documentContext: allDocuments,
      chat,
      isLoading: false,
      parentThreadId,
      inheritedDocuments: inheritedDocuments.length > 0 ? inheritedDocuments : undefined
    };

    this.threads.set(nodeId, thread);
    
    logger.info('ChatManager: Thread created successfully', {
      nodeId,
      totalDocuments: allDocuments.length,
      currentDocuments: currentDocuments.length,
      inheritedDocuments: inheritedDocuments.length,
      historyParts: formattedHistory.reduce((sum, h) => sum + h.parts.length, 0)
    });
    
    return thread;
  }

  // Get an existing thread or create a new one with document inheritance
  getThread(nodeId: string, history: ChatMessage[], parentThreadId?: string) {
    const existingThread = this.threads.get(nodeId);
    if (existingThread) {
      // Update document context if new documents are available
      const currentDocuments = this.extractDocumentsFromHistory(history);
      const hasNewDocuments = currentDocuments.some(newDoc => 
        !existingThread.documentContext.some(existingDoc => 
          existingDoc.name === newDoc.name && existingDoc.type === newDoc.type
        )
      );
      
      if (hasNewDocuments) {
        logger.info('ChatManager: Updating thread with new documents', {
          nodeId,
          newDocuments: currentDocuments.length,
          existingDocuments: existingThread.documentContext.length
        });
        
        // Merge new documents
        const updatedDocuments = [...existingThread.documentContext];
        const seenDocuments = new Set(updatedDocuments.map(d => `${d.name}:${d.type}`));
        
        currentDocuments.forEach(doc => {
          const docKey = `${doc.name}:${doc.type}`;
          if (!seenDocuments.has(docKey)) {
            updatedDocuments.push(doc);
            seenDocuments.add(docKey);
          }
        });
        
        existingThread.documentContext = updatedDocuments;
      }
      
      return existingThread;
    }
    
    return this.createThread(nodeId, history, parentThreadId);
  }

  // Send a message to a specific thread with document context awareness
  async sendMessage(nodeId: string, message: string, attachments?: AttachmentData[]) {
    const thread = this.threads.get(nodeId);
    if (!thread) {
      throw new Error(`No chat thread found for node ${nodeId}`);
    }

    logger.info('ChatManager: Sending message with document context', {
      nodeId,
      messageLength: message.length,
      newAttachments: attachments?.length || 0,
      existingDocuments: thread.documentContext.length
    });

    try {
      thread.isLoading = true;
      
      // Add new attachments to thread context if provided
      if (attachments && attachments.length > 0) {
        const documents = attachments.filter(att => 
          att.type === 'application/pdf' || 
          att.type.startsWith('text/') || 
          att.type.includes('javascript') || 
          att.type.includes('python')
        );
        
        if (documents.length > 0) {
          const seenDocuments = new Set(thread.documentContext.map(d => `${d.name}:${d.type}`));
          documents.forEach(doc => {
            const docKey = `${doc.name}:${doc.type}`;
            if (!seenDocuments.has(docKey)) {
              thread.documentContext.push(doc);
              seenDocuments.add(docKey);
              
              logger.debug('ChatManager: Added new document to thread context', {
                nodeId,
                fileName: doc.name,
                fileType: doc.type
              });
            }
          });
        }
      }
      
      // Prepare message parts with any new attachments
      const messageParts: any[] = [{ text: message }];
      if (attachments) {
        attachments.forEach(att => {
          let cleanData = att.data;
          if (att.data.includes(',')) {
            cleanData = att.data.split(',')[1];
          }
          
          messageParts.unshift({
            inlineData: {
              mimeType: att.type,
              data: cleanData,
            }
          });
        });
      }
      
      const result = await thread.chat.sendMessage({ message: messageParts });
      const response = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Update thread history with full attachment context
      thread.history.push(
        { role: 'user', content: message, attachments: attachments || [] },
        { role: 'model', content: response }
      );

      logger.info('ChatManager: Message sent successfully with document context', {
        nodeId,
        responseLength: response.length,
        threadDocuments: thread.documentContext.length,
        historyLength: thread.history.length
      });

      return response;
    } catch (error) {
      logger.error('ChatManager: Error sending message', { nodeId, error });
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

  // Create a branch thread that inherits document context
  createBranchThread(sourceNodeId: string, newNodeId: string, history: ChatMessage[]) {
    const sourceThread = this.threads.get(sourceNodeId);
    
    logger.info('ChatManager: Creating branch thread with document inheritance', {
      sourceNodeId,
      newNodeId,
      hasSourceThread: !!sourceThread,
      sourceDocuments: sourceThread?.documentContext.length || 0
    });
    
    // Create new thread with parent reference for document inheritance
    return this.createThread(newNodeId, history, sourceNodeId);
  }

  // Get document context for a thread
  getDocumentContext(nodeId: string): AttachmentData[] {
    const thread = this.threads.get(nodeId);
    if (!thread) {
      logger.debug('ChatManager: No thread found for document context', { nodeId });
      return [];
    }
    
    return [...thread.documentContext, ...(thread.inheritedDocuments || [])];
  }

  // Delete a thread and its document context
  deleteThread(nodeId: string) {
    const thread = this.threads.get(nodeId);
    if (thread) {
      logger.info('ChatManager: Deleting thread with document context', {
        nodeId,
        documentsInContext: thread.documentContext.length,
        inheritedDocuments: thread.inheritedDocuments?.length || 0
      });
    }
    
    this.threads.delete(nodeId);
  }

  // Clear all threads and document contexts
  clearThreads() {
    const threadCount = this.threads.size;
    const totalDocuments = Array.from(this.threads.values()).reduce(
      (sum, thread) => sum + thread.documentContext.length, 0
    );
    
    logger.info('ChatManager: Clearing all threads', {
      threadCount,
      totalDocuments
    });
    
    this.threads.clear();
  }

  // Generate a title for a conversation node with document awareness
  async generateTitle(messages: ChatMessage[]): Promise<string> {
    try {
      const modelName = 'gemini-1.5-flash';

      // Check if conversation involves documents
      const hasDocuments = messages.some(msg => 
        msg.attachments && msg.attachments.length > 0
      );
      
      const documentTypes = new Set<string>();
      if (hasDocuments) {
        messages.forEach(msg => {
          msg.attachments?.forEach(att => {
            if (att.type === 'application/pdf') documentTypes.add('PDF');
            else if (att.type.includes('javascript')) documentTypes.add('JavaScript');
            else if (att.type.includes('python')) documentTypes.add('Python');
            else if (att.type.startsWith('text/')) documentTypes.add('Text');
          });
        });
      }

      const formattedHistory = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      // Create a context-aware prompt for title generation
      let titlePrompt = `Based on the following conversation, provide a concise title (maximum 5 words) that captures the main topic.`;
      
      if (hasDocuments && documentTypes.size > 0) {
        const docTypesStr = Array.from(documentTypes).join(', ');
        titlePrompt += ` This conversation involves document analysis with ${docTypesStr} files.`;
      }
      
      titlePrompt += ` Only return the title, without any additional text or quotation marks.

Conversation:
${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;
      
      const chat = this.ai.chats.create({
        model: modelName,
        history: formattedHistory,
      });

      const result = await chat.sendMessage({ message: titlePrompt });
      const response = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Clean up the response and ensure it's not too long
      let title = response.trim().replace(/^["']|["']$/g, '');
      
      // Add document indicator if relevant
      if (hasDocuments && !title.toLowerCase().includes('document') && !title.toLowerCase().includes('pdf')) {
        title = title.length > 20 ? title.substring(0, 20) + '...' : title;
      }
      
      const finalTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
      
      logger.info('ChatManager: Generated title with document context', {
        finalTitle,
        hasDocuments,
        documentTypes: Array.from(documentTypes),
        originalLength: response.length
      });
      
      return finalTitle;
    } catch (error) {
      logger.error('ChatManager: Error generating title', { error });
      // Fallback to a simple title if generation fails
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        return lastMessage.content.substring(0, 30) + (lastMessage.content.length > 30 ? '...' : '');
      }
      return 'New Chat';
    }
  }
} 