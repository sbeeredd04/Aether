import logger from './logger';

// Storage keys
export const STORAGE_KEYS = {
  WORKSPACE_DATA: 'aether-workspace-persistent',
  SESSION_DATA: 'aether-chat-session',
  CONSENT: 'aether-storage-consent',
  SETTINGS: 'aether-settings',
  EXPORT_HISTORY: 'aether-export-history'
} as const;

// Storage versions for migration
export const STORAGE_VERSION = '2.0.0';

// Storage consent preferences
export interface StorageConsent {
  granted: boolean;
  timestamp: number;
  version: string;
  persistentStorage: boolean;
  analytics: boolean; // For future use
}

// Enhanced workspace data interface
export interface PersistentWorkspaceData {
  nodes: any[];
  edges: any[];
  activeNodeId: string | null;
  timestamp: number;
  version: string;
  metadata: {
    totalMessages: number;
    totalAttachments: number;
    createdAt: number;
    lastModified: number;
    dataSize: number;
  };
  settings: {
    autoSave: boolean;
    compressionEnabled: boolean;
    retentionDays: number;
  };
}

// Storage manager class
export class PersistentStorageManager {
  private static instance: PersistentStorageManager;
  private consentGranted: boolean = false;
  private useSessionFallback: boolean = true;

  constructor() {
    this.loadConsent();
  }

  static getInstance(): PersistentStorageManager {
    if (!PersistentStorageManager.instance) {
      PersistentStorageManager.instance = new PersistentStorageManager();
    }
    return PersistentStorageManager.instance;
  }

  // Check and load existing consent
  private loadConsent(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      logger.debug('PersistentStorage: Not in browser environment, skipping consent load');
      this.consentGranted = false;
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONSENT);
      if (stored) {
        const consent: StorageConsent = JSON.parse(stored);
        this.consentGranted = consent.granted && consent.persistentStorage;
        logger.info('PersistentStorage: Consent loaded', { 
          granted: this.consentGranted,
          timestamp: new Date(consent.timestamp).toISOString()
        });
      }
    } catch (error) {
      logger.error('PersistentStorage: Failed to load consent', { error });
    }
  }

  // Set user consent for persistent storage
  setConsent(granted: boolean): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      logger.debug('PersistentStorage: Not in browser environment, skipping consent save');
      this.consentGranted = granted;
      return;
    }

    const consent: StorageConsent = {
      granted,
      timestamp: Date.now(),
      version: STORAGE_VERSION,
      persistentStorage: granted,
      analytics: false
    };

    try {
      localStorage.setItem(STORAGE_KEYS.CONSENT, JSON.stringify(consent));
      this.consentGranted = granted;
      
      logger.info('PersistentStorage: Consent updated', { 
        granted,
        persistentStorage: granted
      });

      // If consent is revoked, clear persistent data
      if (!granted) {
        this.clearPersistentData();
      }
    } catch (error) {
      logger.error('PersistentStorage: Failed to save consent', { error });
    }
  }

  // Check if consent is granted
  hasConsent(): boolean {
    return this.consentGranted;
  }

  // Check if consent needs to be requested
  needsConsent(): boolean {
    // In SSR environment, assume consent is needed
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return true;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONSENT);
      return !stored;
    } catch {
      return true;
    }
  }

  // Save workspace data with enhanced metadata
  saveWorkspaceData(data: Omit<PersistentWorkspaceData, 'metadata' | 'settings'>): boolean {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      logger.debug('PersistentStorage: Not in browser environment, skipping save');
      return false;
    }

    try {
      // Calculate metadata
      const totalMessages = data.nodes.reduce((sum, node) => 
        sum + (node.data?.chatHistory?.length || 0), 0
      );
      
      const totalAttachments = data.nodes.reduce((sum, node) => 
        sum + (node.data?.chatHistory?.reduce((msgSum: number, msg: any) => 
          msgSum + (msg.attachments?.length || 0), 0) || 0), 0
      );

      const enhancedData: PersistentWorkspaceData = {
        ...data,
        metadata: {
          totalMessages,
          totalAttachments,
          createdAt: this.getWorkspaceCreationTime(),
          lastModified: Date.now(),
          dataSize: 0 // Will be calculated after stringification
        },
        settings: {
          autoSave: true,
          compressionEnabled: true,
          retentionDays: 30
        }
      };

      const serialized = JSON.stringify(enhancedData);
      enhancedData.metadata.dataSize = serialized.length;

      // Check storage quota and compress if needed
      const finalData = this.handleLargeData(enhancedData, serialized);
      
      if (this.consentGranted) {
        // Save to localStorage for persistence
        localStorage.setItem(STORAGE_KEYS.WORKSPACE_DATA, finalData);
        logger.info('PersistentStorage: Workspace saved to localStorage', {
          nodeCount: data.nodes.length,
          edgeCount: data.edges.length,
          totalMessages,
          totalAttachments,
          dataSize: finalData.length
        });
      } else {
        // Fallback to sessionStorage
        sessionStorage.setItem(STORAGE_KEYS.SESSION_DATA, finalData);
        logger.info('PersistentStorage: Workspace saved to sessionStorage (no consent)', {
          nodeCount: data.nodes.length,
          dataSize: finalData.length
        });
      }

      return true;
    } catch (error) {
      logger.error('PersistentStorage: Failed to save workspace data', { error });
      return false;
    }
  }

  // Load workspace data
  loadWorkspaceData(): PersistentWorkspaceData | null {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      logger.debug('PersistentStorage: Not in browser environment, skipping load');
      return null;
    }

    try {
      let stored: string | null = null;
      let source = 'none';

      // Try localStorage first (persistent)
      if (this.consentGranted) {
        stored = localStorage.getItem(STORAGE_KEYS.WORKSPACE_DATA);
        source = 'localStorage';
      }

      // Fallback to sessionStorage
      if (!stored) {
        stored = sessionStorage.getItem(STORAGE_KEYS.SESSION_DATA);
        source = 'sessionStorage';
      }

      if (!stored) {
        logger.debug('PersistentStorage: No workspace data found');
        return null;
      }

      const data: PersistentWorkspaceData = JSON.parse(stored);

      // Validate data structure
      if (!this.isValidWorkspaceData(data)) {
        logger.warn('PersistentStorage: Invalid workspace data structure');
        return null;
      }

      // Check if data is too old (if retention is set)
      if (this.isDataExpired(data)) {
        logger.info('PersistentStorage: Workspace data expired, clearing');
        this.clearWorkspaceData();
        return null;
      }

      logger.info('PersistentStorage: Workspace data loaded', {
        source,
        nodeCount: data.nodes.length,
        edgeCount: data.edges.length,
        totalMessages: data.metadata.totalMessages,
        lastModified: new Date(data.metadata.lastModified).toISOString(),
        version: data.version
      });

      return data;
    } catch (error) {
      logger.error('PersistentStorage: Failed to load workspace data', { error });
      return null;
    }
  }

  // Handle large data with compression
  private handleLargeData(data: PersistentWorkspaceData, serialized: string): string {
    const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB limit
    
    if (serialized.length <= MAX_SIZE) {
      return serialized;
    }

    logger.warn('PersistentStorage: Data too large, applying compression', {
      originalSize: serialized.length,
      maxSize: MAX_SIZE
    });

    // Compress by reducing message content and removing large attachments
    const compressedData: PersistentWorkspaceData = {
      ...data,
      nodes: data.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          chatHistory: node.data?.chatHistory?.map((msg: any) => ({
            ...msg,
            content: msg.content?.length > 5000 
              ? msg.content.substring(0, 5000) + '...[truncated]' 
              : msg.content,
            attachments: msg.attachments?.filter((att: any) => 
              att.data.length < 50000 // Keep smaller attachments only
            ) || []
          })) || []
        }
      }))
    };

    const compressedSerialized = JSON.stringify(compressedData);
    
    if (compressedSerialized.length > MAX_SIZE) {
      logger.error('PersistentStorage: Even compressed data is too large');
      throw new Error('Workspace data too large to store');
    }

    logger.info('PersistentStorage: Data compressed successfully', {
      originalSize: serialized.length,
      compressedSize: compressedSerialized.length,
      compressionRatio: ((serialized.length - compressedSerialized.length) / serialized.length * 100).toFixed(1) + '%'
    });

    return compressedSerialized;
  }

  // Validate workspace data structure
  private isValidWorkspaceData(data: any): data is PersistentWorkspaceData {
    return (
      data &&
      Array.isArray(data.nodes) &&
      Array.isArray(data.edges) &&
      typeof data.timestamp === 'number' &&
      typeof data.version === 'string' &&
      data.metadata &&
      typeof data.metadata === 'object'
    );
  }

  // Check if data has expired
  private isDataExpired(data: PersistentWorkspaceData): boolean {
    if (!data.settings?.retentionDays) return false;
    
    const retentionMs = data.settings.retentionDays * 24 * 60 * 60 * 1000;
    const expiryTime = data.metadata.lastModified + retentionMs;
    
    return Date.now() > expiryTime;
  }

  // Get workspace creation time
  private getWorkspaceCreationTime(): number {
    try {
      const existing = this.loadWorkspaceData();
      return existing?.metadata.createdAt || Date.now();
    } catch {
      return Date.now();
    }
  }

  // Clear workspace data
  clearWorkspaceData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.WORKSPACE_DATA);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
      logger.info('PersistentStorage: Workspace data cleared');
    } catch (error) {
      logger.error('PersistentStorage: Failed to clear workspace data', { error });
    }
  }

  // Clear all persistent data
  clearPersistentData(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        if (key !== STORAGE_KEYS.CONSENT) { // Keep consent setting
          localStorage.removeItem(key);
        }
      });
      logger.info('PersistentStorage: All persistent data cleared');
    } catch (error) {
      logger.error('PersistentStorage: Failed to clear persistent data', { error });
    }
  }

  // Export workspace data
  exportWorkspaceData(): string | null {
    try {
      const data = this.loadWorkspaceData();
      if (!data) return null;

      const exportData = {
        ...data,
        exportInfo: {
          exportedAt: Date.now(),
          exportVersion: STORAGE_VERSION,
          source: 'Aether AI Workspace'
        }
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logger.error('PersistentStorage: Failed to export workspace data', { error });
      return null;
    }
  }

  // Import workspace data
  importWorkspaceData(importedData: string): boolean {
    try {
      const data = JSON.parse(importedData);
      
      if (!this.isValidWorkspaceData(data)) {
        logger.error('PersistentStorage: Invalid import data structure');
        return false;
      }

      // Update metadata for import
      data.metadata.lastModified = Date.now();
      data.metadata.createdAt = data.metadata.createdAt || Date.now();

      return this.saveWorkspaceData(data);
    } catch (error) {
      logger.error('PersistentStorage: Failed to import workspace data', { error });
      return false;
    }
  }

  // Get storage statistics
  getStorageStats() {
    try {
      const data = this.loadWorkspaceData();
      if (!data) return null;

      return {
        totalNodes: data.nodes.length,
        totalEdges: data.edges.length,
        totalMessages: data.metadata.totalMessages,
        totalAttachments: data.metadata.totalAttachments,
        dataSize: data.metadata.dataSize,
        createdAt: data.metadata.createdAt,
        lastModified: data.metadata.lastModified,
        retentionDays: data.settings.retentionDays,
        hasConsent: this.consentGranted,
        storageQuotaUsed: this.getStorageQuotaUsage()
      };
    } catch (error) {
      logger.error('PersistentStorage: Failed to get storage stats', { error });
      return null;
    }
  }

  // Get storage quota usage
  private getStorageQuotaUsage(): number {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          const usage = estimate.usage || 0;
          const quota = estimate.quota || 0;
          return quota > 0 ? (usage / quota) * 100 : 0;
        });
      }
      return 0;
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const persistentStorage = PersistentStorageManager.getInstance(); 