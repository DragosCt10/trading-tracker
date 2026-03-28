'use client';

// src/components/dashboard/ai-vision/WinRateGaugeCard.tsx
import React, { useState, useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { RollingPoint } from '@/utils/calculateRollingMetrics';

interface PeriodValue {
  label: string; // e.g. "7D"
  value: number; // 0–100
  hasNoTrades: boolean;
}

export interface WinRateGaugeCardProps {
  isPro?: boolean;
  /** Win rate for the primary (most recent) period, 0–100 */
  periods: [PeriodValue, PeriodValue, PeriodValue]; // [short, mid, baseline]
  /** All rolling points for the trend line */
  rollingPoints: RollingPoint[];
}

// ── Gauge tooltip sync ────────────────────────────────────────────────────────
function InternalGaugeTooltip({
  active,
  payload,
  tooltipActiveRef,
  prevActiveRef,
  setShowTooltip,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name?: string } }>;
  tooltipActiveRef: React.MutableRefObject<boolean>;
  prevActiveRef: React.MutableRefObject<boolean>;
  setShowTooltip: (v: boolean) => void;
}) {
  const isActive = active && payload && payload.length > 0 && payload[0]?.payload?.name === 'Win Rate';
  tooltipActiveRef.current = isActive ?? false;
  if ((isActive ?? false) !== prevActiveRef.current) {
    prevActiveRef.current = isActive ?? false;
    requestAnimationFrame(() => setShowTooltip(isActive ?? false));
  }
  return null;
}

// ── Delta badge (↑ / ↓ / –) ──────────────────────────────────────────────────
function DeltaBadge({ current, prior, hasNoCurrent, hasNoPrior }: {
  current: number; prior: number; hasNoCurrent: boolean; hasNoPrior: boolean;
}) {
  if (hasNoCurrent || hasNoPrior) return <span className="text-[10px] text-slate-400 dark:text-slate-500">N/A</span>;
  const delta = current - prior;
  const isGood = delta > 0;
  const isBad  = delta < 0;
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

// ── Gradient stops — green for win rate ──────────────────────────────────────
const GRADIENT_STOPS = [
  { offset: '0%',   stopColor: '#34d399' }, // emerald-400
  { offset: '100%', stopColor: '#059669' }, // emerald-600
];

export const WinRateGaugeCard = React.memo(function WinRateGaugeCard({
  isPro,
  periods,
  rollingPoints,
}: WinRateGaugeCardProps) {
  const { mounted, isDark } = useDarkMode();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipActiveRef = useRef(false);
  const prevActiveRef    = useRef(false);

  const uid        = React.useId().replace(/:/g, '');
  const gradientId = `wr-gauge-${uid}`;

  const [primary, secondary, baseline] = periods;

  // Use primary period for the gauge arc
  const percentage = primary.hasNoTrades ? 0 : Math.min(100, Math.max(0, primary.value));
  const remaining  = 100 - percentage;

  // Best win rate across all non-empty periods
  const bestPeriod = periods
    .filter((p) => !p.hasNoTrades)
    .reduce<PeriodValue | null>((best, p) => (best === null || p.value > best.value ? p : best), null);

  const gaugeData = [
    { name: 'Win Rate',  value: percentage },
    { name: 'Remaining', value: remaining  },
  ];

  // Trend line data
  const trendData = rollingPoints.map((p) => ({
    date:  p.date,
    value: p.metrics.winRate as number,
  }));

  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const lineColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 dark / slate-500 light

  // Mounted guard — avoid hydration flash
  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Win Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72" />
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <CardHeader className="pb-0 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Win Rate
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
                  <p className="font-semibold mb-1">Win Rate</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Percentage of trades that closed with a profit. Higher is better. 50%+ is generally considered acceptable.
                  </p>
                </div>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4 px-4 flex flex-col gap-3">
        {/* ── Gauge ─────────────────────────────────────────────────────────── */}
        <div className="relative h-40 pb-10">
          {/* Hover tooltip — appears above gauge */}
          {showTooltip && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
              <div className="relative overflow-hidden rounded-xl px-3 py-2 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-sm shadow-md text-slate-900 dark:text-slate-100">
                {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-xl" />}
                <div className="relative flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm ring-2 ring-emerald-500/30" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Win Rate: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{percentage.toFixed(1)}%</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  {GRADIENT_STOPS.map((s, i) => (
                    <stop key={i} offset={s.offset} stopColor={s.stopColor} />
                  ))}
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
                    tooltipActiveRef={tooltipActiveRef}
                    prevActiveRef={prevActiveRef}
                    setShowTooltip={setShowTooltip}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Scale labels */}
          <div className="absolute top-[62%] left-5 text-[10px] font-medium text-slate-400 dark:text-slate-500">0%</div>
          <div className="absolute top-[62%] right-5 text-[10px] font-medium text-slate-400 dark:text-slate-500">100%</div>

          {/* Center value */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {bestPeriod ? `${bestPeriod.value.toFixed(1)}%` : '—'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {bestPeriod ? `Best · ${bestPeriod.label}` : 'No data'}
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
                  i === 0 && 'border-slate-300/60 dark:border-slate-600/50 bg-white/40 dark:bg-slate-700/20',
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
                      hasNoCurrent={p.hasNoTrades}
                      hasNoPrior={prior.hasNoTrades}
                    />
                  )}
                  <span className={cn(
                    'text-sm font-bold',
                    p.hasNoTrades ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100',
                  )}>
                    {p.hasNoTrades ? '—' : `${p.value.toFixed(1)}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Trend line ───────────────────────────────────────────────────── */}
        <div className="border-slate-200/50 dark:border-slate-700/40 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
            Win Rate over time
          </p>
          {trendData.length < 2 ? (
            <div className="flex items-center justify-center h-16 text-[11px] text-slate-400 dark:text-slate-500">
              Not enough data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: tickColor, fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d: string) => d.slice(5)} // MM-DD
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: isDark ? '#1e293b' : '#fff',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 11,
                    color: isDark ? '#e2e8f0' : '#1e293b',
                  }}
                  formatter={(v) => [`${(v as number).toFixed(1)}%`, 'Win Rate']}
                  labelFormatter={(d) => String(d ?? '')}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
