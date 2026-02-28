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
import { cn, formatPercent } from '@/lib/utils';
import { calculateLocalHLStats as calculateLocalHLStatsUtil } from '@/utils/calculateCategoryStats';
import type { LocalHLStats } from '@/types/dashboard';
import { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { useDarkMode } from '@/hooks/useDarkMode';

/** English labels for local H/L categories (trading-related) */
export const LOCAL_HL_LABELS = {
  liquidated: 'Liquidated',
  notLiquidated: 'Not liquidated',
} as const;

export interface LocalHLStatisticsCardProps {
  localHLStats: LocalHLStats;
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate local H/L statistics from trades array
 * @param trades - Array of trades to compute stats from
 * @returns LocalHLStats object with liquidated and notLiquidated stats
 */
export function calculateLocalHLStats(trades: Trade[]): LocalHLStats {
  return calculateLocalHLStatsUtil(trades);
}

interface PieDatum {
  name: string;
  value: number;
  percentage: number;
  color: PieColor;
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number;
  winRateWithBE: number;
}

type PieColor = 'teal' | 'amber';
const LOCAL_HL_COLORS: PieColor[] = ['teal', 'amber'];

/**
 * Convert local H/L stats to chart data format (English labels)
 * @param localHLStats - LocalHLStats object with liquidated and notLiquidated stats
 * @param includeTotalTrades - If true, includes totalTrades in the result (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertLocalHLStatsToChartData(
  localHLStats: LocalHLStats,
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  const liquidated = localHLStats.liquidated;
  const notLiq = localHLStats.notLiquidated;
  const liquidatedData: TradeStatDatum = {
    category: LOCAL_HL_LABELS.liquidated,
    wins: liquidated.wins,
    losses: liquidated.losses,
    breakEven: liquidated.breakEven ?? 0,
    winRate: liquidated.winRate,
    winRateWithBE: liquidated.winRateWithBE,
    totalTrades: liquidated.total ?? (liquidated.wins + liquidated.losses + (liquidated.breakEven ?? 0)),
  };

  const notLiquidatedData: TradeStatDatum = {
    category: LOCAL_HL_LABELS.notLiquidated,
    wins: notLiq.wins,
    losses: notLiq.losses,
    breakEven: notLiq.breakEven ?? 0,
    winRate: notLiq.winRate,
    winRateWithBE: notLiq.winRateWithBE,
    totalTrades: notLiq.total ?? (notLiq.wins + notLiq.losses + (notLiq.breakEven ?? 0)),
  };

  return [liquidatedData, notLiquidatedData];
}

/**
 * Convert filtered local H/L stats to chart data format (includes totalTrades, English labels)
 */
export function convertFilteredLocalHLStatsToChartData(localHLStats: LocalHLStats): TradeStatDatum[] {
  return convertLocalHLStatsToChartData(localHLStats, true);
}

export const LocalHLStatisticsCard: React.FC<LocalHLStatisticsCardProps> = React.memo(
  function LocalHLStatisticsCard({ localHLStats, isLoading: externalLoading, includeTotalTrades = false }) {
    const { mounted, isDark } = useDarkMode();
    const [isLoading, setIsLoading] = useState(true);


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

    const statsList = [
      { key: 'liquidated' as const, stat: localHLStats.liquidated, label: LOCAL_HL_LABELS.liquidated },
      { key: 'notLiquidated' as const, stat: localHLStats.notLiquidated, label: LOCAL_HL_LABELS.notLiquidated },
    ];

    // Use stat.total so total matches Executed & Non-Executed card (every trade in the same tradesToUse)
    const totalTrades = statsList.reduce(
      (sum, { stat }) => sum + (stat.total ?? (stat.wins ?? 0) + (stat.losses ?? 0) + (stat.breakEven ?? 0)),
      0
    );

    const pieDataRaw: PieDatum[] = statsList.map(({ stat, label }, index) => {
      const value = stat.total ?? (stat.wins ?? 0) + (stat.losses ?? 0) + (stat.breakEven ?? 0);
      return {
        name: label,
        value,
        percentage: totalTrades > 0 ? (value / totalTrades) * 100 : 0,
        color: LOCAL_HL_COLORS[index % LOCAL_HL_COLORS.length],
        wins: stat.wins ?? 0,
        losses: stat.losses ?? 0,
        breakEven: stat.breakEven ?? 0,
        winRate: stat.winRate ?? 0,
        winRateWithBE: stat.winRateWithBE ?? 0,
      };
    });
    const pieData = pieDataRaw.filter((item) => item.value > 0);

    const legendItems: { name: string; value: number; color: PieColor }[] = [
      { name: LOCAL_HL_LABELS.liquidated, value: pieDataRaw[0]?.value ?? 0, color: 'teal' },
      { name: LOCAL_HL_LABELS.notLiquidated, value: pieDataRaw[1]?.value ?? 0, color: 'amber' },
    ];

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: PieDatum }[] }) => {
      if (!active || !payload?.length) return null;

      const data = payload[0].payload;
      const colorMap: Record<string, { dot: string }> = {
        teal: { dot: 'bg-teal-500 dark:bg-teal-400 ring-teal-200/50 dark:ring-teal-500/30' },
        amber: { dot: 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30' },
      };
      const colors = colorMap[data.color] ?? colorMap.teal;
      const wins = data.wins ?? 0;
      const losses = data.losses ?? 0;
      const breakEven = data.breakEven ?? 0;
      const winRate = data.winRate ?? 0;
      const winRateWithBE = data.winRateWithBE ?? 0;

      return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-50">
          <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full shadow-sm ring-2', colors.dot)} />
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {data.name} — {data.percentage.toFixed(1)}% ({data.value} {data.value === 1 ? 'trade' : 'trades'})
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{wins}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{losses}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Break Even</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{breakEven}</span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate</span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {formatPercent(winRate)}%
                  <span className="text-slate-500 dark:text-slate-400 text-sm ml-1 font-medium">
                    ({formatPercent(winRateWithBE)}% w/BE)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Local H/L Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              trades based on local high/low status
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
              Local H/L Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Trades based on local high/low status
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                No trades in this period.
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    const legendColors: Record<string, string> = {
      teal: 'text-teal-600 dark:text-teal-400',
      amber: 'text-amber-600 dark:text-amber-400',
    };

    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Local H/L Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Trades based on local high/low status
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <div className="w-full h-full max-h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="localHLGrad0" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
                      <stop offset="50%" stopColor="#0d9488" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="localHLGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="50%" stopColor="#d97706" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#b45309" stopOpacity={0.9} />
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
                    {pieData.map((entry, index) => {
                      const gradientId = `localHLGrad${index}`;
                      return <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} stroke="none" />;
                    })}
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
          <div className="w-full px-4 pt-4 mt-2">
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {legendItems.map((entry, index) => (
                <React.Fragment key={entry.name}>
                  {index > 0 && <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />}
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{entry.name}</div>
                    <div className={cn('text-lg font-bold', legendColors[entry.color] ?? 'text-slate-700 dark:text-slate-300')}>
                      {entry.value}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
