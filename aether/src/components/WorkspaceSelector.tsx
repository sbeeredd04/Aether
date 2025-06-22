import React, { useState, useRef, useEffect } from 'react';
import { FiPlus, FiX, FiEdit2, FiCheck, FiDownload, FiUpload, FiMoreHorizontal, FiSettings, FiHome } from 'react-icons/fi';
import { FaInfo } from 'react-icons/fa';
import { BsLayoutSidebarInsetReverse } from "react-icons/bs";
import { 
  Folder, 
  Code, 
  Database, 
  Globe, 
  Zap, 
  Star, 
  Heart, 
  Coffee, 
  Briefcase, 
  BookOpen,
  Palette,
  Camera,
  Music,
  Gamepad2,
  Rocket,
  Target,
  Trophy,
  Shield,
  Lock,
  Settings
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { workspaceManager, WorkspaceMetadata } from '../utils/workspaceManager';
import { globalToast } from './ui/Toast';
import logger from '../utils/logger';
import IconPickerModal from './IconPickerModal';

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
  const [iconPickerWorkspaceId, setIconPickerWorkspaceId] = useState<string | null>(null);
  
  const tabsRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const newWorkspaceInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Available icons for workspaces
  const availableIcons = [
    { name: 'Folder', icon: Folder, color: 'from-blue-400 to-blue-600' },
    { name: 'Code', icon: Code, color: 'from-green-400 to-green-600' },
    { name: 'Database', icon: Database, color: 'from-purple-400 to-purple-600' },
    { name: 'Globe', icon: Globe, color: 'from-cyan-400 to-cyan-600' },
    { name: 'Zap', icon: Zap, color: 'from-yellow-400 to-yellow-600' },
    { name: 'Star', icon: Star, color: 'from-amber-400 to-amber-600' },
    { name: 'Heart', icon: Heart, color: 'from-red-400 to-red-600' },
    { name: 'Coffee', icon: Coffee, color: 'from-orange-400 to-orange-600' },
    { name: 'Briefcase', icon: Briefcase, color: 'from-slate-400 to-slate-600' },
    { name: 'BookOpen', icon: BookOpen, color: 'from-indigo-400 to-indigo-600' },
    { name: 'Palette', icon: Palette, color: 'from-pink-400 to-pink-600' },
    { name: 'Camera', icon: Camera, color: 'from-emerald-400 to-emerald-600' },
    { name: 'Music', icon: Music, color: 'from-violet-400 to-violet-600' },
    { name: 'Gamepad2', icon: Gamepad2, color: 'from-lime-400 to-lime-600' },
    { name: 'Rocket', icon: Rocket, color: 'from-sky-400 to-sky-600' },
    { name: 'Target', icon: Target, color: 'from-rose-400 to-rose-600' },
    { name: 'Trophy', icon: Trophy, color: 'from-yellow-400 to-amber-600' },
    { name: 'Shield', icon: Shield, color: 'from-teal-400 to-teal-600' },
    { name: 'Lock', icon: Lock, color: 'from-red-400 to-pink-600' },
    { name: 'Settings', icon: Settings, color: 'from-gray-400 to-gray-600' }
  ];

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

  // Handle horizontal scroll with mouse wheel
  useEffect(() => {
    const tabsContainer = tabsRef.current;
    if (!tabsContainer) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent default vertical scrolling
      e.preventDefault();
      
      // Convert vertical scroll to horizontal scroll
      const scrollAmount = e.deltaY || e.deltaX;
      tabsContainer.scrollLeft += scrollAmount;
    };

    // Add wheel event listener with passive: false to allow preventDefault
    tabsContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      tabsContainer.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration?: number) => {
    if (onShowToast && (type === 'success' || type === 'error')) {
      onShowToast(type, title, message);
    } else {
      // Fallback to global toast
      globalToast[type](title, message, duration);
    }
  };

  // Get workspace icon
  const getWorkspaceIcon = (workspace: WorkspaceMetadata) => {
    const iconData = workspace.icon ? availableIcons.find(i => i.name === workspace.icon) : null;
    return iconData || availableIcons[0]; // Default to folder
  };

  // Handle icon selection
  const handleIconSelect = (iconName: string) => {
    if (iconPickerWorkspaceId) {
      const success = workspaceManager.updateWorkspaceIcon(iconPickerWorkspaceId, iconName);
      if (success) {
        loadWorkspaces();
        showToast('success', 'Icon Updated', 'Workspace icon updated successfully');
      } else {
        showToast('error', 'Update Failed', 'Failed to update workspace icon');
      }
    }
    setIconPickerWorkspaceId(null);
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
      
      try {
        const data = JSON.parse(content);
        
        // Check if it's a single workspace or multiple workspaces
        if (data.workspaces && Array.isArray(data.workspaces)) {
          // Multiple workspaces import
          let importedCount = 0;
          let lastWorkspaceId = '';
          
          data.workspaces.forEach((wsData: any) => {
            if (wsData.metadata && wsData.data) {
              const workspaceId = workspaceManager.createWorkspace(wsData.metadata.name + ' (Imported)');
              if (workspaceId) {
                // Save the workspace data
                workspaceManager.saveWorkspaceData(workspaceId, {
                  name: wsData.metadata.name + ' (Imported)',
                  nodes: wsData.data.nodes || [],
                  edges: wsData.data.edges || [],
                  activeNodeId: wsData.data.activeNodeId || null,
                  timestamp: Date.now(),
                  version: wsData.data.version || '1.0',
                  metadata: {
                    totalMessages: wsData.data.metadata?.totalMessages || 0,
                    totalAttachments: wsData.data.metadata?.totalAttachments || 0,
                    createdAt: Date.now(),
                    lastModified: Date.now(),
                    dataSize: wsData.data.metadata?.dataSize || 0
                  }
                });
                importedCount++;
                lastWorkspaceId = workspaceId;
              }
            }
          });
          
          if (importedCount > 0) {
            loadWorkspaces();
            if (lastWorkspaceId) {
              onWorkspaceChange(lastWorkspaceId);
            }
            showToast('success', 'Import Complete', `Imported ${importedCount} workspace${importedCount > 1 ? 's' : ''} successfully`);
          } else {
            showToast('error', 'Import Failed', 'No valid workspaces found in the file');
          }
        } else {
          // Single workspace import (legacy)
          const workspaceId = workspaceManager.importWorkspace(content);
          if (workspaceId) {
            loadWorkspaces();
            onWorkspaceChange(workspaceId);
            showToast('success', 'Import Complete', 'Workspace imported successfully');
          } else {
            showToast('error', 'Import Failed', 'Failed to import workspace. Please check the file format.');
          }
        }
      } catch (error) {
        showToast('error', 'Import Failed', 'Invalid file format. Please select a valid workspace export file.');
        logger.error('Failed to parse import file', { error });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 150; // Optimized scroll amount for new tab sizes
      const currentScroll = tabsRef.current.scrollLeft;
      const targetScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      // Smooth scroll with easing
      tabsRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setIsCreating(false);
    setEditingId(null);
    
    // Add a smooth transition delay
    if (!isExpanded) {
      setTimeout(() => {
        // Any additional setup for expanded mode
      }, 100);
    }
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
        <div className="bg-black/30 backdrop-blur-md border-0 border-white/10 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden relative">
          {/* Compact Mode - Now with tabs */}
          {!isExpanded && (
            <div className="flex items-center gap-4 px-5 py-4 relative">
              {/* Aether Logo */}
              <button
                onClick={toggleExpanded}
                className="flex items-center gap-3 text-white hover:text-purple-300 transition-all duration-500 ease-out"
              >
                <div className="transition-transform duration-700 ease-out hover:rotate-180">
                  <Image 
                    src="/aether.svg" 
                    alt="Aether AI" 
                    width={isMobile ? 28 : 32} 
                    height={isMobile ? 28 : 32}
                    className="filter brightness-110"
                  />
                </div>
                {!isMobile && (
                  <span className="font-major-mono font-medium text-xl">
                    Workspaces
                  </span>
                )}
              </button>

              {/* Workspace Tabs Container */}
              <div className="flex items-center gap-2 flex-1 min-w-0 relative">
                {/* Scroll Left Button */}
                <button
                  onClick={() => scrollTabs('left')}
                  className="p-2 text-white/40 hover:text-white/80 rounded-lg transition-all duration-300 hover:bg-white/5 z-20"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10 12L6 8l4-4v8z"/>
                  </svg>
                </button>

                {/* Tabs Scroll Container */}
                <div 
                  ref={tabsRef}
                  className="flex items-stretch overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth flex-1 min-w-0 relative gap-2"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {/* Workspace Tabs */}
                  {workspaces.map((workspace, index) => {
                    const iconData = getWorkspaceIcon(workspace);
                    const IconComponent = iconData.icon;
                    const isActive = workspace.id === currentWorkspace?.id;
                    
                    return (
                      <div
                        key={workspace.id}
                        className={`
                          group relative flex items-center min-w-[120px] max-w-[200px] h-12 cursor-pointer flex-shrink-0
                          transition-all duration-300 ease-out text-sm font-medium
                          ${isActive
                            ? 'bg-white/8 text-white shadow-lg z-10 transform scale-105 rounded-t-lg' 
                            : 'text-white/70 hover:text-white/90 hover:scale-102 rounded-lg hover:bg-white/5'
                          }
                        `}
                        onClick={() => handleWorkspaceSelect(workspace.id)}
                      >
                        {/* Tab Content */}
                        <div className="flex items-center min-w-0 flex-1 h-full px-3 relative z-10">
                          {editingId === workspace.id ? (
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={handleSaveEdit}
                              className="flex-1 bg-transparent border-b border-white/30 text-white text-sm focus:outline-none focus:border-purple-400 min-w-0 py-1"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              {/* Workspace Icon */}
                              <div 
                                className="flex-shrink-0 w-4 h-4 mr-2 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIconPickerWorkspaceId(workspace.id);
                                }}
                                title="Click to change icon"
                              >
                                <IconComponent size={14} className="text-white/80 hover:text-white transition-colors" />
                              </div>
                              
                              <span className="truncate flex-1 min-w-0 font-medium text-sm">
                                {workspace.name}
                              </span>
                              
                              {/* Tab Actions */}
                              <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex-shrink-0">
                                <button
                                  onClick={(e) => handleStartEdit(workspace.id, workspace.name, e)}
                                  className="p-1 text-white/40 hover:text-white/80 hover:bg-white/10 rounded transition-all duration-200"
                                  title="Rename workspace"
                                >
                                  <FiEdit2 size={10} />
                                </button>
                                
                                {workspace.id !== 'default' && (
                                  <button
                                    onClick={(e) => handleDeleteWorkspace(workspace.id, workspace.name, e)}
                                    className="p-1 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded transition-all duration-200"
                                    title="Delete workspace"
                                  >
                                    <FiX size={10} />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Active Tab Highlight */}
                        {isActive && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 rounded-full" />
                        )}
                      </div>
                    );
                  })}

                  {/* New Workspace Tab */}
                  {isCreating && (
                    <div className="group relative flex items-center min-w-[120px] max-w-[200px] h-12 bg-purple-600/10 text-sm font-medium rounded-lg border border-purple-400/20 flex-shrink-0">
                      <div className="flex items-center min-w-0 flex-1 h-full px-3">
                        <div className="flex-shrink-0 w-4 h-4 mr-2 flex items-center justify-center">
                          <FiPlus size={14} className="text-purple-400" />
                        </div>
                        <input
                          ref={newWorkspaceInputRef}
                          type="text"
                          value={newWorkspaceName}
                          onChange={(e) => setNewWorkspaceName(e.target.value)}
                          onKeyDown={handleNewWorkspaceKeyDown}
                          className="flex-1 bg-transparent border-b border-white/30 text-white text-sm focus:outline-none focus:border-purple-400 min-w-0 py-1"
                          placeholder="Workspace name"
                        />
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <button
                            onClick={handleSaveNewWorkspace}
                            className="p-1 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded transition-all duration-200"
                          >
                            <FiCheck size={10} />
                          </button>
                          <button
                            onClick={handleCancelNewWorkspace}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-all duration-200"
                          >
                            <FiX size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scroll Right Button */}
                <button
                  onClick={() => scrollTabs('right')}
                  className="p-2 text-white/40 hover:text-white/80 rounded-lg transition-all duration-300 hover:bg-white/5 z-20"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6 4l4 4-4 4V4z"/>
                  </svg>
                </button>

                {/* Add New Workspace Button */}
                <button
                  onClick={handleCreateWorkspace}
                  className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105 ml-2"
                  title="New workspace"
                >
                  <FiPlus size={16} />
                </button>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-3 ml-6">
                {!isMobile && onToggleSidebar && (
                  <button
                    onClick={onToggleSidebar}
                    className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105"
                    title="Toggle sidebar"
                  >
                    <BsLayoutSidebarInsetReverse size={18} />
                  </button>
                )}
                
                <Link 
                  href="/" 
                  className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105"
                  title="Home"
                >
                  <FiHome size={18} />
                </Link>
                
                {onShowModelInfo && (
                  <button
                    onClick={onShowModelInfo}
                    className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105"
                    title="Model info"
                  >
                    <FaInfo size={16} />
                  </button>
                )}
                
                {onShowSettings && (
                  <button
                    onClick={onShowSettings}
                    className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105"
                    title="Settings"
                  >
                    <FiSettings size={18} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Expanded Mode - Compact and intuitive design */}
          {isExpanded && (
            <div className="p-4 space-y-3 w-full animate-in slide-in-from-top-2 duration-300 ease-out">
              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleExpanded}
                  className="flex items-center gap-2 text-white hover:text-purple-300 transition-all duration-300"
                >
                  <div className="transition-transform duration-500 rotate-180">
                    <Image 
                      src="/aether.svg" 
                      alt="Aether AI" 
                      width={24} 
                      height={24}
                      className="filter brightness-110"
                    />
                  </div>
                  <span className="font-major-mono font-medium text-lg">
                    Workspaces
                  </span>
                </button>

                {/* Action Icons */}
                <div className="flex items-center gap-1">
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

              {/* Current Workspace Info - Compact */}
              {currentWorkspace && (
                <div className="bg-purple-600/15 border border-purple-400/25 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-200 text-sm font-medium">Active Workspace</span>
                    <button
                      onClick={(e) => handleStartEdit(currentWorkspace.id, currentWorkspace.name, e)}
                      className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-all"
                      title="Rename workspace"
                    >
                      <FiEdit2 size={12} />
                    </button>
                  </div>
                  <div className="font-medium text-white mb-2">{currentWorkspace.name}</div>
                  <div className="flex gap-4 text-xs text-white/60">
                    <span>{currentWorkspace.totalMessages} messages</span>
                    <span>{currentWorkspace.totalNodes} nodes</span>
                    <span>{new Date(currentWorkspace.lastModified).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {/* Workspaces List - Compact */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-sm font-medium">All Workspaces</span>
                  <span className="text-white/40 text-xs">{workspaces.length} total</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className={`
                        group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all text-sm
                        ${workspace.id === currentWorkspace?.id
                          ? 'bg-purple-600/25 border border-purple-400/40' 
                          : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15'
                        }
                      `}
                      onClick={() => handleWorkspaceSelect(workspace.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {workspace.name}
                        </div>
                        <div className="text-xs text-white/50">
                          {workspace.totalMessages}m • {workspace.totalNodes}n
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportWorkspace(workspace.id, workspace.name);
                          }}
                          className="p-1 text-white/40 hover:text-white/80 transition-colors"
                          title="Export workspace"
                        >
                          <FiDownload size={11} />
                        </button>
                        {workspace.id !== 'default' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkspace(workspace.id, workspace.name, e);
                            }}
                            className="p-1 text-red-400/60 hover:text-red-400 transition-colors"
                            title="Delete workspace"
                          >
                            <FiX size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions - Compact */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  onClick={handleCreateWorkspace}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-400/50 rounded-lg text-white/90 hover:text-white transition-all text-sm"
                >
                  <FiPlus size={14} />
                  New
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleImportWorkspace}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm"
                    title="Import workspace(s) - supports single workspace or multiple workspaces from export"
                  >
                    <FiUpload size={14} />
                    Import
                  </button>
                  
                  {currentWorkspace && (
                    <button
                      onClick={() => handleExportWorkspace(currentWorkspace.id, currentWorkspace.name)}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm"
                      title="Export current workspace"
                    >
                      <FiDownload size={14} />
                      Export
                    </button>
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

      {/* Custom styles for hiding scrollbar and animations */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Ensure only horizontal scrolling */
        .scrollbar-hide {
          overflow-y: hidden !important;
          overscroll-behavior-y: none;
        }
        
        @keyframes slide-in-from-top {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-in {
          animation: slide-in-from-top 0.3s ease-out;
        }
        
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
        
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Custom gradient classes for icon backgrounds */
        .bg-gradient-to-br {
          background-image: linear-gradient(to bottom right, var(--tw-gradient-from), var(--tw-gradient-to));
        }
      `}</style>

      {/* Icon Picker Modal */}
      {iconPickerWorkspaceId && (
        <IconPickerModal
          isOpen={!!iconPickerWorkspaceId}
          onClose={() => setIconPickerWorkspaceId(null)}
          onSelect={handleIconSelect}
          currentIcon={workspaces.find(w => w.id === iconPickerWorkspaceId)?.icon}
        />
      )}
    </>
  );
} 