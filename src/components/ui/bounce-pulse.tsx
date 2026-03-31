'use client';

import React from 'react';

interface BouncePulseProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/** Theme-aware loading pulse. Uses --tc-primary so it follows light/dark and color theme. */
export const BouncePulse: React.FC<BouncePulseProps> = ({
  className = '',
  size = 'md',
}) => {
  const barHeights = {
    sm: [20, 28, 36, 28, 20],
    md: [24, 32, 40, 32, 24],
    lg: [28, 36, 44, 36, 28],
  };

  const heights = barHeights[size];
  const gap = size === 'sm' ? 'gap-1.5' : size === 'md' ? 'gap-2' : 'gap-2.5';
  const containerHeightPx = size === 'sm' ? 48 : size === 'md' ? 56 : 64;
  const widthPx = size === 'sm' ? 7 : size === 'md' ? 8 : 9;

  return (
    <div
      className={`flex items-end justify-center ${gap} ${className}`}
      aria-hidden="true"
      style={{ height: `${containerHeightPx}px` }}
    >
      {heights.map((height, index) => (
        <div
          key={index}
          className="animate-bounce-pulse flex-shrink-0 rounded-full"
          style={{
            height: `${height}px`,
            minHeight: `${height}px`,
            width: `${widthPx}px`,
            animationDelay: `${index * 0.1}s`,
            background: `linear-gradient(to top, var(--tc-primary, #8b5cf6), color-mix(in srgb, var(--tc-primary, #8b5cf6) 70%, transparent))`,
            boxShadow: '0 1px 2px 0 color-mix(in oklch, var(--tc-primary, #8b5cf6) 25%, transparent)',
          }}
        />
      ))}
    </div>
  );
};
