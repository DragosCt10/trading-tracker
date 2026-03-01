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
import {
  Tooltip as UITooltip,
  TooltipContent as UITooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { cn, formatPercent } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Info } from 'lucide-react';

export interface BEStatisticsCardProps {
  trades: Trade[];
  isLoading?: boolean;
}

/**
 * Compute BE (Break Even) stats from all trades marked as Break Even.
 * Wins/losses use trade_outcome or be_final_result for BE trades.
 */
function getBEStats(trades: Trade[]) {
  const beTrades = trades.filter((t) => t.break_even);
  const wins = beTrades.filter((t) => {
    if (t.trade_outcome === 'BE') return t.be_final_result === 'Win';
    return t.trade_outcome === 'Win';
  }).length;
  const losses = beTrades.filter((t) => {
    if (t.trade_outcome === 'BE') return t.be_final_result === 'Lose';
    return t.trade_outcome === 'Lose';
  }).length;
  const totalTrades = beTrades.length;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const winRateWithBE = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    winRateWithBE,
  };
}

export const BEStatisticsCard: React.FC<BEStatisticsCardProps> = React.memo(
  function BEStatisticsCard({ trades, isLoading: externalLoading }) {
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

    const stats = getBEStats(trades);
    const totalTrades = stats.totalTrades;
    const pieData = [
      { name: 'Wins', value: stats.wins, color: 'emerald', gradientId: 'beStatsWins', pct: totalTrades > 0 ? (stats.wins / totalTrades) * 100 : 0 },
      { name: 'Losses', value: stats.losses, color: 'rose', gradientId: 'beStatsLosses', pct: totalTrades > 0 ? (stats.losses / totalTrades) * 100 : 0 },
    ].filter((d) => d.value > 0);

    const CustomTooltip = ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: { payload: { name: string; value: number; color: string; pct?: number } }[];
    }) => {
      if (!active || !payload?.length) return null;
      const data = payload[0].payload;
      const colorMap: Record<string, { text: string; dot: string }> = {
        emerald: { text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30' },
        rose: { text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500 dark:bg-rose-400 ring-rose-200/50 dark:ring-rose-500/30' },
      };
      const colors = colorMap[data.color] || colorMap.emerald;
      const percentage = data.pct ?? (totalTrades > 0 ? (data.value / totalTrades) * 100 : 0);
      return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-3 text-slate-900 dark:text-slate-100">
          {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
          <div className="relative flex flex-col">
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full shadow-sm ring-2', colors.dot)} />
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {data.name}: <span className={cn('font-bold', colors.text)}>{data.value}</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 ml-4 font-medium">
              {percentage.toFixed(1)}% of total
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
              BE Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Wins and losses for BE trades
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
              BE Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Wins and losses for BE trades
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No BE trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                There are no break-even trades to display yet.
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              BE Stats
            </CardTitle>
            <TooltipProvider>
              <UITooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-4 w-4 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none shrink-0"
                    aria-label="BE stats info"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <UITooltipContent
                  side="top"
                  align="center"
                  sideOffset={6}
                  className="w-72 text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100"
                >
                  {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
                  <div className="relative text-xs sm:text-sm text-slate-400 dark:text-slate-300">Break-even trades only. For accurate wins/losses, set trade outcome to BE and specify After BE (Win or Lose).</div>
                </UITooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Wins and losses for BE trades
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <div className="w-full h-full max-h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="beStatsWins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="beStatsLosses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                      <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
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
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} stroke="none" />
                    ))}
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
                  Total Trades
                </div>
              </div>
            </div>
          </div>
          <div className="w-full px-4 pt-4 mt-2 hidden sm:block">
            <div className="flex items-center justify-center gap-8 w-fit mx-auto">
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Wins</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.wins}</div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Losses</div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats.losses}</div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Win Rate</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {formatPercent(stats.winRate)}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
