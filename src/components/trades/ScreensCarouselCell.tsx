'use client';

import { useMemo, useState } from 'react';
import type { Trade } from '@/types/trade';

export function ScreensCarouselCell({ trade }: { trade: Trade }) {
  const screens = useMemo(
    () => (trade.trade_screens ?? []).filter(Boolean),
    [trade.trade_screens]
  );
  const [activeIdx, setActiveIdx] = useState(0);

  if (screens.length === 0) {
    return (
      <div className="w-28 h-16 rounded-lg bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500">
        No screen
      </div>
    );
  }

  const activeScreen = screens[activeIdx]!;
  const hasMultiple = screens.length > 1;

  return (
    <div className="relative w-32 h-20">
      <a
        href={activeScreen}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800/60 group"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeScreen}
          alt={`${trade.market} trade screen ${activeIdx + 1}`}
          className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />

        {hasMultiple && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full pointer-events-none select-none">
            {activeIdx + 1}/{screens.length}
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveIdx((i) => (i - 1 + screens.length) % screens.length);
              }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center"
              aria-label="Previous screen"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                className="w-3 h-3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveIdx((i) => (i + 1) % screens.length);
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center"
              aria-label="Next screen"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                className="w-3 h-3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}
      </a>
    </div>
  );
}
