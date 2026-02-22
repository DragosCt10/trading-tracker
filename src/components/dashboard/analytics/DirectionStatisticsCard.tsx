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
  // Calculate total trades for percentage calculation
  // Always use wins + losses (beWins and beLosses are already included in wins/losses)
  // This ensures accurate percentage calculation without double-counting
  const totalDirectionTrades = directionStats.reduce(
    (sum, stat) => sum + (stat.wins ?? 0) + (stat.losses ?? 0),
    0
  );

  return directionStats.map((stat) => {
    // Calculate total from executed trades only (beWins and beLosses are already included in wins/losses)
    const directionTotal = (stat.wins ?? 0) + (stat.losses ?? 0);
    
    const percentage =
      totalDirectionTrades > 0
        ? ((directionTotal / totalDirectionTrades) * 100).toFixed(1)
        : "0.0";

    const baseData: TradeStatDatum = {
      category: `${stat.direction} - ${percentage}%`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: stat.winRate,
      winRateWithBE: stat.winRateWithBE,
    };

    // Use total from stats which includes all trades (including non-executed)
    // This ensures the count shown in parentheses matches the actual number of trades in tradesToUse
    baseData.totalTrades = stat.total ?? ((stat.wins ?? 0) + (stat.losses ?? 0));

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
    const { mounted, isDark } = useDarkMode();
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

    // Calculate totals and winrate
    const totalTrades = directionStats.reduce(
      (sum, stat) => sum + (stat.total ?? (stat.wins ?? 0) + (stat.losses ?? 0)),
      0
    );

    const totalWins = directionStats.reduce((sum, stat) => sum + (stat.wins ?? 0), 0);
    const totalLosses = directionStats.reduce((sum, stat) => sum + (stat.losses ?? 0), 0);

    // Get Long and Short stats
    const longStat = directionStats.find((stat) => stat.direction.toLowerCase() === 'long');
    const shortStat = directionStats.find((stat) => stat.direction.toLowerCase() === 'short');
    
    // Long stats
    const longCount = longStat ? (longStat.total ?? (longStat.wins ?? 0) + (longStat.losses ?? 0)) : 0;
    const longWins = longStat?.wins ?? 0;
    const longLosses = longStat?.losses ?? 0;
    const longBEWins = longStat?.beWins ?? 0;
    const longBELosses = longStat?.beLosses ?? 0;
    const longBE = longBEWins + longBELosses;
    const longWinsWithoutBE = longWins - longBEWins;
    const longLossesWithoutBE = longLosses - longBELosses;
    const longTradesWithoutBE = longWinsWithoutBE + longLossesWithoutBE;
    const longWinRate = longTradesWithoutBE > 0 ? (longWinsWithoutBE / longTradesWithoutBE) * 100 : 0;
    const longWinRateWithBE = longCount > 0 ? (longWins / longCount) * 100 : 0;
    
    // Short stats
    const shortCount = shortStat ? (shortStat.total ?? (shortStat.wins ?? 0) + (shortStat.losses ?? 0)) : 0;
    const shortWins = shortStat?.wins ?? 0;
    const shortLosses = shortStat?.losses ?? 0;
    const shortBEWins = shortStat?.beWins ?? 0;
    const shortBELosses = shortStat?.beLosses ?? 0;
    const shortBE = shortBEWins + shortBELosses;
    const shortWinsWithoutBE = shortWins - shortBEWins;
    const shortLossesWithoutBE = shortLosses - shortBELosses;
    const shortTradesWithoutBE = shortWinsWithoutBE + shortLossesWithoutBE;
    const shortWinRate = shortTradesWithoutBE > 0 ? (shortWinsWithoutBE / shortTradesWithoutBE) * 100 : 0;
    const shortWinRateWithBE = shortCount > 0 ? (shortWins / shortCount) * 100 : 0;

    // Prepare pie chart data - Long vs Short
    const pieData = directionStats
      .map((stat) => {
        const total = stat.total ?? (stat.wins ?? 0) + (stat.losses ?? 0);
        const percentage = totalTrades > 0 ? (total / totalTrades) * 100 : 0;
        return {
          name: stat.direction,
          value: total,
          percentage,
          color: stat.direction.toLowerCase() === 'long' ? 'blue' : 'purple',
          wins: stat.wins ?? 0,
          losses: stat.losses ?? 0,
          beWins: stat.beWins ?? 0,
          beLosses: stat.beLosses ?? 0,
          winRate: stat.winRate ?? 0,
          winRateWithBE: stat.winRateWithBE ?? 0,
        };
      })
      .filter((item) => item.value > 0); // Only show segments with values

    const CustomTooltip = ({ active, payload }: any) => {
      if (!active || !payload || payload.length === 0) return null;

      const data = payload[0].payload;
      const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
        blue: {
          bg: 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/30',
          text: 'text-blue-600 dark:text-blue-400',
          dot: 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30',
        },
        purple: {
          bg: 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-800/30',
          text: 'text-purple-600 dark:text-purple-400',
          dot: 'bg-purple-500 dark:bg-purple-400 ring-purple-200/50 dark:ring-purple-500/30',
        },
      };

      const colors = colorMap[data.color] || colorMap.blue;
      const percentage = totalTrades > 0 ? (data.value / totalTrades) * 100 : 0;
      const wins = data.wins ?? 0;
      const losses = data.losses ?? 0;
      const beWins = data.beWins ?? 0;
      const beLosses = data.beLosses ?? 0;
      const totalBE = beWins + beLosses;
      const winRate = data.winRate ?? 0;
      const winRateWithBE = data.winRateWithBE ?? 0;

      return (
        <div className="relative overflow-hidden rounded-xl p-4 border shadow-lg shadow-slate-900/5 dark:shadow-black/40 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200/60 dark:border-slate-700/60">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-fuchsia-500/5 rounded-xl" />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full shadow-sm ring-2", colors.dot)}></div>
              <div className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {data.name} - {percentage.toFixed(1)}% ({data.value} {data.value === 1 ? 'TRADE' : 'TRADES'})
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins:</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {wins}
                  {beWins > 0 && (
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">
                      ({beWins} BE)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses:</span>
                <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                  {losses}
                  {beLosses > 0 && (
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">
                      ({beLosses} BE)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate:</span>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  {winRate.toFixed(2)}%
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate (w/ BE):</span>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  {winRateWithBE.toFixed(2)}%
                </div>
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
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Short
                </div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {shortCount}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
