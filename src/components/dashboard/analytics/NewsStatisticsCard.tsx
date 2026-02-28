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
import { calculateNewsStats as calculateNewsStatsUtil } from '@/utils/calculateCategoryStats';
import type { NewsStats, BaseStats } from '@/types/dashboard';
import { useDarkMode } from '@/hooks/useDarkMode';

// Type that matches both NewsStats and filtered stats (which may not have news property)
type NewsStatsLike = BaseStats & {
  news?: string;
  total?: number;
};

export interface NewsStatisticsCardProps {
  newsStats: NewsStatsLike[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate News Stats from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of News Stats
 */
export function calculateNewsStats(trades: Trade[]): NewsStats[] {
  return calculateNewsStatsUtil(trades);
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

type PieColor = 'blue' | 'purple' | 'teal' | 'amber';
const NEWS_COLORS: PieColor[] = ['blue', 'purple', 'teal', 'amber'];

export const NewsStatisticsCard: React.FC<NewsStatisticsCardProps> = React.memo(
  function NewsStatisticsCard({ newsStats, isLoading: externalLoading, includeTotalTrades = false }) {
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

    // Use stat.total so total matches Local H/L and Executed cards (same tradesToUse)
    const totalTrades = newsStats.reduce(
      (sum, s) => sum + (s.total ?? 0),
      0
    );

    const pieDataRaw: PieDatum[] = newsStats.map((stat, index) => {
      const value = stat.total ?? 0;
      return {
        name: stat.news ?? 'Unknown',
        value,
        percentage: totalTrades > 0 ? (value / totalTrades) * 100 : 0,
        color: NEWS_COLORS[index % NEWS_COLORS.length],
        wins: stat.wins ?? 0,
        losses: stat.losses ?? 0,
        breakEven: stat.breakEven ?? 0,
        winRate: stat.winRate ?? 0,
        winRateWithBE: stat.winRateWithBE ?? 0,
      };
    });
    const pieData = pieDataRaw.filter((item) => item.value > 0);

    // Bottom legend: always show News and No News with count (0 if none). Colors match pie order (first segment = blue, second = purple).
    const legendItems: { name: string; value: number; color: PieColor }[] = [
      { name: 'News', value: pieDataRaw.find((d) => d.name === 'News')?.value ?? 0, color: 'purple' },
      { name: 'No News', value: pieDataRaw.find((d) => d.name === 'No News')?.value ?? 0, color: 'blue' },
    ];

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: PieDatum }[] }) => {
      if (!active || !payload?.length) return null;

      const data = payload[0].payload;
      const wins = data.wins ?? 0;
      const losses = data.losses ?? 0;
      const breakEven = data.breakEven ?? 0;
      const winRate = data.winRate ?? 0;
      const winRateWithBE = data.winRateWithBE ?? 0;

      return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-50">
          <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="relative flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {data.name} ({data.value} {data.value === 1 ? 'trade' : 'trades'})
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
              News Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on news
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
              News Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades based on news
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
      blue: 'text-blue-600 dark:text-blue-400',
      purple: 'text-purple-600 dark:text-purple-400',
      teal: 'text-teal-600 dark:text-teal-400',
      amber: 'text-amber-600 dark:text-amber-400',
    };

    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            News Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of trades based on news
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <div className="w-full h-full max-h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="newsGrad0" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="50%" stopColor="#2563eb" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="newsGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                      <stop offset="50%" stopColor="#9333ea" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="newsGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
                      <stop offset="50%" stopColor="#0d9488" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="newsGrad3" x1="0" y1="0" x2="0" y2="1">
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
                      const gradientId = `newsGrad${index}`;
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
