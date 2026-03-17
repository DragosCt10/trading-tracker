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
import { Info, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';

interface DrawdownCountChartProps {
  drawdownCount: number;
  isPro?: boolean;
}

const MAX_SCALE = 20;

function CustomTooltip({ active, payload, tooltipActiveRef, prevActiveRef, setShowTooltip }: any) {
  const isActive = active && payload && payload.length > 0 && payload[0]?.payload?.name === 'Drawdown Periods';
  tooltipActiveRef.current = isActive;
  if (isActive !== prevActiveRef.current) {
    prevActiveRef.current = isActive;
    requestAnimationFrame(() => setShowTooltip(isActive));
  }
  return null;
}

export const DrawdownCountChart = React.memo(function DrawdownCountChart({
  drawdownCount: rawCount,
  isPro,
}: DrawdownCountChartProps) {
  const drawdownCount = isPro ? rawCount : 0;
  const { mounted, isDark } = useDarkMode();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipActiveRef = useRef(false);
  const prevActiveRef = useRef(false);

  const cappedValue = Math.max(0, Math.min(drawdownCount, MAX_SCALE));
  const percentage = (cappedValue / MAX_SCALE) * 100;
  const remainingPercentage = 100 - percentage;

  const data = [
    { name: 'Drawdown Periods', value: percentage },
    { name: 'Remaining',        value: remainingPercentage },
  ];

  // Lower count = better (blue), higher count = worse (red)
  const getGradientId = () => {
    if (drawdownCount <= 2)  return 'ddcountBlue';
    if (drawdownCount <= 5)  return 'ddcountEmerald';
    if (drawdownCount <= 9)  return 'ddcountYellow';
    if (drawdownCount <= 14) return 'ddcountAmber';
    return 'ddcountRed';
  };

  const getTextColor = () => {
    if (drawdownCount <= 2)  return 'text-blue-600 dark:text-blue-400';
    if (drawdownCount <= 5)  return 'text-emerald-600 dark:text-emerald-400';
    if (drawdownCount <= 9)  return 'text-yellow-600 dark:text-yellow-400';
    if (drawdownCount <= 14) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getTooltipDotColor = () => {
    if (drawdownCount <= 2)  return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
    if (drawdownCount <= 5)  return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    if (drawdownCount <= 9)  return 'bg-yellow-500 dark:bg-yellow-400 ring-yellow-200/50 dark:ring-yellow-500/30';
    if (drawdownCount <= 14) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    return 'bg-rose-500 dark:bg-rose-400 ring-rose-200/50 dark:ring-rose-500/30';
  };

  const displayValue = drawdownCount >= MAX_SCALE ? '20+' : String(drawdownCount);

  const tooltipContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Drawdown Periods Interpretation
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Counts how many times your equity dropped below its peak and had to recover. Fewer periods indicate a smoother, more consistent equity curve.
      </p>
      <div className="space-y-2">
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownCount <= 2 ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 0 – 2</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional — Very smooth equity curve. Drawdowns are rare and brief.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownCount >= 3 && drawdownCount <= 5 ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 3 – 5</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strong — Consistent performance with few losing streaks.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownCount >= 6 && drawdownCount <= 9 ? 'bg-yellow-50/80 dark:bg-yellow-950/30 border border-yellow-200/50 dark:border-yellow-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟡 6 – 9</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Moderate — Normal for active traders. Review loss clustering patterns.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownCount >= 10 && drawdownCount <= 14 ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 10 – 14</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">High Frequency — Equity is volatile. Consider tighter drawdown rules.</div>
        </div>
        <div className={cn('rounded-xl p-2.5 transition-all', drawdownCount >= 15 ? 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30')}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔴 15+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Very Choppy — Frequent equity swings. Strategy consistency needs attention.</div>
        </div>
      </div>
    </div>
  );


  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Drawdown Periods
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">Number of equity dips below peak</CardDescription>
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
            Drawdown Periods
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
              <Crown className="w-3 h-3" /> PRO
            </span>
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
          Number of equity dips below peak
        </CardDescription>
      </CardHeader>

      <CardContent className="h-48 flex flex-col items-center justify-center relative pt-0 pb-2">
        {isPro && rawCount === 0 ? (
          <div className="flex flex-col justify-center items-center w-full h-full">
            <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">No trades found</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">There are no trades to display for this category yet. Start trading to see your statistics here!</div>
          </div>
        ) : (<>
        {/* Hover tooltip */}
        {showTooltip && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative overflow-hidden rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-100">
              {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
              <div className="relative flex flex-col">
                <div className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full shadow-sm ring-2', getTooltipDotColor())} />
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Drawdown Periods: <span className={cn('font-bold', getTextColor())}>{displayValue}</span>
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
                <linearGradient id="ddcountBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="50%" stopColor="#2563eb" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="ddcountEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="ddcountYellow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eab308" stopOpacity={1} />
                  <stop offset="50%" stopColor="#facc15" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#ca8a04" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="ddcountAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="ddcountRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity={0.9} />
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
              <Tooltip content={(props) => <CustomTooltip {...props} tooltipActiveRef={tooltipActiveRef} prevActiveRef={prevActiveRef} setShowTooltip={setShowTooltip} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Scale labels */}
        <div className="absolute top-[60%] left-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          0
        </div>
        <div className="absolute top-[60%] right-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          20
        </div>

        {/* Center value */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
          <div className={cn('text-2xl font-bold tabular-nums', getTextColor())}>
            {!isPro ? '–' : displayValue}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Target: &lt; 5
          </div>
        </div>
        </>)}
      </CardContent>
    </Card>
  );
});
