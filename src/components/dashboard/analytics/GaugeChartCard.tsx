'use client';

import React, { useState, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Crown } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';

export interface GradientStop {
  offset: string;
  stopColor: string;
  stopOpacity?: number;
}

export interface GaugeChartCardProps {
  // Card header
  title: string;
  description: string;
  isPro?: boolean;

  // Empty state (PRO users with no data)
  isEmpty?: boolean;

  // Gauge
  percentage: number;        // 0–100
  dataName: string;          // name for the filled segment (tooltip filter)
  gradientStops: GradientStop[];

  // Scale labels
  scaleLeft: string;
  scaleRight: string;

  // Center display
  centerValue: React.ReactNode;
  targetText: string;

  // Hover tooltip
  hoverLabel: string;
  hoverValue: string;
  hoverValueColor: string;
  hoverDotColor: string;
  hoverSubtext: string;

  // Info (ⓘ) tooltip content
  infoContent: React.ReactNode;

  // Show PRO badge in header when unlocked (ExpectancyCard pattern)
  showProBadgeWhenUnlocked?: boolean;
}

function InternalCustomTooltip({
  active,
  payload,
  dataName,
  tooltipActiveRef,
  prevActiveRef,
  setShowTooltip,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name?: string } }>;
  dataName: string;
  tooltipActiveRef: React.MutableRefObject<boolean>;
  prevActiveRef: React.MutableRefObject<boolean>;
  setShowTooltip: (v: boolean) => void;
}) {
  const isActive = active && payload && payload.length > 0 && payload[0]?.payload?.name === dataName;
  tooltipActiveRef.current = isActive ?? false;
  if ((isActive ?? false) !== prevActiveRef.current) {
    prevActiveRef.current = isActive ?? false;
    requestAnimationFrame(() => setShowTooltip(isActive ?? false));
  }
  return null;
}

export const GaugeChartCard = React.memo(function GaugeChartCard({
  title,
  description,
  isPro,
  isEmpty = false,
  percentage,
  dataName,
  gradientStops,
  scaleLeft,
  scaleRight,
  centerValue,
  targetText,
  hoverLabel,
  hoverValue,
  hoverValueColor,
  hoverDotColor,
  hoverSubtext,
  infoContent,
  showProBadgeWhenUnlocked = false,
}: GaugeChartCardProps) {
  const isLocked = !isPro;
  const { mounted, isDark } = useDarkMode();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipActiveRef = useRef(false);
  const prevActiveRef = useRef(false);

  // Unique gradient ID per instance — fixes SVG gradient ID collision when multiple charts render simultaneously
  const uid = React.useId().replace(/:/g, '');
  const gradientId = `gauge-fill-${uid}`;

  const remainingPercentage = 100 - percentage;
  const data = [
    { name: dataName, value: percentage },
    { name: 'Remaining', value: remainingPercentage },
  ];

  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            {title}
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            {description}
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
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {showProBadgeWhenUnlocked && !isLocked && (
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" /> PRO
                </span>
              )}
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
                    <div className="relative">{infoContent}</div>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
          </div>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="h-48 flex flex-col items-center justify-center relative pt-0 pb-10">
          {isEmpty ? (
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">No trades found</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                There are no trades to display for this category yet. Start trading to see your statistics here!
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
                        <div className={cn('h-2 w-2 rounded-full shadow-sm ring-2', hoverDotColor)} />
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {hoverLabel}:{' '}
                          <span className={cn('font-bold', hoverValueColor)}>{hoverValue}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 ml-4 font-medium">
                        {hoverSubtext}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        {gradientStops.map((stop, i) => (
                          <stop
                            key={i}
                            offset={stop.offset}
                            stopColor={stop.stopColor}
                            stopOpacity={stop.stopOpacity ?? 1}
                          />
                        ))}
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
                      {data.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0
                              ? `url(#${gradientId})`
                              : isDark
                              ? 'rgba(51, 65, 85, 0.2)'
                              : 'rgba(226, 232, 240, 0.3)'
                          }
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={(props: any) => (
                        <InternalCustomTooltip
                          {...props}
                          dataName={dataName}
                          tooltipActiveRef={tooltipActiveRef}
                          prevActiveRef={prevActiveRef}
                          setShowTooltip={setShowTooltip}
                        />
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Scale labels */}
              <div className="absolute top-[60%] left-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                {scaleLeft}
              </div>
              <div className="absolute top-[60%] right-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                {scaleRight}
              </div>

              {/* Center value */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
                <div className="text-2xl font-bold">{centerValue}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{targetText}</div>
              </div>
            </>
          )}
        </CardContent>
      </div>
    </Card>
  );
});
