import React, { useEffect } from 'react';
import { FiX, FiDownload, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import logger from '../utils/logger';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageTitle: string;
  imageAlt?: string;
}

export default function ImageModal({ 
  isOpen, 
  onClose, 
  imageSrc, 
  imageTitle, 
  imageAlt = 'Image' 
}: ImageModalProps) {
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
      // Reset zoom and position when modal opens
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
      
      logger.debug('ImageModal: Opened', { imageTitle, imageSrc: imageSrc.substring(0, 50) });
      
      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose, imageTitle, imageSrc]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      logger.debug('ImageModal: Closed via backdrop click');
      onClose();
    }
  };

  const handleDownload = () => {
    logger.info('ImageModal: Starting download', { imageTitle });
    
    try {
      const link = document.createElement('a');
      link.href = imageSrc;
      link.download = imageTitle.endsWith('.png') || imageTitle.endsWith('.jpg') || imageTitle.endsWith('.jpeg') 
        ? imageTitle 
        : `${imageTitle}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      logger.debug('ImageModal: Download initiated', { fileName: link.download });
    } catch (error) {
      logger.error('ImageModal: Download failed', { error, imageTitle });
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div className="relative z-10 max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-md rounded-t-lg border border-white/10">
          <h3 className="text-white font-medium truncate mr-4">
            {imageTitle}
          </h3>
          
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 
                         disabled:cursor-not-allowed text-white transition-colors"
              title="Zoom Out"
            >
              <FiZoomOut size={16} />
            </button>
            
            <span className="text-sm text-white/70 min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 5}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 
                         disabled:cursor-not-allowed text-white transition-colors"
              title="Zoom In"
            >
              <FiZoomIn size={16} />
            </button>
            
            <div className="w-px h-6 bg-white/20 mx-1" />
            
            {/* Reset View */}
            <button
              onClick={resetView}
              className="px-3 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 
                         text-white transition-colors"
              title="Reset View"
            >
              Reset
            </button>
            
            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Download Image"
            >
              <FiDownload size={16} />
            </button>
            
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
        
        {/* Image Container */}
        <div className="relative bg-black/40 backdrop-blur-sm rounded-b-lg border-x border-b border-white/10 overflow-hidden">
          <div 
            className="relative max-w-[90vw] max-h-[80vh] overflow-auto"
            style={{ 
              cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            <img
              src={imageSrc}
              alt={imageAlt}
              className="block max-w-none transition-transform origin-center"
              style={{
                transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                maxWidth: zoomLevel === 1 ? '90vw' : 'none',
                maxHeight: zoomLevel === 1 ? '80vh' : 'none'
              }}
              onMouseDown={handleMouseDown}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
          
          {/* Loading placeholder for slow images */}
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </div>
        
        {/* Instructions */}
        {zoomLevel > 1 && (
          <div className="mt-2 text-center text-sm text-white/60">
            Click and drag to pan • Scroll to zoom • ESC to close
          </div>
        )}
      </div>
    </div>
  );
} 