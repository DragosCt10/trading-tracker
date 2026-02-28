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
import type { TradeTypeStats } from '@/types/dashboard';
import { useDarkMode } from '@/hooks/useDarkMode';

export interface TrendStatisticsCardProps {
  trendStats: TradeTypeStats[];
  isLoading?: boolean;
  includeTotalTrades?: boolean;
}

interface PieDatum {
  name: string;
  value: number;
  percentage: number;
  color: 'teal' | 'orange';
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number;
  winRateWithBE: number;
}

export const TrendStatisticsCard: React.FC<TrendStatisticsCardProps> = React.memo(
  function TrendStatisticsCard({ trendStats, isLoading: externalLoading, includeTotalTrades = false }) {
    const { mounted } = useDarkMode();
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

    const totalTrades = trendStats.reduce(
      (s, d) => s + (d.total ?? (d.wins ?? 0) + (d.losses ?? 0) + (d.breakEven ?? 0)),
      0
    );
    const pieData: PieDatum[] = trendStats
      .filter((d) => (d.total ?? 0) > 0)
      .map((stat, index) => ({
        name: stat.tradeType ?? 'Unknown',
        value: stat.total ?? (stat.wins ?? 0) + (stat.losses ?? 0) + (stat.breakEven ?? 0),
        percentage: totalTrades > 0 ? ((stat.total ?? 0) / totalTrades) * 100 : 0,
        color: (index === 0 ? 'teal' : 'orange') as 'teal' | 'orange',
        wins: stat.wins ?? 0,
        losses: stat.losses ?? 0,
        breakEven: stat.breakEven ?? 0,
        winRate: stat.winRate ?? 0,
        winRateWithBE: stat.winRateWithBE ?? 0,
      }));

    const trendFollowingCount = pieData.find((d) => d.name === 'Trend-following')?.value ?? 0;
    const counterTrendCount = pieData.find((d) => d.name === 'Counter-trend')?.value ?? 0;

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: PieDatum }[] }) => {
      if (!active || !payload?.length) return null;

      const data = payload[0].payload;
      const colorMap: Record<string, { dot: string }> = {
        teal: { dot: 'bg-teal-500 dark:bg-teal-400 ring-teal-200/50 dark:ring-teal-500/30' },
        orange: { dot: 'bg-orange-500 dark:bg-orange-400 ring-orange-200/50 dark:ring-orange-500/30' },
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
                  {winRate.toFixed(2)}%
                  <span className="text-slate-500 dark:text-slate-400 text-sm ml-1 font-medium">
                    ({winRateWithBE.toFixed(2)}% w/BE)
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
              Trend Trades
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution by trend type
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
              Trend Trades
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution by trend type
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
            Trend Trades
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution by trend type
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <div className="w-full h-full max-h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="trendStatTrendFollowing" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
                      <stop offset="50%" stopColor="#0d9488" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="trendStatCounterTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                      <stop offset="50%" stopColor="#ea580c" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#c2410c" stopOpacity={0.9} />
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
                      const gradientId = entry.color === 'teal' ? 'trendStatTrendFollowing' : 'trendStatCounterTrend';
                      return <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} stroke="none" />;
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
                  Trend Trades
                </div>
              </div>
            </div>
          </div>
          <div className="w-full px-4 pt-4 mt-2">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Trend-following</div>
                <div className="text-lg font-bold text-teal-600 dark:text-teal-400">{trendFollowingCount}</div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Counter-trend</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{counterTrendCount}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

