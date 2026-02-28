'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar as ReBar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Trade } from '@/types/trade';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { useDarkMode } from '@/hooks/useDarkMode';
import { getAverageDisplacementPerMarket } from '@/utils/getAverageDisplacementPerMarket';

export interface AverageDisplacementSizeCardProps {
  trades: Trade[];
  isLoading?: boolean;
}

export const AverageDisplacementSizeCard: React.FC<AverageDisplacementSizeCardProps> = React.memo(
  function AverageDisplacementSizeCard({ trades, isLoading: externalLoading }) {
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

    const rawData = getAverageDisplacementPerMarket(trades);
    const chartBarsData = rawData.map((d) => ({
      name: d.category,
      value: Number((d.value ?? 0).toFixed(2)),
      market: d.category,
      averageDisplacementSize: d.value ?? 0,
    }));

    const axisTextColor = isDark ? '#cbd5e1' : '#64748b';
    const maxValue = Math.max(...chartBarsData.map((d) => d.value), 1);

    const gradientColor = {
      start: '#3b82f6',
      mid: '#06b6d4',
      end: '#0ea5e9',
    };

    const CustomTooltip = ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: { payload: (typeof chartBarsData)[number] }[];
    }) => {
      if (!active || !payload?.length) return null;
      const d = payload[0].payload;
      return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-50">
          <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="relative flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {d.market}
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Avg Displacement Size</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {d.averageDisplacementSize.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-[420px] flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Average Displacement Size (Points)
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Average displacement size (points) for each market.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (!chartBarsData.length) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-[420px] flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Average Displacement Size (Points)
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Average displacement size (points) for each market.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
              No displacement size data found
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
              Add trades with Displacement Size to see average per market here.
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-visible border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-[420px] flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Average Displacement Size (Points)
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Average displacement size (points) for each market.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative pl-1 pr-4">
            <div className="w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartBarsData}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 0, bottom: 20 }}
                  barCategoryGap="20%"
                >
                  <defs>
                    <linearGradient id="dispSizeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={gradientColor.start} stopOpacity={1} />
                      <stop offset="50%" stopColor={gradientColor.mid} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={gradientColor.end} stopOpacity={0.9} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    type="number"
                    domain={[0, Math.ceil(maxValue * 1.15)]}
                    tick={{ fill: axisTextColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: axisTextColor, fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={72}
                    tickMargin={8}
                  />

                  <ReTooltip
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

                  <ReBar
                    dataKey="value"
                    radius={[0, 8, 8, 0]}
                    barSize={18}
                    fill="url(#dispSizeGradient)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
