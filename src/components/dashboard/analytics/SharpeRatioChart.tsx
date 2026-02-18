'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SharpeRatioChartProps {
  sharpeRatio: number;
}

export function SharpeRatioChart({ sharpeRatio }: SharpeRatioChartProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

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

  // Normalize Sharpe ratio to 0-100% for display (cap at 3.0 for visual purposes)
  const normalizedValue = Math.max(0, Math.min(sharpeRatio, 3.0));
  const percentage = (normalizedValue / 3.0) * 100;
  const remainingPercentage = 100 - percentage;

  const data = [
    { name: 'Sharpe Ratio', value: percentage },
    { name: 'Remaining', value: remainingPercentage },
  ];

  // Determine color based on Sharpe ratio value
  const getGradientId = () => {
    if (sharpeRatio < 0.2) return 'sharpeOrange';
    if (sharpeRatio < 0.5) return 'sharpeAmber';
    if (sharpeRatio < 1.0) return 'sharpeYellow';
    if (sharpeRatio < 2.0) return 'sharpeEmerald';
    return 'sharpeBlue';
  };

  const getTextColor = () => {
    if (sharpeRatio < 0.2) return 'text-orange-600 dark:text-orange-400';
    if (sharpeRatio < 0.5) return 'text-amber-600 dark:text-amber-400';
    if (sharpeRatio < 1.0) return 'text-yellow-600 dark:text-yellow-400';
    if (sharpeRatio < 2.0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const tooltipContent = (
    <div className="space-y-2 text-slate-700">
      <div className="font-semibold text-slate-900">
        Sharpe Ratio Interpretation
      </div>
      <div className={cn("rounded-lg p-1.5 sm:p-2", sharpeRatio < 0.2 ? "bg-orange-50 border border-orange-100" : "")}>
        <span className="font-medium">🔹 &lt; 0.20</span> — High Variability
        <br />
        Large swings relative to returns.
      </div>
      <div className={cn("rounded-lg p-1.5 sm:p-2", sharpeRatio >= 0.2 && sharpeRatio < 0.5 ? "bg-orange-100 border border-orange-200" : "")}>
        <span className="font-medium">🟠 0.20 – 0.49</span> — Developing Stability
        <br />
        Profitable but uneven.
      </div>
      <div className={cn("rounded-lg p-1.5 sm:p-2", sharpeRatio >= 0.5 && sharpeRatio < 1 ? "bg-amber-50 border border-amber-100" : "")}>
        <span className="font-medium">🟡 0.50 – 0.99</span> — Balanced Performance
        <br />
        Returns generally outweigh risk.
      </div>
      <div className={cn("rounded-lg p-1.5 sm:p-2", sharpeRatio >= 1 && sharpeRatio < 2 ? "bg-emerald-50 border border-emerald-100" : "")}>
        <span className="font-medium">🟢 1.0 – 1.99</span> — Strong Efficiency
        <br />
        Consistent returns with controlled risk.
      </div>
      <div className={cn("rounded-lg p-1.5 sm:p-2", sharpeRatio >= 2 ? "bg-blue-50 border border-blue-100" : "")}>
        <span className="font-medium">💎 2.0+</span> — Exceptional Efficiency
        <br />
        Rare stability and optimized execution.
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Sharpe Ratio: {sharpeRatio.toFixed(2)}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          {percentage.toFixed(1)}% of maximum scale
        </div>
      </div>
    );
  };

  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Sharpe Ratio
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="w-full h-full" aria-hidden>—</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Sharpe Ratio
            </CardTitle>
            <TooltipProvider>
              <UITooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    tabIndex={0}
                    className="inline-flex h-4 w-4 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none shrink-0"
                    aria-label="More info"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  className="w-72 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 p-4"
                  sideOffset={6}
                >
                  {tooltipContent}
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-64 flex flex-col items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="sharpeOrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="sharpeAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                <stop offset="100%" stopColor="#d97706" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="sharpeYellow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eab308" stopOpacity={1} />
                <stop offset="50%" stopColor="#facc15" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#ca8a04" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="sharpeEmerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="sharpeBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="50%" stopColor="#2563eb" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="90%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    index === 0
                      ? `url(#${getGradientId()})`
                      : isDark
                      ? 'rgba(51, 65, 85, 0.2)'
                      : 'rgba(226, 232, 240, 0.3)'
                  }
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <div className={cn('text-3xl font-bold mb-1', getTextColor())}>
            {sharpeRatio.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {sharpeRatio >= 3.0 && '+'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
