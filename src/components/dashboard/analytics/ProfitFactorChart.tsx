'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ProfitFactorChartProps {
  profitFactor: number;
}

export function ProfitFactorChart({ profitFactor }: ProfitFactorChartProps) {
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

  // Normalize profit factor to 0-100% for display (cap at 5.0 for visual purposes)
  const normalizedValue = Math.min(profitFactor, 5.0);
  const percentage = (normalizedValue / 5.0) * 100;
  const remainingPercentage = 100 - percentage;

  const data = [
    { name: 'Profit Factor', value: percentage },
    { name: 'Remaining', value: remainingPercentage },
  ];

  // Determine color based on profit factor value
  const getGradientId = () => {
    if (profitFactor < 1.0) return 'profitFactorRed';
    if (profitFactor < 1.5) return 'profitFactorOrange';
    if (profitFactor < 2.0) return 'profitFactorAmber';
    if (profitFactor < 3.0) return 'profitFactorEmerald';
    return 'profitFactorBlue';
  };

  const getTextColor = () => {
    if (profitFactor < 1.0) return 'text-rose-600 dark:text-rose-400';
    if (profitFactor < 1.5) return 'text-orange-600 dark:text-orange-400';
    if (profitFactor < 2.0) return 'text-amber-600 dark:text-amber-400';
    if (profitFactor < 3.0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const tooltipContent = (
    <div className="space-y-2 text-slate-700">
      <div className="font-semibold text-slate-900">
        Profit Factor Interpretation
      </div>
      <div className={cn("rounded-lg p-1.5 sm:p-2", profitFactor < 1 ? "bg-red-50 border border-red-100" : "")}>
        <span className="font-medium">🔹 &lt; 1.0</span> — Negative Efficiency
        <br />
        Losses outweigh gains.
      </div>
      <div className={cn("rounded-lg p-1.5 sm:p-2", profitFactor >= 1 && profitFactor < 1.5 ? "bg-orange-50 border border-orange-100" : "")}>
        <span className="font-medium">🟠 1.0 – 1.49</span> — Marginal Efficiency
        <br />
        Profitable but limited.
      </div>
      <div className={cn("rounded-lg p-1.5 sm:p-2", profitFactor >= 1.5 && profitFactor < 2 ? "bg-amber-50 border border-amber-100" : "")}>
        <span className="font-medium">🟢 1.5 – 1.99</span> — Solid Efficiency
        <br />
        Consistent and sustainable edge.
      </div>
      <div className={cn("rounded-lg p-1.5 sm:p-2", profitFactor >= 2 && profitFactor < 3 ? "bg-emerald-50 border border-emerald-100" : "")}>
        <span className="font-medium">🔷 2.0 – 2.99</span> — High Efficiency
        <br />
        Strong reward relative to risk.
      </div>
      <div className={cn("rounded-lg p-1.5 sm:p-2", profitFactor >= 3 ? "bg-blue-50 border border-blue-100" : "")}>
        <span className="font-medium">💎 3.0+</span> — Exceptional Efficiency
        <br />
        Very high edge — confirm durability.
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Profit Factor: {profitFactor.toFixed(2)}
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
              Profit Factor
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
              Profit Factor
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
              <linearGradient id="profitFactorRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="profitFactorOrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="profitFactorAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                <stop offset="100%" stopColor="#d97706" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="profitFactorEmerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="profitFactorBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="50%" stopColor="#2563eb" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="profitFactorRemaining" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.2} />
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
            {profitFactor.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {profitFactor >= 5.0 && '+'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
