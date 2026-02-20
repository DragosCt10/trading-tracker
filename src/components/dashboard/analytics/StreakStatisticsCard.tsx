'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';

export interface StreakStatisticsCardProps {
  currentStreak: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
  isLoading?: boolean;
}

export const StreakStatisticsCard: React.FC<StreakStatisticsCardProps> = React.memo(
  function StreakStatisticsCard({ 
    currentStreak, 
    maxWinningStreak, 
    maxLosingStreak, 
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

    // Prepare chart data
    const chartData = [
      {
        name: 'Current',
        value: Math.abs(currentStreak),
        isPositive: currentStreak >= 0,
        isCurrent: true,
      },
      {
        name: 'Best Win',
        value: maxWinningStreak,
        isPositive: true,
        isCurrent: false,
      },
      {
        name: 'Best Loss',
        value: maxLosingStreak,
        isPositive: false,
        isCurrent: false,
      },
    ].filter((item) => item.value > 0); // Only show streaks with values

    // Calculate max value for scaling
    const maxValue = Math.max(
      Math.abs(currentStreak),
      maxWinningStreak,
      maxLosingStreak,
      1
    );

    // Dynamic colors based on dark mode
    const axisTextColor = isDark ? '#cbd5e1' : '#64748b';

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Streak Statistics
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Current and best winning/losing streaks
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (maxWinningStreak === 0 && maxLosingStreak === 0 && currentStreak === 0) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Streak Statistics
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Current and best winning/losing streaks
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No streaks found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                Start trading to see your streaks here!
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
            Streak Statistics
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Current and best winning/losing streaks
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          {/* Chart section */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative px-4">
            <div className="w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 16, bottom: 20 }}
                  barCategoryGap="20%"
                >
                  <defs>
                    {/* Current streak gradient - dynamic based on positive/negative */}
                    <linearGradient id="currentStreakGradient" x1="0" y1="0" x2="1" y2="0">
                      {currentStreak >= 0 ? (
                        <>
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                          <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                        </>
                      ) : (
                        <>
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                          <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
                        </>
                      )}
                    </linearGradient>
                    {/* Best winning streak gradient - emerald */}
                    <linearGradient id="bestWinGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.7} />
                    </linearGradient>
                    {/* Best losing streak gradient - rose */}
                    <linearGradient id="bestLossGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                      <stop offset="50%" stopColor="#fb7185" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#fda4af" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    type="number"
                    domain={[0, Math.ceil(maxValue * 1.15)]}
                    tick={{ fill: axisTextColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => value.toString()}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: axisTextColor, fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 8, 8, 0]}
                    barSize={32}
                  >
                    {chartData.map((entry, index) => {
                      let gradientId = 'bestWinGradient';
                      if (entry.isCurrent) {
                        gradientId = 'currentStreakGradient';
                      } else if (!entry.isPositive) {
                        gradientId = 'bestLossGradient';
                      }
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={`url(#${gradientId})`}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Stats summary below chart */}
          <div className="w-full px-4 pt-4 mt-2">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Current Streak
                </div>
                <div className={`text-lg font-bold ${
                  currentStreak > 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : currentStreak < 0 
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {currentStreak > 0 ? '+' : ''}{currentStreak}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Best Win
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  +{maxWinningStreak}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Best Loss
                </div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  -{maxLosingStreak}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
