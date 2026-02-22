'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trade } from '@/types/trade';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { cn } from '@/lib/utils';
import { isLocalHighLowLiquidated } from '@/utils/calculateCategoryStats';
import { useDarkMode } from '@/hooks/useDarkMode';

export interface LocalHLBEStatisticsCardProps {
  trades: Trade[];
  isLoading?: boolean;
}

/**
 * Compute Local H/L & BE stats from trades (trades that are both Local High/Low liquidated and Break Even)
 */
function getLocalHLBEStats(trades: Trade[]) {
  const liquidatedBETrades = trades.filter(
    (t) => isLocalHighLowLiquidated(t.local_high_low) && t.break_even,
  );
  const beWins = liquidatedBETrades.filter((t) => t.trade_outcome === 'Win').length;
  const beLosses = liquidatedBETrades.filter((t) => t.trade_outcome === 'Lose').length;
  const totalTrades = liquidatedBETrades.length;
  const executedCount = beWins + beLosses;
  const winRate = executedCount > 0 ? (beWins / executedCount) * 100 : 0;
  const winRateWithBE = winRate;

  return {
    totalTrades,
    wins: 0,
    losses: 0,
    beWins,
    beLosses,
    winRate,
    winRateWithBE,
  };
}

const LEGEND_LABEL = 'Local H/L + BE';

export const LocalHLBEStatisticsCard: React.FC<LocalHLBEStatisticsCardProps> = React.memo(
  function LocalHLBEStatisticsCard({ trades, isLoading: externalLoading }) {
    const { mounted, isDark } = useDarkMode();
    const [isLoading, setIsLoading] = useState(true);
    const [isSmallScreen, setIsSmallScreen] = useState(false);


    useEffect(() => {
      const checkSmall = () => setIsSmallScreen(typeof window !== 'undefined' && window.innerWidth < 640);
      checkSmall();
      window.addEventListener('resize', checkSmall);
      return () => window.removeEventListener('resize', checkSmall);
    }, []);

    useEffect(() => {
      if (mounted) {
        if (externalLoading !== undefined) {
          if (externalLoading) {
            setIsLoading(true);
          } else {
            const timer = setTimeout(() => setIsLoading(false), 600);
            return () => clearTimeout(timer);
          }
        } else {
          const timer = setTimeout(() => setIsLoading(false), 1000);
          return () => clearTimeout(timer);
        }
      }
    }, [mounted, externalLoading]);

    const stats = getLocalHLBEStats(trades);
    const totalTrades = stats.totalTrades;
    const pieData = totalTrades > 0 ? [{ name: LEGEND_LABEL, value: totalTrades }] : [];

    const CustomTooltip = ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: { payload: { name: string; value: number } }[];
    }) => {
      if (!active || !payload?.length) return null;
      if (isSmallScreen) {
        return (
          <div className="relative overflow-hidden rounded-xl p-4 border shadow-lg shadow-slate-900/5 dark:shadow-black/40 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200/60 dark:border-slate-700/60">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-blue-500/5 rounded-xl" />
            <div className="relative flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full shadow-sm ring-2 bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30" />
                <div className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {LEGEND_LABEL} ({totalTrades} {totalTrades === 1 ? 'TRADE' : 'TRADES'})
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins:</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.beWins}
                    {stats.beWins > 0 && (
                      <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">(BE)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses:</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                    {stats.beLosses}
                    {stats.beLosses > 0 && (
                      <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">(BE)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate:</span>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    {stats.winRate.toFixed(2)}%
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate (w/ BE):</span>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    {stats.winRateWithBE.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-md">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {LEGEND_LABEL} · {totalTrades} {totalTrades === 1 ? 'trade' : 'trades'}
          </div>
        </div>
      );
    };

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Local H/L & BE Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Analysis of trades marked as both Local High/Low and Break Even
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (totalTrades === 0 || pieData.length === 0) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Local H/L & BE Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Analysis of trades marked as both Local High/Low and Break Even
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                There are no trades to display for this category yet. Start trading to see your statistics here!
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Local H/L & BE Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Analysis of trades marked as both Local High/Low and Break Even
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <div className="w-full h-full max-h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="localHLBEGrad0" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="50%" stopColor="#2563eb" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    cornerRadius={5}
                    dataKey="value"
                  >
                    <Cell key="cell-0" fill="url(#localHLBEGrad0)" stroke="none" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
                      backdropFilter: 'blur(16px)',
                      border: isDark
                        ? '1px solid rgba(51, 65, 85, 0.6)'
                        : '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '16px',
                      padding: '14px 18px',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: 14,
                      boxShadow: isDark
                        ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                        : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                      minWidth: '160px',
                    }}
                    wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                    cursor={{ fill: 'transparent', radius: 8 }}
                    content={<CustomTooltip />}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
                <div
                  className={cn(
                    'font-bold text-slate-900 dark:text-slate-100',
                    totalTrades >= 1000 ? 'text-2xl' : totalTrades >= 100 ? 'text-2xl' : 'text-3xl'
                  )}
                >
                  {totalTrades}
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">
                  Total Trades
                </div>
              </div>
            </div>
          </div>
          <div className="w-full px-4 pt-4 mt-2 hidden sm:block">
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div className="flex flex-col items-center min-w-[4rem]">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Wins</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.beWins}
                  {stats.beWins > 0 && (
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">BE</span>
                  )}
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
              <div className="flex flex-col items-center min-w-[4rem]">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Losses</div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {stats.beLosses}
                  {stats.beLosses > 0 && (
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">BE</span>
                  )}
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
              <div className="flex flex-col items-center min-w-[4rem]">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Win Rate</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {stats.winRate.toFixed(2)}%
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
              <div className="flex flex-col items-center min-w-[4rem]">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Win Rate (w/ BE)</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {stats.winRateWithBE.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
