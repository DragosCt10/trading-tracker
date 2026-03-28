'use client';

// src/components/dashboard/ai-vision/AiVisionLoadingOverlay.tsx
// Triggered on refetch (filter change), NOT on initial load (use AiVisionSkeleton for that).
// Minimum display time: 400ms — enforced so fast local data doesn't flash the overlay.
// All setState calls happen inside timer callbacks to satisfy react-hooks/set-state-in-effect.
import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

const MIN_DISPLAY_MS = 400;

interface AiVisionLoadingOverlayProps {
  isVisible: boolean;
}

export function AiVisionLoadingOverlay({ isVisible }: AiVisionLoadingOverlayProps) {
  const [shouldShow, setShouldShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showStartRef = useRef<number>(0);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (isVisible) {
      showStartRef.current = Date.now();
      // Show via a 0ms callback — satisfies the lint rule (setState in callback, not effect body)
      timerRef.current = setTimeout(() => setShouldShow(true), 0);
    } else {
      // Enforce MIN_DISPLAY_MS before hiding
      const elapsed = Date.now() - showStartRef.current;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      timerRef.current = setTimeout(() => setShouldShow(false), remaining);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVisible]);

  if (!shouldShow) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center"
      aria-live="polite"
      aria-label="AI Vision is analyzing your trades"
    >
      <div className="flex flex-col items-center gap-4 select-none">
        <div className="animate-[pulse_1.5s_ease-in-out_infinite]">
          <Sparkles className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
        </div>

        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 tracking-wide">
          AI Vision is analyzing your trades...
        </p>

        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 150}ms infinite` }}
            />
          ))}
        </div>

        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full themed-btn-primary rounded-full"
            style={{
              animation: 'aiVisionProgress 600ms ease-in-out infinite',
              width: '40%',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes aiVisionProgress {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
