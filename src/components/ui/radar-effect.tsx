'use client';

import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import React, { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';

export const Circle = ({
  className,
  children,
  idx,
  ...rest
}: {
  className?: string;
  children?: React.ReactNode;
  idx?: number;
  style?: React.CSSProperties;
}) => {
  return (
    <motion.div
      {...rest}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: (idx ?? 0) * 0.1, duration: 0.2 }}
      className={cn(
        'absolute inset-0 left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 transform rounded-full',
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const Radar = ({ className }: { className?: string }) => {
  const circles = new Array(8).fill(1);
  return (
    <div
      className={cn(
        'relative flex h-20 w-20 items-center justify-center rounded-full',
        className,
      )}
    >
      <style>{`
        @keyframes radar-spin {
          0%   { transform: rotate(0deg); }
          50%  { transform: rotate(180deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-radar-spin {
          animation: radar-spin 10s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-radar-spin { animation: none; }
        }
      `}</style>
      {/* Rotating sweep line */}
      <div
        style={{ transformOrigin: 'right center' }}
        className="animate-radar-spin absolute right-1/2 top-1/2 z-40 flex h-[5px] w-[400px] items-end justify-center overflow-hidden bg-transparent"
      >
        <div
          className="relative z-40 h-[1px] w-full"
          style={{
            background:
              'linear-gradient(to right, transparent, var(--tc-primary, #a855f7), transparent)',
          }}
        />
      </div>
      {/* Concentric circles */}
      {circles.map((_, idx) => (
        <Circle
          style={{
            height: `${(idx + 1) * 5}rem`,
            width: `${(idx + 1) * 5}rem`,
            border: `1px solid color-mix(in oklch, var(--tc-primary, #a855f7) ${Math.max(5, 20 - idx * 2)}%, transparent)`,
          }}
          key={`circle-${idx}`}
          idx={idx}
        />
      ))}
    </div>
  );
};

export const IconContainer = ({
  icon: Icon,
  text,
  delay,
  color,
}: {
  icon?: LucideIcon;
  text?: string;
  delay?: number;
  color?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 20 }}
      transition={{
        duration: 0.5,
        delay: delay ?? 0,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className="relative z-50 flex flex-col items-center justify-center space-y-2"
    >
      <div
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg"
        style={{
          background: color
            ? `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color} 70%, black))`
            : `linear-gradient(135deg, var(--tc-primary, #a855f7), var(--tc-accent, #8b5cf6))`,
          boxShadow: color
            ? `0 4px 20px ${color}40, 0 0 40px ${color}15`
            : '0 4px 20px color-mix(in oklch, var(--tc-primary) 25%, transparent)',
        }}
      >
        {Icon ? (
          <Icon className="h-6 w-6 text-white" />
        ) : (
          <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div className="hidden rounded-md px-2 py-1 md:block">
        <div className="text-center text-xs font-bold text-slate-500 dark:text-slate-400">
          {text || 'Feature'}
        </div>
      </div>
    </motion.div>
  );
};
