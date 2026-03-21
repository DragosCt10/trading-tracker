'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TradeSnapshot } from '@/types/social';

interface TradePreviewCardProps {
  snapshot: TradeSnapshot;
}

const OUTCOME_BORDER: Record<string, string> = {
  win:  'border-l-green-500',
  loss: 'border-l-red-500',
  be:   'border-l-amber-500',
};

const OUTCOME_BADGE: Record<string, string> = {
  win:  'bg-green-500/15 text-green-400',
  loss: 'bg-red-500/15 text-red-400',
  be:   'bg-amber-500/15 text-amber-400',
};

export default function TradePreviewCard({ snapshot }: TradePreviewCardProps) {
  const [screenIndex, setScreenIndex] = useState(0);
  const screens = snapshot.screens ?? [];

  const borderClass = OUTCOME_BORDER[snapshot.outcome] ?? 'border-l-slate-500';
  const badgeClass  = OUTCOME_BADGE[snapshot.outcome]  ?? 'bg-slate-500/15 text-slate-400';

  const outcomeLabel = snapshot.outcome === 'be' ? 'B/E' : snapshot.outcome.toUpperCase();
  const directionIcon =
    snapshot.direction === 'long'  ? <TrendingUp  className="w-3 h-3" /> :
    snapshot.direction === 'short' ? <TrendingDown className="w-3 h-3" /> :
                                     <Minus        className="w-3 h-3" />;

  const pnlSign  = snapshot.pnl >= 0 ? '+' : '';
  const pnlColor = snapshot.pnl >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div
      className={`rounded-xl border-l-[3px] ${borderClass} bg-slate-900/60 dark:bg-slate-950/60 overflow-hidden`}
    >
      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-xs">
        <span className="font-semibold text-slate-200">{snapshot.market}</span>

        <span className="flex items-center gap-1 text-slate-400 capitalize">
          {directionIcon}
          {snapshot.direction}
        </span>

        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide ${badgeClass}`}>
          {outcomeLabel}
        </span>

        <span className="text-slate-400">
          <span className="text-slate-500">RR </span>
          <span className="text-slate-200">{snapshot.rr.toFixed(2)}R</span>
        </span>

        <span className="text-slate-400">
          <span className="text-slate-500">Risk </span>
          <span className="text-slate-200">{snapshot.riskPct.toFixed(2)}%</span>
        </span>

        <span className={`font-semibold ${pnlColor}`}>
          {pnlSign}{snapshot.pnl.toFixed(2)} {snapshot.currency}
        </span>

        <span className="ml-auto text-slate-500 text-[11px]">
          {new Date(snapshot.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Screenshot carousel */}
      {screens.length > 0 && (
        <div className="relative group h-40 bg-slate-950/60 overflow-hidden">
          <a
            href={screens[screenIndex].url}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screens[screenIndex].url}
              alt={`Chart screenshot ${screenIndex + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </a>

          {/* TF badge */}
          {screens[screenIndex].tf && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wide select-none">
              {screens[screenIndex].tf}
            </span>
          )}

          {/* Counter */}
          {screens.length > 1 && (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/55 backdrop-blur-sm text-white text-[10px] select-none">
              {screenIndex + 1}/{screens.length}
            </span>
          )}

          {/* Navigation arrows — visible on hover */}
          {screens.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setScreenIndex((i) => Math.max(0, i - 1)); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full bg-black/55 backdrop-blur-sm text-white disabled:opacity-30"
                disabled={screenIndex === 0}
                aria-label="Previous screenshot"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setScreenIndex((i) => Math.min(screens.length - 1, i + 1)); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full bg-black/55 backdrop-blur-sm text-white disabled:opacity-30"
                disabled={screenIndex === screens.length - 1}
                aria-label="Next screenshot"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
