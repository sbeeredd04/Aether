import logger from './logger';

export interface WorkspaceMetadata {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  totalMessages: number;
  totalNodes: number;
  isActive: boolean;
  icon?: string; // Optional icon name
}

export interface WorkspaceData {
  id: string;
  name: string;
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
}

const WORKSPACE_KEYS = {
  WORKSPACES_LIST: 'aether-workspaces-list',
  ACTIVE_WORKSPACE: 'aether-active-workspace',
  WORKSPACE_PREFIX: 'aether-workspace-'
};

class WorkspaceManager {
  private static instance: WorkspaceManager;

  static getInstance(): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager();
    }
    return WorkspaceManager.instance;
  }

  // Check if we're in browser environment
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // Generate unique workspace ID
  private generateWorkspaceId(): string {
    return `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get all workspaces metadata
  getWorkspaces(): WorkspaceMetadata[] {
    if (!this.isBrowser()) return [];

    try {
      const stored = localStorage.getItem(WORKSPACE_KEYS.WORKSPACES_LIST);
      if (!stored) {
        // Create default workspace if none exist
        const defaultWorkspace = this.createDefaultWorkspace();
        return [defaultWorkspace];
      }

      const workspaces: WorkspaceMetadata[] = JSON.parse(stored);
      logger.debug('WorkspaceManager: Retrieved workspaces', { count: workspaces.length });
      return workspaces;
    } catch (error) {
      logger.error('WorkspaceManager: Failed to get workspaces', { error });
      return [];
    }
  }

  // Create default workspace
  private createDefaultWorkspace(): WorkspaceMetadata {
    const defaultWorkspace: WorkspaceMetadata = {
      id: 'default',
      name: 'Main Workspace',
      createdAt: Date.now(),
      lastModified: Date.now(),
      totalMessages: 0,
      totalNodes: 1,
      isActive: true
    };

    this.saveWorkspacesList([defaultWorkspace]);
    this.setActiveWorkspace('default');
    
    logger.info('WorkspaceManager: Created default workspace');
    return defaultWorkspace;
  }

  // Save workspaces list
  private saveWorkspacesList(workspaces: WorkspaceMetadata[]): void {
    if (!this.isBrowser()) return;

    try {
      localStorage.setItem(WORKSPACE_KEYS.WORKSPACES_LIST, JSON.stringify(workspaces));
      logger.debug('WorkspaceManager: Saved workspaces list', { count: workspaces.length });
    } catch (error) {
      logger.error('WorkspaceManager: Failed to save workspaces list', { error });
    }
  }

  // Get active workspace ID
  getActiveWorkspaceId(): string {
    if (!this.isBrowser()) return 'default';

    try {
      const activeId = localStorage.getItem(WORKSPACE_KEYS.ACTIVE_WORKSPACE);
      return activeId || 'default';
    } catch (error) {
      logger.error('WorkspaceManager: Failed to get active workspace', { error });
      return 'default';
    }
  }

  // Set active workspace
  setActiveWorkspace(workspaceId: string): void {
    if (!this.isBrowser()) return;

    try {
      localStorage.setItem(WORKSPACE_KEYS.ACTIVE_WORKSPACE, workspaceId);
      
      // Update isActive flag in workspaces list
      const workspaces = this.getWorkspaces();
      const updatedWorkspaces = workspaces.map(ws => ({
        ...ws,
        isActive: ws.id === workspaceId
      }));
      this.saveWorkspacesList(updatedWorkspaces);

      logger.info('WorkspaceManager: Set active workspace', { workspaceId });
    } catch (error) {
      logger.error('WorkspaceManager: Failed to set active workspace', { error });
    }
  }

  // Get workspace data
  getWorkspaceData(workspaceId: string): WorkspaceData | null {
    if (!this.isBrowser()) return null;

    try {
      const key = `${WORKSPACE_KEYS.WORKSPACE_PREFIX}${workspaceId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        logger.debug('WorkspaceManager: No data found for workspace', { workspaceId });
        return null;
      }

      const data: WorkspaceData = JSON.parse(stored);
      logger.debug('WorkspaceManager: Retrieved workspace data', { 
        workspaceId, 
        nodeCount: data.nodes.length,
        edgeCount: data.edges.length 
      });
      
      return data;
    } catch (error) {
      logger.error('WorkspaceManager: Failed to get workspace data', { workspaceId, error });
      return null;
    }
  }

  // Save workspace data
  saveWorkspaceData(workspaceId: string, data: Omit<WorkspaceData, 'id'>): boolean {
    if (!this.isBrowser()) return false;

    try {
      const workspaceData: WorkspaceData = {
        ...data,
        id: workspaceId
      };

      const key = `${WORKSPACE_KEYS.WORKSPACE_PREFIX}${workspaceId}`;
      localStorage.setItem(key, JSON.stringify(workspaceData));

      // Update workspace metadata
      this.updateWorkspaceMetadata(workspaceId, {
        lastModified: Date.now(),
        totalMessages: data.metadata.totalMessages,
        totalNodes: data.nodes.length
      });

      logger.debug('WorkspaceManager: Saved workspace data', { 
        workspaceId, 
        nodeCount: data.nodes.length,
        messageCount: data.metadata.totalMessages
      });
      
      return true;
    } catch (error) {
      logger.error('WorkspaceManager: Failed to save workspace data', { workspaceId, error });
      return false;
    }
  }

  // Create new workspace
  createWorkspace(name: string): string {
    const workspaceId = this.generateWorkspaceId();
    const newWorkspace: WorkspaceMetadata = {
      id: workspaceId,
      name: name.trim() || 'New Workspace',
      createdAt: Date.now(),
      lastModified: Date.now(),
      totalMessages: 0,
      totalNodes: 1,
      isActive: false
    };

    const workspaces = this.getWorkspaces();
    workspaces.push(newWorkspace);
    this.saveWorkspacesList(workspaces);

    logger.info('WorkspaceManager: Created new workspace', { workspaceId, name: newWorkspace.name });
    return workspaceId;
  }

  // Rename workspace
  renameWorkspace(workspaceId: string, newName: string): boolean {
    if (!this.isBrowser()) return false;

    try {
      const workspaces = this.getWorkspaces();
      const workspaceIndex = workspaces.findIndex(ws => ws.id === workspaceId);
      
      if (workspaceIndex === -1) {
        logger.warn('WorkspaceManager: Workspace not found for rename', { workspaceId });
        return false;
      }

      workspaces[workspaceIndex].name = newName.trim() || 'Unnamed Workspace';
      workspaces[workspaceIndex].lastModified = Date.now();
      
      this.saveWorkspacesList(workspaces);
      
      logger.info('WorkspaceManager: Renamed workspace', { workspaceId, newName });
      return true;
    } catch (error) {
      logger.error('WorkspaceManager: Failed to rename workspace', { workspaceId, error });
      return false;
    }
  }

  // Update workspace icon
  updateWorkspaceIcon(workspaceId: string, iconName: string): boolean {
    if (!this.isBrowser()) return false;

    try {
      const workspaces = this.getWorkspaces();
      const workspaceIndex = workspaces.findIndex(ws => ws.id === workspaceId);
      
      if (workspaceIndex === -1) {
        logger.warn('WorkspaceManager: Workspace not found for icon update', { workspaceId });
        return false;
      }

      workspaces[workspaceIndex].icon = iconName;
      workspaces[workspaceIndex].lastModified = Date.now();
      
      this.saveWorkspacesList(workspaces);
      
      logger.info('WorkspaceManager: Updated workspace icon', { workspaceId, iconName });
      return true;
    } catch (error) {
      logger.error('WorkspaceManager: Failed to update workspace icon', { workspaceId, error });
      return false;
    }
  }

  // Delete workspace
  deleteWorkspace(workspaceId: string): boolean {
    if (!this.isBrowser() || workspaceId === 'default') return false;

    try {
      // Remove workspace data
      const dataKey = `${WORKSPACE_KEYS.WORKSPACE_PREFIX}${workspaceId}`;
      localStorage.removeItem(dataKey);

      // Remove from workspaces list
      const workspaces = this.getWorkspaces();
      const filteredWorkspaces = workspaces.filter(ws => ws.id !== workspaceId);
      this.saveWorkspacesList(filteredWorkspaces);

      // If deleted workspace was active, switch to default
      if (this.getActiveWorkspaceId() === workspaceId) {
        this.setActiveWorkspace('default');
      }

      logger.info('WorkspaceManager: Deleted workspace', { workspaceId });
      return true;
    } catch (error) {
      logger.error('WorkspaceManager: Failed to delete workspace', { workspaceId, error });
      return false;
    }
  }

  // Update workspace metadata
  private updateWorkspaceMetadata(workspaceId: string, updates: Partial<WorkspaceMetadata>): void {
    const workspaces = this.getWorkspaces();
    const workspaceIndex = workspaces.findIndex(ws => ws.id === workspaceId);
    
    if (workspaceIndex !== -1) {
      workspaces[workspaceIndex] = { ...workspaces[workspaceIndex], ...updates };
      this.saveWorkspacesList(workspaces);
    }
  }

  // Get workspace by ID
  getWorkspace(workspaceId: string): WorkspaceMetadata | null {
    const workspaces = this.getWorkspaces();
    return workspaces.find(ws => ws.id === workspaceId) || null;
  }

  // Get current active workspace
  getActiveWorkspace(): WorkspaceMetadata | null {
    const activeId = this.getActiveWorkspaceId();
    return this.getWorkspace(activeId);
  }

  // Export workspace
  exportWorkspace(workspaceId: string): string | null {
    const workspaceData = this.getWorkspaceData(workspaceId);
    const workspaceMetadata = this.getWorkspace(workspaceId);
    
    if (!workspaceData || !workspaceMetadata) return null;

    const exportData = {
      metadata: workspaceMetadata,
      data: workspaceData,
      exportedAt: Date.now(),
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Import workspace
  importWorkspace(importData: string): string | null {
    try {
      const parsed = JSON.parse(importData);
      
      if (!parsed.metadata || !parsed.data) {
        throw new Error('Invalid workspace export format');
      }

      const newWorkspaceId = this.generateWorkspaceId();
      const workspaceName = `${parsed.metadata.name} (Imported)`;

      // Create workspace metadata
      const newWorkspace: WorkspaceMetadata = {
        id: newWorkspaceId,
        name: workspaceName,
        createdAt: Date.now(),
        lastModified: Date.now(),
        totalMessages: parsed.data.metadata.totalMessages,
        totalNodes: parsed.data.nodes.length,
        isActive: false
      };

      // Save workspace
      const workspaces = this.getWorkspaces();
      workspaces.push(newWorkspace);
      this.saveWorkspacesList(workspaces);

      // Save workspace data
      this.saveWorkspaceData(newWorkspaceId, {
        name: workspaceName,
        nodes: parsed.data.nodes,
        edges: parsed.data.edges,
        activeNodeId: parsed.data.activeNodeId,
        timestamp: Date.now(),
        version: parsed.data.version,
        metadata: {
          ...parsed.data.metadata,
          lastModified: Date.now()
        }
      });

      logger.info('WorkspaceManager: Imported workspace', { workspaceId: newWorkspaceId, name: workspaceName });
      return newWorkspaceId;
    } catch (error) {
      logger.error('WorkspaceManager: Failed to import workspace', { error });
      return null;
    }
  }

  // Clear all workspaces (for testing/reset)
  clearAllWorkspaces(): void {
    if (!this.isBrowser()) return;

    try {
      const workspaces = this.getWorkspaces();
      
      // Remove all workspace data
      workspaces.forEach(ws => {
        const key = `${WORKSPACE_KEYS.WORKSPACE_PREFIX}${ws.id}`;
        localStorage.removeItem(key);
      });

      // Clear workspaces list and active workspace
      localStorage.removeItem(WORKSPACE_KEYS.WORKSPACES_LIST);
      localStorage.removeItem(WORKSPACE_KEYS.ACTIVE_WORKSPACE);

      logger.info('WorkspaceManager: Cleared all workspaces');
    } catch (error) {
      logger.error('WorkspaceManager: Failed to clear workspaces', { error });
    }
  }
}

// Export singleton instance
export const workspaceManager = WorkspaceManager.getInstance(); 