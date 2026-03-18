'use client';

import React, { useState, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Infinity as InfinityIcon, Crown } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { useDarkMode } from '@/hooks/useDarkMode';
import { calculateProfitFactor } from '@/utils/analyticsCalculations';
import { buildPreviewTrade } from '@/utils/previewTrades';

/* ---------------------------------------------------------
 * Props
 * ------------------------------------------------------ */

interface ProfitFactorChartProps {
  tradesToUse: Trade[];
  totalWins?: number;
  totalLosses?: number;
  isPro?: boolean;
}

function CustomTooltip({ active, payload, tooltipActiveRef, prevActiveRef, setShowTooltip }: any) {
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
}

export const ProfitFactorChart = React.memo(function ProfitFactorChart({ tradesToUse: rawTrades, totalWins, totalLosses, isPro }: ProfitFactorChartProps) {
  const isLocked = !isPro;

  const previewTrades = useMemo<Trade[]>(
    () => [
      buildPreviewTrade({
        id: 'preview-profit-factor-win',
        trade_outcome: 'Win',
        calculated_profit: 200,
      }),
      buildPreviewTrade({
        id: 'preview-profit-factor-loss',
        trade_outcome: 'Lose',
        calculated_profit: -100,
      }),
    ],
    []
  );

  const tradesToUse = useMemo(() => (isLocked ? previewTrades : rawTrades), [isLocked, previewTrades, rawTrades]);
  // Calculate profit factor from trades
  const wins = useMemo(() => tradesToUse.filter(t => t.trade_outcome === 'Win').length, [tradesToUse]);
  const losses = useMemo(() => tradesToUse.filter(t => t.trade_outcome === 'Lose').length, [tradesToUse]);
  const profitFactor = useMemo(
    () => calculateProfitFactor(tradesToUse, wins, losses),
    [tradesToUse, wins, losses]
  );
  const { mounted, isDark } = useDarkMode();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipActiveRef = React.useRef(false);
  const prevActiveRef = React.useRef(false);

  // Handle Infinity and invalid values
  const hasNumericProfitFactor = !Number.isNaN(profitFactor);
  const isInfiniteProfitFactor = hasNumericProfitFactor && !Number.isFinite(profitFactor);
  const isFiniteProfitFactor = hasNumericProfitFactor && Number.isFinite(profitFactor);

  // For visualization, clamp Infinity to the top of the scale (5.0)
  const displayValue = isFiniteProfitFactor ? profitFactor : isInfiniteProfitFactor ? 5.0 : 0;
  
  // Normalize profit factor to 0-100% for display (scale from 0 to 5.0)
  const normalizedValue = Math.max(0, Math.min(displayValue, 5.0));
  const percentage = (normalizedValue / 5.0) * 100;
  const remainingPercentage = 100 - percentage;

  const data = [
    { name: 'Profit Factor', value: percentage },
    { name: 'Remaining', value: remainingPercentage },
  ];

  // Determine color based on profit factor value
  const getGradientId = () => {
    if (!hasNumericProfitFactor) return 'profitFactorRed';
    if (displayValue < 1.0) return 'profitFactorRed';
    if (displayValue < 1.5) return 'profitFactorOrange';
    if (displayValue < 2.0) return 'profitFactorAmber';
    if (displayValue < 3.0) return 'profitFactorEmerald';
    return 'profitFactorBlue';
  };

  const getTextColor = () => {
    if (!hasNumericProfitFactor) return 'text-slate-500 dark:text-slate-400';
    if (displayValue < 1.0) return 'text-rose-600 dark:text-rose-400';
    if (displayValue < 1.5) return 'text-orange-600 dark:text-orange-400';
    if (displayValue < 2.0) return 'text-amber-600 dark:text-amber-400';
    if (displayValue < 3.0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const tooltipContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Profit Factor Interpretation
      </div>
        <div className="space-y-2">
        <div className={cn("rounded-xl p-2.5 transition-all", profitFactor < 1 ? "bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔹 &lt; 1.0</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Negative Efficiency — Losses outweigh gains.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", profitFactor >= 1 && profitFactor < 1.5 ? "bg-orange-100/80 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 1.0 – 1.49</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Marginal Efficiency — Profitable but limited.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", profitFactor >= 1.5 && profitFactor < 2 ? "bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 1.5 – 1.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Solid Efficiency — Consistent and sustainable edge.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", profitFactor >= 2 && profitFactor < 3 ? "bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔷 2.0 – 2.99</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High Efficiency — Strong reward relative to risk.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", profitFactor >= 3 ? "bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 3.0+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional Efficiency — Very high edge — confirm durability.</div>
        </div>
      </div>
    </div>
  );


  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Profit Factor
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Profit efficiency ratio
          </CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center">
          <div className="w-full h-full" aria-hidden>—</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      {isLocked && (
        <span className="absolute right-3 top-3 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
          <Crown className="w-3 h-3" /> PRO
        </span>
      )}

      {isLocked && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
      )}

      <div className={cn('relative z-0', isLocked && 'blur-[3px] opacity-70 pointer-events-none select-none')}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Profit Factor
          </CardTitle>
          <div className="flex items-center gap-2">
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
                <div className="relative">{tooltipContent}</div>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
          </div>
        </div>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Profit efficiency ratio
        </CardDescription>
      </CardHeader>
      <CardContent className="h-48 flex flex-col items-center justify-center relative pt-0 pb-2">
        {isPro && rawTrades.length === 0 ? (
          <div className="flex flex-col justify-center items-center w-full h-full">
            <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">No trades found</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">There are no trades to display for this category yet. Start trading to see your statistics here!</div>
          </div>
        ) : (<>
        {/* Custom Tooltip positioned above chart */}
        {showTooltip && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative overflow-hidden rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100">
              {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
              <div className="relative">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400 shadow-sm ring-2 ring-blue-200/50 dark:ring-blue-500/30"></div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Profit Factor:{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-bold inline-flex items-center gap-1">
                    {isFiniteProfitFactor
                      ? displayValue.toFixed(2)
                      : isInfiniteProfitFactor
                        ? '∞'
                        : 'N/A'}
                  </span>
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
            <Tooltip
              content={(props) => <CustomTooltip {...props} tooltipActiveRef={tooltipActiveRef} prevActiveRef={prevActiveRef} setShowTooltip={setShowTooltip} />}
              allowEscapeViewBox={{ x: false, y: true }}
              cursor={false}
            />
          </PieChart>
        </ResponsiveContainer>
        </div>
        {/* Scale labels - positioned at chart arc endpoints */}
        <div className="absolute top-[60%] left-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          0
        </div>
        <div className="absolute top-[60%] right-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          5.0
        </div>
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
          <div className={cn('text-2xl font-bold', getTextColor())}>
            {isFiniteProfitFactor ? (
              displayValue % 1 === 0 ? displayValue.toFixed(0) : displayValue.toFixed(1)
            ) : isInfiniteProfitFactor ? (
              <InfinityIcon className="inline-block h-6 w-6 align-middle" aria-label="Infinite profit factor" />
            ) : (
              'N/A'
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Target: 2+
          </div>
        </div>
        </>)}
      </CardContent>
      </div>
    </Card>
  );
});
