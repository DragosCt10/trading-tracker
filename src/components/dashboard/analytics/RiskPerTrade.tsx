'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, ChevronRight } from 'lucide-react';
import { formatPercent } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';

export type RiskStats = {
  total: number;
  wins: number;
  losses: number;
  breakEven: number;
  beWins: number;
  beLosses: number;
  winrate: number;
  winrateWithBE: number;
};

/** Key is e.g. risk025, risk03, risk1. Backend can add more. */
export type RiskAnalysis = Record<string, RiskStats>;

/**
 * Parse risk key (e.g. risk025, risk03, risk1) to percentage for label and sort.
 * @param key - The risk key string (e.g., "risk025", "risk03", "risk1")
 * @returns The parsed percentage number or null if invalid
 */
export function parseRiskKey(key: string): number | null {
  const match = key.match(/^risk(.+)$/i);
  if (!match) return null;
  const suffix = match[1];
  const num = parseInt(suffix, 10);
  if (Number.isNaN(num) || num < 0) return null;
  if (suffix.length === 1) return num;       // risk1 -> 1
  if (suffix.length === 2) return num / 10;  // risk03 -> 0.3
  return num / 100;                          // risk025 -> 0.25
}

interface RiskPerTradeProps {
  allTradesRiskStats: RiskAnalysis | null;
  className?: string;
}

const RiskPerTrade: React.FC<RiskPerTradeProps> = ({
  allTradesRiskStats,
  className = '',
}) => {
  const { isDark } = useDarkMode();
  const scrollRef = useRef<HTMLDivElement>(null);


  const visibleRiskLevels = React.useMemo(() => {
    if (!allTradesRiskStats || typeof allTradesRiskStats !== 'object') return [];
    return Object.entries(allTradesRiskStats)
      .filter(([, stats]) => stats && stats.total > 0)
      .map(([key, stats]) => {
        const percent = parseRiskKey(key);
        const percentNum = percent ?? 0;
        const label = `${percentNum}% Risk`;
        return { key, label, stats, percentNum };
      })
      .sort((a, b) => a.percentNum - b.percentNum);
  }, [allTradesRiskStats]);

  const isScrollable = visibleRiskLevels.length > 3;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);


  if (!mounted) return null;

  const GRID_COLS = 3;
  const extraCardsNeeded =
    !isScrollable && visibleRiskLevels.length > 0 && visibleRiskLevels.length % GRID_COLS !== 0
      ? GRID_COLS - (visibleRiskLevels.length % GRID_COLS)
      : 0;

  return (
    <Card
      className={`col-span-3 relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm ${className}`}
    >
      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Risk Per Trade
          </CardTitle>
          <TooltipProvider>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none shrink-0"
                  aria-label="Risk Per Trade Info"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                className="w-72 text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100"
                sideOffset={6}
              >
                {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
                <div className="relative">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                    Risk Per Trade
                  </div>
                  <p className="text-slate-400 dark:text-slate-300 text-xs sm:text-sm">
                    Trades grouped by risk %. Win Rate uses only wins &amp; losses.
                    Win Rate w/BE adds BE trades to the denominator.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {visibleRiskLevels.length === 0 ? (
          <div className="flex flex-col justify-center items-center w-full min-h-[200px] py-8">
            <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
              No trades found
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
              There are no trades to display for this category yet. Start trading to see your statistics here!
            </div>
          </div>
        ) : isScrollable ? (
          <div className="relative">
            {/* Scroll hint label */}
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mb-3">
              <ChevronRight className="h-3 w-3" />
              <span>Scroll lateral to see all risk levels</span>
            </div>

            {/* Scroll container */}
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-3 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {visibleRiskLevels.map(({ key, label, stats }) => (
                <Card
                  key={key}
                  className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm p-4 flex flex-col justify-between shadow-none rounded-2xl shrink-0 w-[calc((100%-2rem)/3)]"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {label}
                    </h4>
                    <span className="text-xs font-medium px-2.5 py-1 bg-slate-100/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-full border border-slate-200/60 dark:border-slate-600/50">
                      {stats.total} trades
                    </span>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Wins</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stats.wins}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Losses</span>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{stats.losses}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Break Even</span>
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-300">{stats.breakEven}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-slate-200/60 dark:border-slate-700/50">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Win Rate</span>
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {formatPercent(stats.winrate)}%
                        <span className="text-slate-500 dark:text-slate-400 text-sm ml-1 font-medium">
                          ({formatPercent(stats.winrateWithBE)}% w/BE)
                        </span>
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {visibleRiskLevels.map(({ key, label, stats }) => (
              <Card
                key={key}
                className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm p-4 flex flex-col justify-between shadow-none rounded-2xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {label}
                    </h4>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 bg-slate-100/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-full border border-slate-200/60 dark:border-slate-600/50">
                    {stats.total} trades
                  </span>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Wins</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stats.wins}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Losses</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{stats.losses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Break Even</span>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-300">{stats.breakEven}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-slate-200/60 dark:border-slate-700/50">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Win Rate</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatPercent(stats.winrate)}%
                      <span className="text-slate-500 dark:text-slate-400 text-sm ml-1 font-medium">
                        ({formatPercent(stats.winrateWithBE)}% w/BE)
                      </span>
                    </span>
                  </div>
                </div>
              </Card>
            ))}
            {Array.from({ length: extraCardsNeeded }).map((_, idx) => (
              <Card
                key={`risk-empty-${idx}`}
                className="border border-dashed border-slate-200/60 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-800/30 p-4 flex flex-col items-center justify-center shadow-none rounded-2xl text-center"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No trades for this
                  <br />
                  risk level yet
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RiskPerTrade;

