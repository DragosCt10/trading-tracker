'use client';

import React from 'react';

interface BouncePulseProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BouncePulse: React.FC<BouncePulseProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  // Bar heights in pixels: medium, tall-medium, tallest, tall-medium, medium
  const barHeights = {
    sm: [20, 28, 36, 28, 20],
    md: [24, 32, 40, 32, 24],
    lg: [28, 36, 44, 36, 28],
  };

  const heights = barHeights[size];
  const gap = size === 'sm' ? 'gap-1.5' : size === 'md' ? 'gap-2' : 'gap-2.5';
  const containerHeight = size === 'sm' ? 'h-12' : size === 'md' ? 'h-14' : 'h-16';
  const widthPx = size === 'sm' ? 7 : size === 'md' ? 8 : 9;

  return (
    <div 
      className={`flex items-end justify-center ${gap} ${containerHeight} ${className}`} 
      aria-hidden="true"
      style={{ height: containerHeight === 'h-12' ? '48px' : containerHeight === 'h-14' ? '56px' : '64px' }}
    >
      {heights.map((height, index) => (
        <div
          key={index}
          className="rounded-full bg-gradient-to-t from-purple-500 via-violet-500 to-fuchsia-500 dark:from-purple-400 dark:via-violet-400 dark:to-fuchsia-400 animate-bounce-pulse flex-shrink-0 shadow-sm shadow-purple-500/30 dark:shadow-purple-400/20"
          style={{
            height: `${height}px`,
            minHeight: `${height}px`,
            width: `${widthPx}px`,
            animationDelay: `${index * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};
