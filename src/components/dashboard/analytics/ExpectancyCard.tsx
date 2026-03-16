'use client';

import React, { useState, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';
import { calculateExpectancy } from '@/utils/analyticsCalculations';
import { Trade } from '@/types/trade';

interface ExpectancyCardProps {
  trades: Trade[];
  currencySymbol?: string;
  isLoading?: boolean;
}

function formatCurrency(value: number, symbol = '$'): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${symbol}${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ExpectancyCard({ trades, currencySymbol = '$', isLoading }: ExpectancyCardProps) {
  const { mounted, isDark } = useDarkMode();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipActiveRef = useRef(false);
  const prevActiveRef = useRef(false);

  const { expectancy, normalized, avgWin, avgLoss } = calculateExpectancy(trades);
  const hasData = trades.some(t => t.trade_outcome === 'Win' || t.trade_outcome === 'Lose');

  // Normalize: 0–100 where 50 = breakeven
  const percentage = normalized;
  const remainingPercentage = 100 - percentage;

  const data = [
    { name: 'Expectancy', value: percentage },
    { name: 'Remaining',  value: remainingPercentage },
  ];

  const getGradientId = () => {
    if (percentage < 30) return 'expectRed';
    if (percentage < 50) return 'expectAmber';
    if (percentage < 70) return 'expectEmerald';
    return 'expectBlue';
  };

  const getTextColor = () => {
    if (percentage < 30) return 'text-rose-600 dark:text-rose-400';
    if (percentage < 50) return 'text-amber-600 dark:text-amber-400';
    if (percentage < 70) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getTooltipDotColor = () => {
    if (percentage < 30) return 'bg-rose-500 dark:bg-rose-400 ring-rose-200/50 dark:ring-rose-500/30';
    if (percentage < 50) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    if (percentage < 70) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
  };

  const getTooltipValueColor = () => getTextColor();

  const infoTooltipContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Expectancy Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', percentage < 30 ? 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔴 Negative Edge</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Losses outweigh wins on average. Review risk/reward or entry criteria.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', percentage >= 30 && percentage < 50 ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 Near Breakeven</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Edge is marginal. Costs (spread, commission) likely erode profitability.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', percentage >= 50 && percentage < 70 ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 Positive Edge</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strategy earns more per winner than it loses per loser. Compounding works in your favour.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', percentage >= 70 ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 Strong Edge</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High expectancy relative to risk. Scale carefully while preserving edge.</div>
        </div>
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/40 dark:border-slate-700/30">
        Formula: (Win Rate × Avg Win) − (Loss Rate × Avg Loss)
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload }: any) => {
    const isActive = active && payload && payload.length > 0 && payload[0]?.payload?.name === 'Expectancy';
    tooltipActiveRef.current = isActive;
    if (isActive !== prevActiveRef.current) {
      prevActiveRef.current = isActive;
      requestAnimationFrame(() => setShowTooltip(isActive));
    }
    return null;
  };

  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Expectancy
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">Expected return per trade</CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <div className="w-full h-full" aria-hidden>—</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Expectancy
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
                {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
                <div className="relative">{infoTooltipContent}</div>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Expected return per trade
        </CardDescription>
      </CardHeader>

      <CardContent className="h-48 flex flex-col items-center justify-center relative pt-0 pb-2">
        {!hasData || isLoading ? (
          <div className="flex flex-col justify-center items-center w-full h-full">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {isLoading ? 'Loading…' : 'No trades found'}
            </div>
          </div>
        ) : (
          <>
            {/* Hover tooltip */}
            {showTooltip && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="relative overflow-hidden rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100">
                  {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
                  <div className="relative flex flex-col">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full shadow-sm ring-2', getTooltipDotColor())} />
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Expectancy: <span className={cn('font-bold', getTooltipValueColor())}>{formatCurrency(expectancy, currencySymbol)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 ml-4 font-medium">
                      Win avg: {currencySymbol}{avgWin.toFixed(2)} · Loss avg: {currencySymbol}{avgLoss.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="expectRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="expectAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="expectEmerald" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="expectBlue" x1="0" y1="0" x2="0" y2="1">
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
                    cornerRadius={7}
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

            {/* Scale labels */}
            <div className="absolute top-[60%] left-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              Neg
            </div>
            <div className="absolute top-[60%] right-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              Pos
            </div>

            {/* Value below gauge */}
            <div className="text-center -mt-6">
              <div className={cn('text-2xl font-bold tabular-nums', getTextColor())}>
                {formatCurrency(expectancy, currencySymbol)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Target: &gt; 0
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
