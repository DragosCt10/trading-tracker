'use client';

import React, { useState, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

/**
 * Calculate Sharpe ratio (simplified - would need returns array for full calculation)
 * For now, use a simplified version based on profit and drawdown
 */
export function calculateSharpeRatio(
  averagePnLPercentage: number,
  maxDrawdown: number
): number {
  const volatility = maxDrawdown || 1; // Use drawdown as proxy for volatility
  return volatility > 0 ? averagePnLPercentage / volatility : 0;
}

interface SharpeRatioChartProps {
  sharpeRatio: number;
}

export const SharpeRatioChart = React.memo(function SharpeRatioChart({ sharpeRatio }: SharpeRatioChartProps) {
  const { mounted, isDark } = useDarkMode();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipActiveRef = React.useRef(false);
  const prevActiveRef = React.useRef(false);


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

  const getTooltipDotColor = () => {
    if (sharpeRatio < 0.2) return 'bg-orange-500 dark:bg-orange-400 ring-orange-200/50 dark:ring-orange-500/30';
    if (sharpeRatio < 0.5) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    if (sharpeRatio < 1.0) return 'bg-yellow-500 dark:bg-yellow-400 ring-yellow-200/50 dark:ring-yellow-500/30';
    if (sharpeRatio < 2.0) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
  };

  const getTooltipValueColor = () => {
    if (sharpeRatio < 0.2) return 'text-orange-600 dark:text-orange-400';
    if (sharpeRatio < 0.5) return 'text-amber-600 dark:text-amber-400';
    if (sharpeRatio < 1.0) return 'text-yellow-600 dark:text-yellow-400';
    if (sharpeRatio < 2.0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const tooltipContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Sharpe Ratio Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn("rounded-xl p-2.5 transition-all", sharpeRatio < 0.2 ? "bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔹 &lt; 0.20</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High Variability — Large swings relative to returns.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", sharpeRatio >= 0.2 && sharpeRatio < 0.5 ? "bg-orange-100/80 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 0.20 – 0.49</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Developing Stability — Profitable but uneven.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", sharpeRatio >= 0.5 && sharpeRatio < 1 ? "bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟡 0.50 – 0.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Balanced Performance — Returns generally outweigh risk.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", sharpeRatio >= 1 && sharpeRatio < 2 ? "bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 1.0 – 1.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strong Efficiency — Consistent returns with controlled risk.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", sharpeRatio >= 2 ? "bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 2.0+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional Efficiency — Rare stability and optimized execution.</div>
        </div>
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload }: any) => {
    const isActive = active && payload && payload.length > 0;
    
    // Update ref during render (this is safe - refs can be updated during render)
    tooltipActiveRef.current = isActive;
    
    // Schedule state update outside of render using requestAnimationFrame
    if (isActive !== prevActiveRef.current) {
      prevActiveRef.current = isActive;
      requestAnimationFrame(() => {
        setShowTooltip(isActive);
      });
    }
    
    return null; // We'll render the tooltip separately
  };

  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Sharpe Ratio
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Risk-adjusted return
          </CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <div className="w-full h-full" aria-hidden>—</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
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
                className="w-72 text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100"
                sideOffset={6}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-fuchsia-500/5 rounded-2xl" />
                <div className="relative">{tooltipContent}</div>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Risk-adjusted return
        </CardDescription>
      </CardHeader>
      <CardContent className="h-48 flex flex-col items-center justify-center relative pt-0 pb-2">
        {/* Custom Tooltip positioned above chart */}
        {showTooltip && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative overflow-hidden rounded-xl p-3 border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-fuchsia-500/5 rounded-xl" />
              <div className="relative flex flex-col">
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full shadow-sm ring-2", getTooltipDotColor())}></div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Sharpe Ratio: <span className={cn("font-bold", getTooltipValueColor())}>{sharpeRatio.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 ml-4 font-medium">
                {percentage.toFixed(1)}% of maximum scale
              </div>
              </div>
            </div>
          </div>
        )}
        <div className="w-full h-full">
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
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius={45}
              outerRadius={75}
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
        </div>
        {/* Scale labels - positioned at chart arc endpoints */}
        <div className="absolute top-[60%] left-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          0
        </div>
        <div className="absolute top-[60%] right-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          3.0
        </div>
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
          <div className={cn('text-2xl font-bold', getTextColor())}>
            {sharpeRatio.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Target: 0.5+
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
