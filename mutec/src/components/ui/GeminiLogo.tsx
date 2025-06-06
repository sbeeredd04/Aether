import React from 'react';

interface GeminiLogoProps {
  size?: number;
  className?: string;
  title?: string;
}

// Simple Gemini star logo SVG (customizable)
const GeminiLogo: React.FC<GeminiLogoProps> = ({ size = 28, className = '', title = 'Gemini Model' }) => (
  <span title={title} style={{ display: 'inline-flex', alignItems: 'center' }}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 0 6px #a855f7)' }}
    >
      <circle cx="16" cy="16" r="15" fill="#1a1a2e" stroke="#a855f7" strokeWidth="2" />
      <path
        d="M10 10 Q16 4 22 10 Q16 16 10 10 M10 22 Q16 28 22 22 Q16 16 10 22"
        stroke="#a855f7"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.5" fill="#a855f7" />
    </svg>
  </span>
);

export default GeminiLogo; 