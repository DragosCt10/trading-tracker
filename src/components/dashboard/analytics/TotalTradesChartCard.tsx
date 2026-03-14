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
import { cn, formatPercent } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';

export interface TotalTradesBaseProps {
  totalTrades: number;
  /** Wins (trades with outcome Win, excluding BE). */
  wins: number;
  /** Losses (trades with outcome Lose, excluding BE). */
  losses: number;
  /** Trades with outcome BE (break-even). */
  beTrades: number;
}

export interface TotalTradesChartCardProps extends TotalTradesBaseProps {
  isLoading?: boolean;
  /** When false, hides the bottom Wins/Losses/BE breakdown row (used for compact cards like My Trades). */
  showOutcomeBreakdown?: boolean;
}

export interface TotalTradesDonutProps extends TotalTradesBaseProps {
  /** compact – smaller radii for tight cards (e.g. My Trades header) */
  variant?: 'full' | 'compact';
}

export const TotalTradesDonut: React.FC<TotalTradesDonutProps> = ({
  totalTrades,
  wins,
  losses,
  beTrades,
  variant = 'full',
}) => {
  const { isDark } = useDarkMode();

  const totalForChart = totalTrades;
  const pieData = [
    { name: 'Wins', value: wins, color: 'emerald', percentage: totalForChart > 0 ? (wins / totalForChart) * 100 : 0 },
    { name: 'Losses', value: losses, color: 'rose', percentage: totalForChart > 0 ? (losses / totalForChart) * 100 : 0 },
    { name: 'BE', value: beTrades, color: 'slate', percentage: totalForChart > 0 ? (beTrades / totalForChart) * 100 : 0 },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
      emerald: {
        bg: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30',
      },
      rose: {
        bg: 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30',
        text: 'text-rose-600 dark:text-rose-400',
        dot: 'bg-rose-500 dark:bg-rose-400 ring-rose-200/50 dark:ring-rose-500/30',
      },
      slate: {
        bg: 'bg-slate-50/80 dark:bg-slate-950/30 border-slate-200/50 dark:border-slate-800/30',
        text: 'text-slate-600 dark:text-slate-300',
        dot: 'bg-slate-500 dark:bg-slate-400 ring-slate-200/50 dark:ring-slate-500/30',
      },
    };

    const colors = colorMap[data.color] || colorMap.emerald;
    const percentage = totalForChart > 0 ? (data.value / totalForChart) * 100 : 0;

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

  if (totalTrades === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">No trades yet</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
      <div
        className={
          variant === 'compact'
            ? 'w-28 h-28 relative mx-auto'
            : 'w-full h-full max-h-[200px] relative'
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="totalTradesWins" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="totalTradesLosses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="totalTradesBE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748b" stopOpacity={1} />
                <stop offset="50%" stopColor="#475569" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#334155" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={variant === 'compact' ? 32 : 65}
              outerRadius={variant === 'compact' ? 44 : 85}
              paddingAngle={5}
              cornerRadius={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => {
                const gradientId =
                  entry.color === 'emerald'
                    ? 'totalTradesWins'
                    : entry.color === 'rose'
                    ? 'totalTradesLosses'
                    : 'totalTradesBE';
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
          <div
            className={`font-bold text-slate-900 flex flex-col items-center gap-1 justify-center dark:text-slate-100 ${
              variant === 'compact'
                ? 'text-2xl'
                : totalTrades >= 1000
                ? 'text-2xl'
                : totalTrades >= 100
                ? 'text-2xl'
                : 'text-3xl'
            }`}
          >
            {totalTrades} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{variant === 'compact' ? '' : 'Total Trades'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TotalTradesChartCard: React.FC<TotalTradesChartCardProps> = React.memo(
  function TotalTradesChartCard({ 
  totalTrades, 
  wins, 
  losses, 
  beTrades, 
  isLoading: externalLoading,
  showOutcomeBreakdown = true,
  }) {
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

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Total Trades
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of all trades by outcome
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (totalTrades === 0) {
      return (
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Total Trades
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of all trades by outcome
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                Start trading to see your statistics here!
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Total Trades
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of all trades by outcome
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          {/* Pie chart section - takes upper portion */}
          <TotalTradesDonut
            totalTrades={totalTrades}
            wins={wins}
            losses={losses}
            beTrades={beTrades}
          />
          {/* Wins / Losses / BE labels - positioned below the pie chart */}
          {showOutcomeBreakdown && (
            <div className="w-full px-4 pt-4 mt-2">
              <div className="flex items-center justify-center gap-8 w-fit mx-auto">
                <div className="flex flex-col items-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Wins
                  </div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {wins}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex flex-col items-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Losses
                  </div>
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {losses}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex flex-col items-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    BE
                  </div>
                  <div className="text-lg font-bold text-slate-600 dark:text-slate-300">
                    {beTrades}
                    {totalTrades > 0 && (
                      <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">
                        ({formatPercent((beTrades / totalTrades) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);
