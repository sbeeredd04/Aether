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
        >
          {/* First ellipse, rotated 45° - with animation */}
          <ellipse
            cx="256" 
            cy="256" 
            rx="180" 
            ry="100"
            fill="none"
            stroke="#ffffff"
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
            stroke="#ffffff"
            strokeWidth="20"
            strokeLinecap="round"
            transform="rotate(-45 256 256)"
            strokeDasharray="1130"
            strokeDashoffset="1130"
            className="animate-draw-path-delayed"
          />
        </svg>
      </div>
      
      {showText && (
        <div className="mt-4 text-white/80 text-sm font-medium">
          {text}
        </div>
      )}
      
      <style jsx>{`
        @keyframes draw-path-continuous {
          0% {
            stroke-dashoffset: 1130;
            opacity: 0.3;
          }
          25% {
            opacity: 0.8;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          75% {
            opacity: 0.8;
          }
          100% {
            stroke-dashoffset: -1130;
            opacity: 0.3;
          }
        }
        
        @keyframes draw-path-delayed-continuous {
          0% {
            stroke-dashoffset: 1130;
            opacity: 0.2;
          }
          12.5% {
            opacity: 0.2;
          }
          37.5% {
            opacity: 0.6;
          }
          62.5% {
            stroke-dashoffset: 0;
            opacity: 0.8;
          }
          87.5% {
            opacity: 0.6;
          }
          100% {
            stroke-dashoffset: -1130;
            opacity: 0.2;
          }
        }
        
        .animate-draw-path {
          animation: draw-path-continuous 3s linear infinite;
        }
        
        .animate-draw-path-delayed {
          animation: draw-path-delayed-continuous 3s linear infinite;
        }
      `}</style>
    </div>
  );
} 