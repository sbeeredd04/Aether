import React, { useState, useRef, useEffect } from 'react';
import { FiPlus, FiX, FiEdit2, FiCheck, FiDownload, FiUpload, FiMoreHorizontal, FiSettings, FiHome } from 'react-icons/fi';
import { FaInfo } from 'react-icons/fa';
import { BsLayoutSidebarInsetReverse } from "react-icons/bs";
import Image from 'next/image';
import Link from 'next/link';
import { workspaceManager, WorkspaceMetadata } from '../utils/workspaceManager';
import { globalToast } from './ui/Toast';
import logger from '../utils/logger';

interface WorkspaceSelectorProps {
  currentWorkspace: WorkspaceMetadata | null;
  onWorkspaceChange: (workspaceId: string) => void;
  onWorkspaceRename: (workspaceId: string, newName: string) => void;
  isMobile?: boolean;
  isSidebarOpen?: boolean;
  sidebarWidth?: number;
  onToggleSidebar?: () => void;
  onShowSettings?: () => void;
  onShowModelInfo?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'consent', title: string, message: string, onAccept?: () => void, onDecline?: () => void) => void;
}

export default function WorkspaceSelector({ 
  currentWorkspace, 
  onWorkspaceChange, 
  onWorkspaceRename,
  isMobile = false,
  isSidebarOpen = false,
  sidebarWidth = 600,
  onToggleSidebar,
  onShowSettings,
  onShowModelInfo,
  onShowToast
}: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceMetadata[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  
  const tabsRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const newWorkspaceInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Focus input when creating starts
  useEffect(() => {
    if (isCreating && newWorkspaceInputRef.current) {
      newWorkspaceInputRef.current.focus();
    }
  }, [isCreating]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration?: number) => {
    if (onShowToast && (type === 'success' || type === 'error')) {
      onShowToast(type, title, message);
    } else {
      // Fallback to global toast
      globalToast[type](title, message, duration);
    }
  };

  const loadWorkspaces = () => {
    const allWorkspaces = workspaceManager.getWorkspaces();
    setWorkspaces(allWorkspaces);
    logger.debug('WorkspaceSelector: Loaded workspaces', { count: allWorkspaces.length });
  };

  const handleWorkspaceSelect = (workspaceId: string) => {
    if (workspaceId !== currentWorkspace?.id) {
      onWorkspaceChange(workspaceId);
    }
  };

  const handleStartEdit = (workspaceId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(workspaceId);
    setEditingName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      const success = workspaceManager.renameWorkspace(editingId, editingName.trim());
      if (success) {
        onWorkspaceRename(editingId, editingName.trim());
        loadWorkspaces();
        showToast('success', 'Workspace Renamed', 'Workspace renamed successfully');
      } else {
        showToast('error', 'Rename Failed', 'Failed to rename workspace');
      }
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleCreateWorkspace = () => {
    setIsCreating(true);
    setNewWorkspaceName('');
    setShowMenu(false);
  };

  const handleSaveNewWorkspace = () => {
    if (newWorkspaceName.trim()) {
      const workspaceId = workspaceManager.createWorkspace(newWorkspaceName.trim());
      loadWorkspaces();
      onWorkspaceChange(workspaceId);
      // Don't show toast here - let the parent handle it
    }
    setIsCreating(false);
    setNewWorkspaceName('');
  };

  const handleCancelNewWorkspace = () => {
    setIsCreating(false);
    setNewWorkspaceName('');
  };

  const handleNewWorkspaceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveNewWorkspace();
    } else if (e.key === 'Escape') {
      handleCancelNewWorkspace();
    }
  };

  const handleDeleteWorkspace = (workspaceId: string, workspaceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (workspaceId === 'default') return;
    
    if (onShowToast) {
      onShowToast(
        'consent',
        'Delete Workspace',
        `Delete workspace "${workspaceName}"? This action cannot be undone.`,
        () => {
          const success = workspaceManager.deleteWorkspace(workspaceId);
          if (success) {
            loadWorkspaces();
            if (workspaceId === currentWorkspace?.id) {
              onWorkspaceChange('default');
            }
            showToast('success', 'Workspace Deleted', 'Workspace deleted successfully');
          } else {
            showToast('error', 'Delete Failed', 'Failed to delete workspace');
          }
        },
        () => {
          // User declined - no action needed
        }
      );
    }
  };

  const handleExportWorkspace = (workspaceId: string, workspaceName: string) => {
    const exportData = workspaceManager.exportWorkspace(workspaceId);
    if (exportData) {
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aether-workspace-${workspaceName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('success', 'Export Complete', 'Workspace exported successfully');
    } else {
      showToast('error', 'Export Failed', 'Failed to export workspace');
    }
    setShowMenu(false);
  };

  const handleImportWorkspace = () => {
    fileInputRef.current?.click();
    setShowMenu(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const workspaceId = workspaceManager.importWorkspace(content);
      if (workspaceId) {
        loadWorkspaces();
        onWorkspaceChange(workspaceId);
        showToast('success', 'Import Complete', 'Workspace imported successfully');
      } else {
        showToast('error', 'Import Failed', 'Failed to import workspace. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 150;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setIsCreating(false);
    setEditingId(null);
  };

  // Calculate positioning like prompt bar
  const getNavBarStyle = () => {
    if (isMobile) {
      return {
        left: '1rem',
        right: '1rem',
        top: '1rem'
      };
    }
    
    return {
      left: '1rem',
      right: isSidebarOpen ? `${sidebarWidth + 50}px` : '1rem',
      top: '1rem',
      transition: 'right 0.3s ease'
    };
  };

  return (
    <>
      {/* Navigation Bar */}
      <div 
        className="fixed z-50 pointer-events-none"
        style={getNavBarStyle()}
      >
        <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl pointer-events-auto">
          {/* Compact Mode - Now with tabs */}
          {!isExpanded && (
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Aether Logo */}
              <button
                onClick={toggleExpanded}
                className="flex items-center gap-2 text-white hover:text-purple-300 transition-all duration-300"
              >
                <div className="transition-transform duration-500 hover:rotate-180">
                  <Image 
                    src="/aether.svg" 
                    alt="Aether AI" 
                    width={isMobile ? 24 : 28} 
                    height={isMobile ? 24 : 28}
                    className="filter brightness-110"
                  />
                </div>
                {!isMobile && (
                  <span className="font-major-mono font-medium text-lg">
                    Workspaces
                  </span>
                )}
              </button>

              {/* Workspace Tabs Container */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Scroll Left Button */}
                <button
                  onClick={() => scrollTabs('left')}
                  className="p-1 text-white/40 hover:text-white/80 rounded transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10 12L6 8l4-4v8z"/>
                  </svg>
                </button>

                {/* Tabs Scroll Container */}
                <div 
                  ref={tabsRef}
                  className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-smooth flex-1 min-w-0"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {/* Workspace Tabs */}
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className={`
                        group relative flex items-center min-w-0 max-w-32 px-2 py-1.5 rounded-lg cursor-pointer
                        transition-all duration-200 border text-xs
                        ${workspace.id === currentWorkspace?.id
                          ? 'bg-purple-600/40 border-purple-400/60 text-white shadow-lg' 
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white/90'
                        }
                      `}
                      onClick={() => handleWorkspaceSelect(workspace.id)}
                    >
                      {/* Tab Content */}
                      <div className="flex items-center min-w-0 flex-1">
                        {editingId === workspace.id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={handleSaveEdit}
                            className="flex-1 bg-transparent border-b border-white/30 text-white text-xs focus:outline-none focus:border-purple-400 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <span className="truncate flex-1 min-w-0 font-medium">
                              {workspace.name}
                            </span>
                            
                            {/* Tab Actions - Only show for active tab or on hover */}
                            {(workspace.id === currentWorkspace?.id || true) && (
                              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => handleStartEdit(workspace.id, workspace.name, e)}
                                  className="p-0.5 text-white/40 hover:text-white/80 transition-colors"
                                  title="Rename workspace"
                                >
                                  <FiEdit2 size={10} />
                                </button>
                                
                                {workspace.id !== 'default' && (
                                  <button
                                    onClick={(e) => handleDeleteWorkspace(workspace.id, workspace.name, e)}
                                    className="p-0.5 text-white/40 hover:text-red-400 transition-colors"
                                    title="Delete workspace"
                                  >
                                    <FiX size={10} />
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Active Indicator */}
                      {workspace.id === currentWorkspace?.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400 rounded-full" />
                      )}
                    </div>
                  ))}

                  {/* New Workspace Tab */}
                  {isCreating && (
                    <div className="group relative flex items-center min-w-0 max-w-32 px-2 py-1.5 bg-purple-600/20 border border-purple-400/50 rounded-lg text-xs">
                      <input
                        ref={newWorkspaceInputRef}
                        type="text"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        onKeyDown={handleNewWorkspaceKeyDown}
                        className="flex-1 bg-transparent border-b border-white/30 text-white text-xs focus:outline-none focus:border-purple-400 min-w-0"
                        placeholder="Name"
                      />
                      <div className="flex items-center gap-0.5 ml-1">
                        <button
                          onClick={handleSaveNewWorkspace}
                          className="p-0.5 text-green-400 hover:text-green-300 transition-colors"
                        >
                          <FiCheck size={10} />
                        </button>
                        <button
                          onClick={handleCancelNewWorkspace}
                          className="p-0.5 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <FiX size={10} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scroll Right Button */}
                <button
                  onClick={() => scrollTabs('right')}
                  className="p-1 text-white/40 hover:text-white/80 rounded transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6 4l4 4-4 4V4z"/>
                  </svg>
                </button>

                {/* Add New Workspace Button */}
                <button
                  onClick={handleCreateWorkspace}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="New workspace"
                >
                  <FiPlus size={14} />
                </button>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1 ml-2">
                {!isMobile && onToggleSidebar && (
                  <button
                    onClick={onToggleSidebar}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Toggle sidebar"
                  >
                    <BsLayoutSidebarInsetReverse size={16} />
                  </button>
                )}
                
                <Link 
                  href="/" 
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Home"
                >
                  <FiHome size={16} />
                </Link>
                
                {onShowModelInfo && (
                  <button
                    onClick={onShowModelInfo}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Model info"
                  >
                    <FaInfo size={14} />
                  </button>
                )}
                
                {onShowSettings && (
                  <button
                    onClick={onShowSettings}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Settings"
                  >
                    <FiSettings size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Expanded Mode - Now for detailed info and management */}
          {isExpanded && (
            <div className="p-4 space-y-4 min-w-96">
              {/* Header with Logo */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleExpanded}
                  className="flex items-center gap-3 text-white hover:text-purple-300 transition-all duration-300"
                >
                  <div className="transition-transform duration-500 rotate-180">
                    <Image 
                      src="/aether.svg" 
                      alt="Aether AI" 
                      width={isMobile ? 28 : 32} 
                      height={isMobile ? 28 : 32}
                      className="filter brightness-110"
                    />
                  </div>
                  <span className={`font-major-mono font-medium ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    Workspace Manager
                  </span>
                </button>

                {/* Action Icons */}
                <div className="flex items-center gap-2">
                  {!isMobile && onToggleSidebar && (
                    <button
                      onClick={onToggleSidebar}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      title="Toggle sidebar"
                    >
                      <BsLayoutSidebarInsetReverse size={18} />
                    </button>
                  )}
                  
                  <Link 
                    href="/" 
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Home"
                  >
                    <FiHome size={18} />
                  </Link>
                  
                  {onShowModelInfo && (
                    <button
                      onClick={onShowModelInfo}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      title="Model info"
                    >
                      <FaInfo size={16} />
                    </button>
                  )}
                  
                  {onShowSettings && (
                    <button
                      onClick={onShowSettings}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      title="Settings"
                    >
                      <FiSettings size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Current Workspace Info */}
              {currentWorkspace && (
                <div className="bg-purple-600/20 border border-purple-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium text-lg">Current Workspace</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleStartEdit(currentWorkspace.id, currentWorkspace.name, e)}
                        className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-all"
                        title="Rename workspace"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-purple-200 font-medium text-xl mb-3">{currentWorkspace.name}</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{currentWorkspace.totalMessages}</div>
                      <div className="text-white/60">Messages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{currentWorkspace.totalNodes}</div>
                      <div className="text-white/60">Nodes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-white">
                        {new Date(currentWorkspace.lastModified).toLocaleDateString()}
                      </div>
                      <div className="text-white/60">Modified</div>
                    </div>
                  </div>
                </div>
              )}

              {/* All Workspaces List */}
              <div>
                <h3 className="text-white font-medium mb-3">All Workspaces</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all
                        ${workspace.id === currentWorkspace?.id
                          ? 'bg-purple-600/30 border border-purple-400/50' 
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                        }
                      `}
                      onClick={() => handleWorkspaceSelect(workspace.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {workspace.name}
                        </div>
                        <div className="text-xs text-white/60">
                          {workspace.totalMessages} messages • {workspace.totalNodes} nodes
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => handleExportWorkspace(workspace.id, workspace.name)}
                          className="p-1 text-white/40 hover:text-white/80 transition-colors"
                          title="Export workspace"
                        >
                          <FiDownload size={12} />
                        </button>
                        {workspace.id !== 'default' && (
                          <button
                            onClick={(e) => handleDeleteWorkspace(workspace.id, workspace.name, e)}
                            className="p-1 text-red-400/60 hover:text-red-400 transition-colors"
                            title="Delete workspace"
                          >
                            <FiX size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Management Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  onClick={handleCreateWorkspace}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-400/50 rounded-lg text-white/90 hover:text-white transition-all text-sm"
                >
                  <FiPlus size={16} />
                  New Workspace
                </button>

                {/* Import/Export Menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Import/Export options"
                  >
                    <FiMoreHorizontal size={18} />
                  </button>

                  {/* Dropdown Menu */}
                  {showMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50">
                      <div className="py-2">
                        <button
                          onClick={handleImportWorkspace}
                          className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                        >
                          <FiUpload size={16} />
                          Import Workspace
                        </button>
                        {currentWorkspace && (
                          <button
                            onClick={() => handleExportWorkspace(currentWorkspace.id, currentWorkspace.name)}
                            className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                          >
                            <FiDownload size={16} />
                            Export Current
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Custom styles for hiding scrollbar */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
} 