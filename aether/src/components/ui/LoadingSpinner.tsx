import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  showText?: boolean;
  text?: string;
}

export default function LoadingSpinner({ 
  size = 64, 
  className = '', 
  showText = false, 
  text = 'Loading...' 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 512 512" 
          className="animate-spin"
          style={{ animationDuration: '3s' }}
        >
          {/* Define a metallic gradient for the strokes */}
          <defs>
            <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF" stopOpacity="1"/>
              <stop offset="50%" stopColor="#AAA" stopOpacity="1"/>
              <stop offset="100%" stopColor="#FFF" stopOpacity="1"/>
            </linearGradient>
            <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8"/>
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1"/>
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8"/>
            </linearGradient>
          </defs>

          {/* First ellipse, rotated 45° - with animation */}
          <ellipse
            cx="256" 
            cy="256" 
            rx="180" 
            ry="100"
            fill="none"
            stroke="url(#pulseGrad)"
            strokeWidth="20"
            strokeLinecap="round"
            transform="rotate(45 256 256)"
            strokeDasharray="1130"
            strokeDashoffset="1130"
            className="animate-draw-path"
          />

          {/* Second ellipse, rotated -45° - with delayed animation */}
          <ellipse
            cx="256" 
            cy="256" 
            rx="180" 
            ry="100"
            fill="none"
            stroke="url(#metalGrad)"
            strokeWidth="20"
            strokeLinecap="round"
            transform="rotate(-45 256 256)"
            strokeDasharray="1130"
            strokeDashoffset="1130"
            className="animate-draw-path-delayed"
          />
        </svg>
        
        {/* Pulsing center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {showText && (
        <div className="mt-4 text-white/80 text-sm font-medium animate-pulse">
          {text}
        </div>
      )}
      
      <style jsx>{`
        @keyframes draw-path {
          0% {
            stroke-dashoffset: 1130;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        
        @keyframes draw-path-delayed {
          0%, 30% {
            stroke-dashoffset: 1130;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        
        .animate-draw-path {
          animation: draw-path 2s ease-in-out infinite;
        }
        
        .animate-draw-path-delayed {
          animation: draw-path-delayed 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
} 