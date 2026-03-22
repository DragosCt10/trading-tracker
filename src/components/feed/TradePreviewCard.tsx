'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TradeSnapshot } from '@/types/social';
import { formatPercent } from '@/lib/utils';
import { formatTradeEntryDate } from '@/utils/feedDateFormat';

interface TradePreviewCardProps {
  snapshot: TradeSnapshot;
}

const OUTCOME_BADGE_CLASS: Record<string, string> = {
  win:  'bg-emerald-500 dark:bg-emerald-500 text-white shadow-none border-none',
  loss: 'bg-rose-500 dark:bg-rose-500 text-white shadow-none border-none',
  be:   'bg-slate-500 dark:bg-slate-500 text-white shadow-none border-none',
};


export default function TradePreviewCard({ snapshot }: TradePreviewCardProps) {
  const [screenIndex, setScreenIndex] = useState(0);
  const screens = snapshot.screens ?? [];

  const badgeClass = OUTCOME_BADGE_CLASS[snapshot.outcome] ?? 'bg-slate-500 dark:bg-slate-500 text-white shadow-none border-none';

  const outcomeLabel = snapshot.outcome === 'be' ? 'BE' : snapshot.outcome.toUpperCase();

  const directionIcon =
    snapshot.direction === 'long'  ? <TrendingUp  className="w-3.5 h-3.5" /> :
    snapshot.direction === 'short' ? <TrendingDown className="w-3.5 h-3.5" /> :
                                     <Minus        className="w-3.5 h-3.5" />;

  const directionLabel =
    snapshot.direction.charAt(0).toUpperCase() + snapshot.direction.slice(1);

  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-transparent shadow-none overflow-hidden">
      {/* Header — two-zone */}
      <div className="flex items-start justify-between gap-4 px-4 py-3">
        {/* Left: market · direction */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">
              {snapshot.market}
            </span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm">
              {directionIcon}
              {directionLabel}
            </span>
          </div>

          {/* Stat strip */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-transparent border border-slate-300/60 dark:border-slate-600/50 text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
              RR <span className="text-slate-900 dark:text-slate-100">{formatPercent(snapshot.rr)}R</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-transparent border border-slate-300/60 dark:border-slate-600/50 text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
              Risk <span className="text-slate-900 dark:text-slate-100">{formatPercent(snapshot.riskPct)}%</span>
            </span>
            <span className="text-[11px] text-slate-500" suppressHydrationWarning>
              {formatTradeEntryDate(snapshot.entryDate)}
            </span>
          </div>
        </div>

        {/* Right: outcome badge */}
        <Badge className={`shrink-0 ${badgeClass}`}>
          {outcomeLabel}
        </Badge>
      </div>

      {/* Screenshot carousel */}
      {screens.length > 0 && (
        <div className="relative group h-52 overflow-hidden border-t border-slate-200/70 dark:border-slate-700/40">
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
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wide select-none">
              {screens[screenIndex].tf}
            </span>
          )}

          {/* Counter */}
          {screens.length > 1 && (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium select-none">
              {screenIndex + 1}/{screens.length}
            </span>
          )}

          {/* Navigation arrows */}
          {screens.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setScreenIndex((i) => Math.max(0, i - 1)); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white disabled:opacity-30"
                disabled={screenIndex === 0}
                aria-label="Previous screenshot"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setScreenIndex((i) => Math.min(screens.length - 1, i + 1)); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white disabled:opacity-30"
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
