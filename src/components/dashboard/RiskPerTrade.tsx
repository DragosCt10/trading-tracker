'use client';

import React, { useState, useEffect } from 'react';
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
import { Shield, Info } from 'lucide-react';

type RiskStats = {
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
type RiskAnalysis = Record<string, RiskStats>;

/** Parse risk key (e.g. risk025, risk03, risk1) to percentage for label and sort. */
function parseRiskKey(key: string): number | null {
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
  const visibleRiskLevels = React.useMemo(() => {
    if (!allTradesRiskStats || typeof allTradesRiskStats !== 'object') return [];
    return Object.entries(allTradesRiskStats)
      .filter(([, stats]) => stats && stats.total > 0)
      .map(([key, stats]) => {
        const percent = parseRiskKey(key);
        const percentNum = percent ?? 0;
        const label = `${percentNum}% Risk`;
        const tooltip = `Trades risking ${percentNum}% of account. Shows total wins (with break-evens in parentheses), losses (with break-evens), and win rates.`;
        return { key, label, tooltip, stats, percentNum };
      })
      .sort((a, b) => a.percentNum - b.percentNum);
  }, [allTradesRiskStats]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const GRID_COLS = 3;
  const extraCardsNeeded =
    visibleRiskLevels.length === 0
      ? 0
      : visibleRiskLevels.length % GRID_COLS === 0
        ? 0
        : GRID_COLS - (visibleRiskLevels.length % GRID_COLS);

  return (
    <Card
      className={`col-span-3 relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br bg-slate-50/70 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm ${className}`}
    >
      <div className="relative p-8">
        {/* Header - same slick style as AccountOverviewCard */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-700/50 shadow-sm">
            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Risk Per Trade
            </CardTitle>
            <TooltipProvider>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-4 w-4 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none shrink-0"
                    aria-label="Risk Per Trade Info"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="w-72 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4"
                  sideOffset={6}
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                    Risk Per Trade
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Detailed breakdown of trades by risk percentage for the
                    current year, showing wins, losses, and win rates for each
                    risk level. Break-even (BE) trades are shown in parentheses.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {visibleRiskLevels.length === 0 ? (
            <Card
              className="col-span-full border border-dashed border-slate-200/60 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-800/30 p-8 flex flex-col items-center justify-center shadow-none rounded-2xl text-center min-h-[140px]"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No trades for this
                <br />
                risk level yet
              </p>
            </Card>
          ) : (
          <>
          {visibleRiskLevels.map(({ key, label, tooltip, stats }) => (
              <Card
                key={key}
                className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm p-4 flex flex-col justify-between shadow-none rounded-2xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {label}
                      </h4>
                      <TooltipProvider>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="p-0 m-0 bg-transparent border-0 align-middle leading-none outline-none focus:ring-0 inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              aria-label={`${label} Info`}
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="start"
                            className="w-72 text-sm bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 p-4"
                            sideOffset={6}
                          >
                            {tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  <span className="text-xs font-medium px-2.5 py-1 bg-slate-100/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-full border border-slate-200/60 dark:border-slate-600/50">
                    {stats.total} trades
                  </span>
                </div>

                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Wins</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {stats.wins}
                      <span className="text-slate-500 dark:text-slate-400 text-xs ml-1 font-normal">
                        ({stats.beWins} BE)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Losses</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {stats.losses}
                      <span className="text-slate-500 dark:text-slate-400 text-xs ml-1 font-normal">
                        ({stats.beLosses} BE)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-slate-200/60 dark:border-slate-700/50">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Win Rate</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {stats.winrate.toFixed(1)}%
                      <span className="text-slate-500 dark:text-slate-400 text-sm ml-1 font-medium">
                        ({stats.winrateWithBE.toFixed(1)}% w/BE)
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
          </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RiskPerTrade;

