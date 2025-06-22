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

          {/* Expanded Mode - Now for detailed info and management */}
          {isExpanded && (
            <div className="p-6 space-y-5 min-w-96 animate-in slide-in-from-top-2 duration-500 ease-out">
              {/* Header with Logo */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleExpanded}
                  className="flex items-center gap-3 text-white hover:text-purple-300 transition-all duration-500 ease-out"
                >
                  <div className="transition-transform duration-700 ease-out rotate-180">
                    <Image 
                      src="/aether.svg" 
                      alt="Aether AI" 
                      width={isMobile ? 32 : 36} 
                      height={isMobile ? 32 : 36}
                      className="filter brightness-110"
                    />
                  </div>
                  <span className={`font-major-mono font-medium ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                    Workspace Manager
                  </span>
                </button>

                {/* Action Icons */}
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-sm mr-3">{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</span>
                  
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