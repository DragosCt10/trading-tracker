'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { calculateTradeQualityIndex } from '@/utils/calculateTradeQualityIndex';

/* ---------------------------------------------------------
 * Constants & helpers
 * ------------------------------------------------------ */

interface TQIChartProps {
  tradesToUse: Trade[];
}

export const TQIChart = React.memo(function TQIChart({ tradesToUse }: TQIChartProps) {
  // Calculate TQI from trades
  const tradeQualityIndex = useMemo(() => {
    return calculateTradeQualityIndex(tradesToUse);
  }, [tradesToUse]);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipActiveRef = React.useRef(false);
  const prevActiveRef = React.useRef(false);

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

  const tqiValue = tradeQualityIndex ?? 0;

  // Normalize TQI to 0-100% for display (TQI is already 0-1 scale, so multiply by 100)
  const normalizedValue = Math.max(0, Math.min(tqiValue, 1));
  const percentage = normalizedValue * 100;
  const remainingPercentage = 100 - percentage;

  const data = [
    { name: 'TQI', value: percentage },
    { name: 'Remaining', value: remainingPercentage },
  ];

  // Determine color based on TQI value (higher is better)
  const getGradientId = () => {
    if (tqiValue < 0.20) return 'tqiOrange';
    if (tqiValue < 0.30) return 'tqiOrangeLight';
    if (tqiValue < 0.40) return 'tqiAmber';
    if (tqiValue < 0.55) return 'tqiEmerald';
    return 'tqiBlue';
  };

  const getTextColor = () => {
    if (tqiValue < 0.20) return 'text-orange-600 dark:text-orange-400';
    if (tqiValue < 0.30) return 'text-orange-500 dark:text-orange-400';
    if (tqiValue < 0.40) return 'text-amber-600 dark:text-amber-400';
    if (tqiValue < 0.55) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getTooltipDotColor = () => {
    if (tqiValue < 0.20) return 'bg-orange-500 dark:bg-orange-400 ring-orange-200/50 dark:ring-orange-500/30';
    if (tqiValue < 0.30) return 'bg-orange-400 dark:bg-orange-400 ring-orange-200/50 dark:ring-orange-500/30';
    if (tqiValue < 0.40) return 'bg-amber-500 dark:bg-amber-400 ring-amber-200/50 dark:ring-amber-500/30';
    if (tqiValue < 0.55) return 'bg-emerald-500 dark:bg-emerald-400 ring-emerald-200/50 dark:ring-emerald-500/30';
    return 'bg-blue-500 dark:bg-blue-400 ring-blue-200/50 dark:ring-blue-500/30';
  };

  const getTooltipValueColor = () => {
    if (tqiValue < 0.20) return 'text-orange-600 dark:text-orange-400';
    if (tqiValue < 0.30) return 'text-orange-500 dark:text-orange-400';
    if (tqiValue < 0.40) return 'text-amber-600 dark:text-amber-400';
    if (tqiValue < 0.55) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const tooltipContent = (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        TQI (Trade Quality Index) Interpretation
      </div>
      <div className="space-y-2">
        <div className={cn("rounded-xl p-2.5 transition-all", tqiValue < 0.20 ? "bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🔸 &lt; 0.20</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Needs Development — Limited consistency so far. Strategy may need work or more data.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", tqiValue >= 0.20 && tqiValue < 0.30 ? "bg-orange-100/80 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟠 0.20 – 0.29</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Early Stage Consistency — Some positive signs, but outcomes are still variable. Keep refining.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", tqiValue >= 0.30 && tqiValue < 0.40 ? "bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟡 0.30 – 0.39</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Moderate Stability — Shows repeatable elements and more robustness. Keep improving.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", tqiValue >= 0.40 && tqiValue < 0.55 ? "bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">🟢 0.40 – 0.55</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strong Quality — Good consistency and solid results across conditions.</div>
        </div>
        <div className={cn("rounded-xl p-2.5 transition-all", tqiValue >= 0.55 ? "bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30" : "bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30")}>
          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">💎 0.55+</span>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Exceptional Quality — Very strong and reliable performance. The strategy is well-refined.</div>
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
            TQI
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Trade Quality Index
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
            TQI
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
          Trade Quality Index
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
                  TQI: <span className={cn("font-bold", getTooltipValueColor())}>
                    {tradeQualityIndex !== null && tradeQualityIndex !== undefined ? tradeQualityIndex.toFixed(2) : '—'}
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
              <linearGradient id="tqiOrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="tqiOrangeLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" stopOpacity={1} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="tqiAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                <stop offset="100%" stopColor="#d97706" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="tqiEmerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="tqiBlue" x1="0" y1="0" x2="0" y2="1">
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
          1.0
        </div>
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
          <div className={cn('text-2xl font-bold', getTextColor())}>
            {tradeQualityIndex !== null && tradeQualityIndex !== undefined ? tradeQualityIndex.toFixed(2) : '—'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Target: 0.30+
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
