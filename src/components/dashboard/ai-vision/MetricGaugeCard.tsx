'use client';

// src/components/dashboard/ai-vision/MetricGaugeCard.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';
import { COLOR_THEMES, DEFAULT_THEME_COLORS, type ColorThemeId } from '@/constants/colorThemes';

export interface PeriodValue {
  label: string;
  value: number;
  hasNoTrades: boolean;
}

export interface MetricGaugeCardProps {
  title: string;
  infoText: string;
  periods: [PeriodValue, PeriodValue, PeriodValue];
  formatValue: (v: number) => string;
  /** Raw value that maps to 100% arc fill */
  gaugeMax: number;
  /** Lower is better (e.g. maxDrawdown). Flips best-period logic and delta badge colors. */
  invertBetter?: boolean;
  targetText: string;
  scaleLeft?: string;
  scaleRight?: string;
  isPro?: boolean;
}

// ── Gauge tooltip sync ────────────────────────────────────────────────────────
function InternalGaugeTooltip({
  active,
  payload,
  segmentName,
  tooltipActiveRef,
  prevActiveRef,
  setShowTooltip,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name?: string } }>;
  segmentName: string;
  tooltipActiveRef: React.MutableRefObject<boolean>;
  prevActiveRef: React.MutableRefObject<boolean>;
  setShowTooltip: (v: boolean) => void;
}) {
  const isActive = active && payload && payload.length > 0 && payload[0]?.payload?.name === segmentName;
  tooltipActiveRef.current = isActive ?? false;
  if ((isActive ?? false) !== prevActiveRef.current) {
    prevActiveRef.current = isActive ?? false;
    requestAnimationFrame(() => setShowTooltip(isActive ?? false));
  }
  return null;
}

// ── Delta badge ───────────────────────────────────────────────────────────────
function DeltaBadge({ current, prior, invertBetter, hasNoCurrent, hasNoPrior }: {
  current: number; prior: number; invertBetter?: boolean;
  hasNoCurrent: boolean; hasNoPrior: boolean;
}) {
  if (hasNoCurrent || hasNoPrior) return <span className="text-[10px] text-slate-400 dark:text-slate-500">N/A</span>;
  const delta  = current - prior;
  const isGood = invertBetter ? delta < 0 : delta > 0;
  const isBad  = invertBetter ? delta > 0 : delta < 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-semibold',
      isGood && 'text-green-600 dark:text-green-400',
      isBad  && 'text-red-500 dark:text-red-400',
      !isGood && !isBad && 'text-slate-400 dark:text-slate-500',
    )}>
      {isGood && <TrendingUp className="h-2.5 w-2.5" />}
      {isBad  && <TrendingDown className="h-2.5 w-2.5" />}
      {!isGood && !isBad && <Minus className="h-2.5 w-2.5" />}
    </span>
  );
}

export const MetricGaugeCard = React.memo(function MetricGaugeCard({
  title,
  infoText,
  periods,
  formatValue,
  gaugeMax,
  invertBetter = false,
  targetText,
  scaleLeft = '0',
  scaleRight,
  isPro: _isPro,
}: MetricGaugeCardProps) {
  const { mounted, isDark } = useDarkMode();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipActiveRef = useRef(false);
  const prevActiveRef    = useRef(false);

  // Reactive theme colors: read from COLOR_THEMES on mount + whenever data-color-theme changes
  const [themeColors, setThemeColors] = useState(DEFAULT_THEME_COLORS);
  useEffect(() => {
    const readColors = () => {
      const id = document.documentElement.getAttribute('data-color-theme') as ColorThemeId | null;
      setThemeColors(COLOR_THEMES.find(t => t.id === id)?.colors ?? DEFAULT_THEME_COLORS);
    };
    readColors();
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-theme'] });
    return () => mo.disconnect();
  }, []);
  const { primary: colorPrimary, accent: colorAccent, accentEnd: colorAccentEnd } = themeColors;

  const uid        = React.useId().replace(/:/g, '');
  const gradientId = `mg-${uid}`;

  // Best period: highest for normal, lowest for inverted
  const bestPeriod = periods
    .filter((p) => !p.hasNoTrades)
    .reduce<PeriodValue | null>((best, p) => {
      if (best === null) return p;
      return invertBetter ? (p.value < best.value ? p : best) : (p.value > best.value ? p : best);
    }, null);

  // Arc fill based on best period (matches center value)
  // Always show the raw proportion — invertBetter only affects best-period
  // selection and delta badge colors, not the arc fill itself.
  const percentage = bestPeriod
    ? Math.min(100, Math.max(0, (bestPeriod.value / gaugeMax) * 100))
    : 0;
  const remaining  = 100 - percentage;

  const gaugeData = [
    { name: title,       value: percentage },
    { name: 'Remaining', value: remaining  },
  ];

  const scaleRightLabel = scaleRight ?? formatValue(gaugeMax);

  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48" />
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <CardHeader className="pb-0 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            {title}
          </CardTitle>
          <TooltipProvider>
            <UITooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none shrink-0"
                  aria-label="More info"
                >
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                className="w-64 text-xs rounded-2xl p-3 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm shadow-md text-slate-900 dark:text-slate-100"
                sideOffset={6}
              >
                {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
                <div className="relative">
                  <p className="font-semibold mb-1">{title}</p>
                  <p className="text-slate-500 dark:text-slate-400">{infoText}</p>
                </div>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4 px-4 flex flex-col gap-3">
        {/* ── Gauge ─────────────────────────────────────────────────────────── */}
        <div className="relative h-40 pb-10">
          {showTooltip && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
              <div className="relative overflow-hidden rounded-xl px-3 py-2 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-sm shadow-md">
                {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-xl" />}
                <div className="relative flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full shadow-sm ring-2" style={{ backgroundColor: colorPrimary }} />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {title}: <span className="font-bold" style={{ color: colorPrimary }}>{bestPeriod ? formatValue(bestPeriod.value) : '—'}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={colorPrimary}   />
                  <stop offset="50%"  stopColor={colorAccent}    />
                  <stop offset="100%" stopColor={colorAccentEnd} />
                </linearGradient>
              </defs>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="85%"
                startAngle={180}
                endAngle={0}
                innerRadius={45}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                cornerRadius={7}
              >
                {gaugeData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      index === 0
                        ? `url(#${gradientId})`
                        : isDark
                        ? 'rgba(51,65,85,0.25)'
                        : 'rgba(226,232,240,0.35)'
                    }
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                content={(props: React.ComponentProps<typeof Tooltip>) => (
                  <InternalGaugeTooltip
                    active={(props as { active?: boolean }).active}
                    payload={(props as { payload?: Array<{ payload?: { name?: string } }> }).payload}
                    segmentName={title}
                    tooltipActiveRef={tooltipActiveRef}
                    prevActiveRef={prevActiveRef}
                    setShowTooltip={setShowTooltip}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Scale labels */}
          <div className="absolute top-[62%] left-5 text-[10px] font-medium text-slate-400 dark:text-slate-500">{scaleLeft}</div>
          <div className="absolute top-[62%] right-5 text-[10px] font-medium text-slate-400 dark:text-slate-500">{scaleRightLabel}</div>

          {/* Center value — best across periods */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {bestPeriod ? formatValue(bestPeriod.value) : '—'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {bestPeriod ? `Best · ${bestPeriod.label}` : targetText}
            </div>
          </div>
        </div>

        {/* ── Period comparison row ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-1.5">
          {periods.map((p, i) => {
            const prior = periods[i + 1];
            return (
              <div
                key={p.label}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5',
                  'border border-slate-200/60 dark:border-slate-700/40',
                  'bg-white/30 dark:bg-slate-800/20',
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {p.label}
                </span>
                <div className="flex items-center gap-1">
                  {prior && (
                    <DeltaBadge
                      current={p.value}
                      prior={prior.value}
                      invertBetter={invertBetter}
                      hasNoCurrent={p.hasNoTrades}
                      hasNoPrior={prior.hasNoTrades}
                    />
                  )}
                  <span className={cn(
                    'text-sm font-bold',
                    p.hasNoTrades ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100',
                  )}>
                    {p.hasNoTrades ? '—' : formatValue(p.value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
