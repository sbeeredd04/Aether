import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiInfo, FiAlertTriangle, FiDatabase, FiShield } from 'react-icons/fi';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'consent';
  title: string;
  message: string;
  duration?: number; // in milliseconds, 0 for persistent
  onClose?: (id: string) => void;
  onAccept?: () => void;
  onDecline?: () => void;
  autoClose?: boolean;
}

interface ToastManagerProps {
  toasts: ToastProps[];
  onRemoveToast: (id: string) => void;
}

export function Toast({ id, type, title, message, duration = 5000, onClose, onAccept, onDecline, autoClose = true }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0 && autoClose && type !== 'consent') {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, autoClose, type]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.(id);
    }, 300);
  };

  const handleAccept = () => {
    onAccept?.();
    handleClose();
  };

  const handleDecline = () => {
    onDecline?.();
    handleClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheck className="text-green-400" size={20} />;
      case 'error':
        return <FiAlertTriangle className="text-red-400" size={20} />;
      case 'warning':
        return <FiAlertTriangle className="text-yellow-400" size={20} />;
      case 'info':
        return <FiInfo className="text-blue-400" size={20} />;
      case 'consent':
        return <FiShield className="text-purple-400" size={20} />;
      default:
        return <FiInfo className="text-blue-400" size={20} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/50';
      case 'error':
        return 'border-red-500/50';
      case 'warning':
        return 'border-yellow-500/50';
      case 'info':
        return 'border-blue-500/50';
      case 'consent':
        return 'border-purple-500/50';
      default:
        return 'border-blue-500/50';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-900/30';
      case 'error':
        return 'bg-red-900/30';
      case 'warning':
        return 'bg-yellow-900/30';
      case 'info':
        return 'bg-blue-900/30';
      case 'consent':
        return 'bg-purple-900/30';
      default:
        return 'bg-blue-900/30';
    }
  };

  return (
    <div
      className={`
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        transform transition-all duration-300 ease-out
        mb-3 max-w-md w-full
        ${getBackgroundColor()} backdrop-blur-md border ${getBorderColor()}
        rounded-xl shadow-xl p-4
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-1">
                {title}
              </h4>
              <p className="text-sm text-white/80 leading-relaxed">
                {message}
              </p>
            </div>
            
            {type !== 'consent' && (
              <button
                onClick={handleClose}
                className="flex-shrink-0 ml-2 text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
          
          {type === 'consent' && (onAccept || onDecline) && (
            <div className="flex items-center gap-2 mt-4">
              {onAccept && (
                <button
                  onClick={handleAccept}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <FiCheck size={16} />
                  Accept
                </button>
              )}
              {onDecline && (
                <button
                  onClick={handleDecline}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <FiX size={16} />
                  Decline
                </button>
              )}
              <div className="flex items-center gap-1 text-xs text-white/60 ml-2">
                <FiShield size={12} />
                Privacy Protected
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onRemoveToast }: ToastManagerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-md">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onRemoveToast}
        />
      ))}
    </div>
  );
}

// Global toast manager instance
let globalToastManager: {
  addToast: (toast: Omit<ToastProps, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
} | null = null;

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  const showSuccess = (title: string, message: string, duration?: number) => {
    return addToast({ type: 'success', title, message, duration });
  };

  const showError = (title: string, message: string, duration?: number) => {
    return addToast({ type: 'error', title, message, duration });
  };

  const showWarning = (title: string, message: string, duration?: number) => {
    return addToast({ type: 'warning', title, message, duration });
  };

  const showInfo = (title: string, message: string, duration?: number) => {
    return addToast({ type: 'info', title, message, duration });
  };

  const showConsent = (title: string, message: string, onAccept: () => void, onDecline: () => void) => {
    return addToast({ 
      type: 'consent', 
      title, 
      message, 
      duration: 0, 
      autoClose: false,
      onAccept,
      onDecline
    });
  };

  // Set global reference
  useEffect(() => {
    globalToastManager = {
      addToast,
      removeToast,
      clearAllToasts
    };

    return () => {
      globalToastManager = null;
    };
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConsent
  };
}

// Global toast functions for use outside of React components
export const globalToast = {
  success: (title: string, message: string, duration?: number) => {
    if (globalToastManager) {
      return globalToastManager.addToast({ type: 'success', title, message, duration });
    }
    console.log(`SUCCESS: ${title} - ${message}`);
    return '';
  },
  error: (title: string, message: string, duration?: number) => {
    if (globalToastManager) {
      return globalToastManager.addToast({ type: 'error', title, message, duration });
    }
    console.error(`ERROR: ${title} - ${message}`);
    return '';
  },
  warning: (title: string, message: string, duration?: number) => {
    if (globalToastManager) {
      return globalToastManager.addToast({ type: 'warning', title, message, duration });
    }
    console.warn(`WARNING: ${title} - ${message}`);
    return '';
  },
  info: (title: string, message: string, duration?: number) => {
    if (globalToastManager) {
      return globalToastManager.addToast({ type: 'info', title, message, duration });
    }
    console.info(`INFO: ${title} - ${message}`);
    return '';
  }
}; 