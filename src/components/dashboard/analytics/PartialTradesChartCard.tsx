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
import { useDarkMode } from '@/hooks/useDarkMode';

export interface PartialTradesChartCardProps {
  totalPartials: number;
  partialWinningTrades: number;
  partialLosingTrades: number;
  beWinPartialTrades: number;
  beLosingPartialTrades: number;
  partialWinRate: number;
  partialWinRateWithBE: number;
  isLoading?: boolean;
}


export const PartialTradesChartCard: React.FC<PartialTradesChartCardProps> = React.memo(
  function PartialTradesChartCard({
    totalPartials,
    partialWinningTrades,
    partialLosingTrades,
    beWinPartialTrades,
    beLosingPartialTrades,
    partialWinRate,
    partialWinRateWithBE,
    isLoading: externalLoading,
  }) {
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

    const totalWins = partialWinningTrades + beWinPartialTrades;
    const totalLosses = partialLosingTrades + beLosingPartialTrades;
    const totalBE = beWinPartialTrades + beLosingPartialTrades;
    const totalForChart = totalWins + totalLosses + totalBE;

    const pieData = [
      { name: 'Wins', value: totalWins, color: 'emerald', gradientId: 'partialWins', pct: totalForChart > 0 ? (totalWins / totalForChart) * 100 : 0 },
      { name: 'Losses', value: totalLosses, color: 'rose', gradientId: 'partialLosses', pct: totalForChart > 0 ? (totalLosses / totalForChart) * 100 : 0 },
      { name: 'BE', value: totalBE, color: 'amber', gradientId: 'partialBE', pct: totalForChart > 0 ? (totalBE / totalForChart) * 100 : 0 },
    ].filter((d) => d.value > 0);

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { name: string; value: number; color: string; pct?: number } }> }) => {
      if (!active || !payload?.length) return null;
      const data = payload[0].payload;
      if (!data) return null;
      const colorMap: Record<string, { text: string; dot: string }> = {
        emerald: { text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30' },
        rose: { text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500 dark:bg-rose-400 ring-rose-200/50 dark:ring-rose-500/30' },
        amber: { text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30' },
      };
      const colors = colorMap[data.color] || colorMap.emerald;
      const percentage = data.pct ?? (totalForChart > 0 ? (data.value / totalForChart) * 100 : 0);
      return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-3 text-slate-900 dark:text-slate-50">
          <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
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
              Partial Trades
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of partial trades by outcome
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (totalPartials === 0) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Partial Trades
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of partial trades by outcome
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No partial trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                Start trading with partial profits to see your statistics here!
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
            Partial Trades
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of partial trades by outcome
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <div className="w-full h-full max-h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {/* Wins gradient - emerald (same as TotalTradesChartCard) */}
                    <linearGradient id="partialWins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                    </linearGradient>
                    {/* Losses gradient - rose */}
                    <linearGradient id="partialLosses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                      <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
                    </linearGradient>
                    {/* Break Even gradient - amber */}
                    <linearGradient id="partialBE" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="50%" stopColor="#f97316" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
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
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#${entry.gradientId})`}
                        stroke="none"
                      />
                    ))}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span
                  className={`font-bold text-slate-900 dark:text-slate-100 ${
                    totalForChart >= 1000 ? 'text-2xl' : totalForChart >= 100 ? 'text-2xl' : 'text-3xl'
                  }`}
                >
                  {totalForChart}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">
                  Total Trades
                </span>
              </div>
            </div>
          </div>
          {/* Wins / Losses / BE labels - positioned below the pie chart */}
          <div className="w-full px-4 pt-4 mt-2">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Wins
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {totalWins}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Losses
                </div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {totalLosses}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  BE
                </div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {totalBE}
                  {totalForChart > 0 && (
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">
                      ({((totalBE / totalForChart) * 100).toFixed(1)}%)
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
