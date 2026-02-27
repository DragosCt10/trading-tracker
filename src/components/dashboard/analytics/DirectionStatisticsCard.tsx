'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { cn } from '@/lib/utils';
import type { DirectionStats } from '@/types/dashboard';
import { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { useDarkMode } from '@/hooks/useDarkMode';

export interface DirectionStatisticsCardProps {
  directionStats: DirectionStats[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Convert direction stats to chart data format
 * @param directionStats - Array of direction statistics
 * @param includeTotalTrades - If true, includes totalTrades and calculates percentage from total (for filtered stats)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertDirectionStatsToChartData(
  directionStats: DirectionStats[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  const totalDirectionTrades = directionStats.reduce(
    (sum, stat) => sum + (stat.total ?? (stat.wins ?? 0) + (stat.losses ?? 0) + (stat.breakEven ?? 0)),
    0
  );

  return directionStats.map((stat) => {
    const wins = stat.wins ?? 0;
    const losses = stat.losses ?? 0;
    const breakEven = stat.breakEven ?? 0;
    const directionTotal = stat.total ?? (wins + losses + breakEven);
    const percentage =
      totalDirectionTrades > 0
        ? ((directionTotal / totalDirectionTrades) * 100).toFixed(1)
        : "0.0";

    const nonBE = wins + losses;
    const winRate = nonBE > 0 ? (wins / nonBE) * 100 : 0;
    const winRateWithBE = directionTotal > 0 ? (wins / directionTotal) * 100 : 0;

    const baseData: TradeStatDatum = {
      category: `${stat.direction} - ${percentage}%`,
      wins,
      losses,
      breakEven,
      winRate,
      winRateWithBE,
    };

    // Use total from stats which includes all trades (including non-executed)
    // This ensures the count shown in parentheses matches the actual number of trades in tradesToUse
    baseData.totalTrades = directionTotal;

    return baseData;
  });
}

/**
 * Convert filtered direction stats to chart data format (includes totalTrades and percentage)
 * @param directionStats - Array of direction statistics (may include total property)
 * @returns Array of TradeStatDatum for chart display
 */
export function convertFilteredDirectionStatsToChartData(directionStats: DirectionStats[]): TradeStatDatum[] {
  return convertDirectionStatsToChartData(directionStats, true);
}

export const DirectionStatisticsCard: React.FC<DirectionStatisticsCardProps> = React.memo(
  function DirectionStatisticsCard({ directionStats, isLoading: externalLoading }) {
    const { mounted } = useDarkMode();
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
      if (mounted) {
        if (externalLoading !== undefined) {
          if (externalLoading) {
            setIsLoading(true);
          } else {
            const timer = setTimeout(() => {
              setIsLoading(false);
            }, 600);
            return () => clearTimeout(timer);
          }
        } else {
          const timer = setTimeout(() => {
            setIsLoading(false);
          }, 1000);
          return () => clearTimeout(timer);
        }
      }
    }, [mounted, externalLoading]);

    // Calculate totals
    const totalTrades = directionStats.reduce(
      (sum, stat) => sum + (stat.total ?? (stat.wins ?? 0) + (stat.losses ?? 0) + (stat.breakEven ?? 0)),
      0
    );

    // Long and Short: count and BE only (breakEven from stats)
    const longStat = directionStats.find((stat) => stat.direction.toLowerCase() === 'long');
    const shortStat = directionStats.find((stat) => stat.direction.toLowerCase() === 'short');

    const longCount = longStat ? (longStat.total ?? (longStat.wins ?? 0) + (longStat.losses ?? 0)) : 0;
    const longBE = longStat?.breakEven ?? 0;
    const longBEPercentage = longCount > 0 ? (longBE / longCount) * 100 : 0;

    const shortCount = shortStat ? (shortStat.total ?? (shortStat.wins ?? 0) + (shortStat.losses ?? 0)) : 0;
    const shortBE = shortStat?.breakEven ?? 0;
    const shortBEPercentage = shortCount > 0 ? (shortBE / shortCount) * 100 : 0;

    // Prepare pie chart data - Long vs Short (wins, losses, breakEven, win rates from API)
    const pieData = directionStats
      .map((stat) => {
        const wins = stat.wins ?? 0;
        const losses = stat.losses ?? 0;
        const breakEven = stat.breakEven ?? 0;
        const total = stat.total ?? (wins + losses + breakEven);
        const percentage = totalTrades > 0 ? (total / totalTrades) * 100 : 0;
        const nonBE = wins + losses;
        const winRate = nonBE > 0 ? (wins / nonBE) * 100 : 0;
        const winRateWithBE = total > 0 ? (wins / total) * 100 : 0;
        return {
          name: stat.direction,
          value: total,
          percentage,
          color: stat.direction.toLowerCase() === 'long' ? 'blue' : 'purple',
          wins,
          losses,
          breakEven,
          winRate,
          winRateWithBE,
        };
      })
      .filter((item) => item.value > 0);

    const CustomTooltip = ({ active, payload }: any) => {
      if (!active || !payload || payload.length === 0) return null;

      const data = payload[0].payload;
      const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
        blue: {
          bg: 'bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-700',
          text: 'text-blue-600 dark:text-blue-400',
          dot: 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30',
        },
        purple: {
          bg: 'bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-700',
          text: 'text-purple-600 dark:text-purple-400',
          dot: 'bg-purple-500 dark:bg-purple-400 ring-purple-200/50 dark:ring-purple-500/30',
        },
      };

      const colors = colorMap[data.color] || colorMap.blue;
      const percentage = totalTrades > 0 ? (data.value / totalTrades) * 100 : 0;
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
              <div className={cn("h-2 w-2 rounded-full shadow-sm ring-2", colors.dot)}></div>
              <div className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {data.name} - {percentage.toFixed(1)}% - {data.value} {data.value === 1 ? 'trade' : 'trades'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {wins}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses</span>
                <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                  {losses}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Break Even</span>
                <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {breakEven}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate</span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {winRate.toFixed(1)}%
                  <span className="text-slate-500 dark:text-slate-400 text-sm ml-1 font-medium">
                    ({winRateWithBE.toFixed(1)}% w/BE)
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
              Long/Short Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on direction
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
              Long/Short Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades based on direction
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

    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Long/Short Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of trades based on direction
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          {/* Pie chart section - takes upper portion */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <div className="w-full h-full max-h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {/* Long gradient - blue */}
                    <linearGradient id="longDirection" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="50%" stopColor="#2563eb" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                    </linearGradient>
                    {/* Short gradient - purple */}
                    <linearGradient id="shortDirection" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                      <stop offset="50%" stopColor="#9333ea" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.9} />
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
                      const gradientId = entry.color === 'blue' ? 'longDirection' : 'shortDirection';
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={`url(#${gradientId})`}
                          stroke="none"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      boxShadow: 'none',
                      minWidth: '160px',
                    }}
                    wrapperStyle={{
                      outline: 'none',
                      zIndex: 1000,
                    }}
                    cursor={{ fill: 'transparent', radius: 8 }}
                    content={<CustomTooltip />}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center content - positioned in the middle of the pie chart */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
                <div className={`font-bold text-slate-900 dark:text-slate-100 ${
                  totalTrades >= 1000 ? 'text-2xl' : 
                  totalTrades >= 100 ? 'text-2xl' : 
                  'text-3xl'
                }`}>
                  {totalTrades}
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">
                  Total Trades
                </div>
              </div>
            </div>
          </div>
          {/* Stats labels - positioned below the pie chart */}
          <div className="w-full px-4 pt-4 mt-2">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Long
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {longCount}
                  {longBE > 0 && (
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">
                      ({longBEPercentage.toFixed(1)}% BE)
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Short
                </div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {shortCount}
                  {shortBE > 0 && (
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">
                      ({shortBEPercentage.toFixed(1)}% BE)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
