'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { getNonExecutedTradesCount } from './NonExecutedTradesStatCard';

export interface ExecutedNonExecutedTradesCardProps {
  totalExecutedTrades: number;
  initialNonExecutedTotalTradesCount?: number | null;
  nonExecutedTotalTradesCount?: number | null;
  isLoading?: boolean;
}

export const ExecutedNonExecutedTradesCard: React.FC<ExecutedNonExecutedTradesCardProps> = React.memo(
  function ExecutedNonExecutedTradesCard({ 
    totalExecutedTrades,
    initialNonExecutedTotalTradesCount,
    nonExecutedTotalTradesCount,
    isLoading: externalLoading 
  }) {
    const [mounted, setMounted] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      setMounted(true);
      const checkDarkMode = () => {
        setIsDark(document.documentElement.classList.contains('dark'));
      };
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

    const nonExecutedCount = useMemo(() => {
      return getNonExecutedTradesCount(
        initialNonExecutedTotalTradesCount,
        nonExecutedTotalTradesCount
      );
    }, [initialNonExecutedTotalTradesCount, nonExecutedTotalTradesCount]);

    const totalTrades = totalExecutedTrades + nonExecutedCount;

    // Prepare pie chart data
    const pieData = [
      { name: 'Executed', value: totalExecutedTrades, color: 'blue', percentage: totalTrades > 0 ? (totalExecutedTrades / totalTrades) * 100 : 0 },
      { name: 'Non-Executed', value: nonExecutedCount, color: 'slate', percentage: totalTrades > 0 ? (nonExecutedCount / totalTrades) * 100 : 0 },
    ].filter((item) => item.value > 0); // Only show segments with values

    const CustomTooltip = ({ active, payload }: any) => {
      if (!active || !payload || payload.length === 0) return null;

      const data = payload[0].payload;
      const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
        blue: {
          bg: 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/30',
          text: 'text-blue-600 dark:text-blue-400',
          dot: 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30',
        },
        slate: {
          bg: 'bg-slate-50/80 dark:bg-slate-950/30 border-slate-200/50 dark:border-slate-800/30',
          text: 'text-slate-600 dark:text-slate-400',
          dot: 'bg-slate-500 dark:bg-slate-400 ring-slate-200/50 dark:ring-slate-500/30',
        },
      };

      const colors = colorMap[data.color] || colorMap.blue;
      const percentage = totalTrades > 0 ? (data.value / totalTrades) * 100 : 0;

      return (
        <div className={cn("relative overflow-hidden rounded-xl p-3 border shadow-lg shadow-slate-900/5 dark:shadow-black/40 backdrop-blur-xl", colors.bg)}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-fuchsia-500/5 rounded-xl" />
          <div className="relative flex flex-col">
            <div className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full shadow-sm ring-2", colors.dot)}></div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {data.name}: <span className={cn("font-bold", colors.text)}>{data.value}</span>
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
              Executed & Non-Executed Trades
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 truncate">
              Distribution of executed vs non-executed trades
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
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Executed & Non-Executed Trades
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3 truncate">
              Distribution of executed vs non-executed trades
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
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0 min-w-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Executed & Non-Executed Trades
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3 truncate">
            Shows executed vs non-executed trade split
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          {/* Pie chart section - same layout and dimensions as Long/Short Statistics card */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <div className="w-full h-full max-h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {/* Executed trades gradient - blue */}
                    <linearGradient id="executedTrades" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="50%" stopColor="#2563eb" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                    </linearGradient>
                    {/* Non-executed trades gradient - slate */}
                    <linearGradient id="nonExecutedTrades" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#64748b" stopOpacity={1} />
                      <stop offset="50%" stopColor="#475569" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#334155" stopOpacity={0.9} />
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
                      const gradientId = entry.color === 'blue' ? 'executedTrades' : 'nonExecutedTrades';
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
                  Executed
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {totalExecutedTrades}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Non-Executed
                </div>
                <div className="text-lg font-bold text-slate-600 dark:text-slate-400">
                  {nonExecutedCount}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
