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
import { calculateNewsStats as calculateNewsStatsUtil } from '@/utils/calculateCategoryStats';
import type { NewsStats, BaseStats } from '@/types/dashboard';

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
  beWins: number;
  beLosses: number;
  winRate: number;
  winRateWithBE: number;
}

type PieColor = 'blue' | 'purple' | 'teal' | 'amber';
const NEWS_COLORS: PieColor[] = ['blue', 'purple', 'teal', 'amber'];

export const NewsStatisticsCard: React.FC<NewsStatisticsCardProps> = React.memo(
  function NewsStatisticsCard({ newsStats, isLoading: externalLoading, includeTotalTrades = false }) {
    const [mounted, setMounted] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      setMounted(true);
      const checkDarkMode = () => setIsDark(document.documentElement.classList.contains('dark'));
      checkDarkMode();
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
      return () => observer.disconnect();
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
        beWins: stat.beWins ?? 0,
        beLosses: stat.beLosses ?? 0,
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
        teal: {
          bg: 'bg-teal-50/80 dark:bg-teal-950/30 border-teal-200/50 dark:border-teal-800/30',
          text: 'text-teal-600 dark:text-teal-400',
          dot: 'bg-teal-500 dark:bg-teal-400 ring-teal-200/50 dark:ring-teal-500/30',
        },
        amber: {
          bg: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30',
          text: 'text-amber-600 dark:text-amber-400',
          dot: 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30',
        },
      };
      const colors = colorMap[data.color] ?? colorMap.blue;
      const wins = data.wins ?? 0;
      const losses = data.losses ?? 0;
      const beWins = data.beWins ?? 0;
      const beLosses = data.beLosses ?? 0;
      const winRate = data.winRate ?? 0;
      const winRateWithBE = data.winRateWithBE ?? 0;

      return (
        <div className="relative overflow-hidden rounded-xl p-4 border shadow-lg shadow-slate-900/5 dark:shadow-black/40 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200/60 dark:border-slate-700/60">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-fuchsia-500/5 rounded-xl" />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full shadow-sm ring-2', colors.dot)} />
              <div className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {data.name} - {data.percentage.toFixed(1)}% ({data.value} {data.value === 1 ? 'TRADE' : 'TRADES'})
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins:</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {wins}
                  {beWins > 0 && (
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">({beWins} BE)</span>
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses:</span>
                <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                  {losses}
                  {beLosses > 0 && (
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">({beLosses} BE)</span>
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
