'use client';

// src/components/dashboard/ai-vision/AiVisionMetricRow.tsx
import React, { useMemo, useState, useRef } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { PeriodValue } from './MetricGaugeCard';

export interface TrendPoint {
  month: string;
  value: number;
}

interface AiVisionMetricRowProps {
  title: string;
  infoText: string;
  periods: [PeriodValue, PeriodValue, PeriodValue];
  trendData: TrendPoint[];
  formatValue: (v: number) => string;
  invertBetter?: boolean;
  gaugeMax: number;
  /** When true: renders the large gauge layout */
  showGauge?: boolean;
  targetText?: string;
  scaleLeft?: string;
  scaleRight?: string;
}

// ── Tooltips ───────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, isDark }: {
  active?: boolean; payload?: Array<{ value?: number }>; label?: string; isDark: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const val = payload[0]?.value;
  const sign = val !== undefined && val > 0 ? '+' : '';
  const cls = val !== undefined && val >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400';
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-sm shadow-md px-3 py-2">
      {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-xl" />}
      <div className="relative flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`text-sm font-bold ${cls}`}>{val !== undefined ? `${sign}${val} pts` : '—'}</span>
      </div>
    </div>
  );
}

function TrendTooltip({ active, payload, label, formatValue, isDark }: {
  active?: boolean; payload?: Array<{ value?: number }>; label?: string;
  formatValue: (v: number) => string; isDark: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const val = payload[0]?.value;
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-sm shadow-md px-3 py-2">
      {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-xl" />}
      <div className="relative flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{val !== undefined ? formatValue(val) : '—'}</span>
      </div>
    </div>
  );
}

function DeltaBadge({ current, prior, invertBetter, hasNoCurrent, hasNoPrior }: {
  current: number; prior: number; invertBetter?: boolean; hasNoCurrent: boolean; hasNoPrior: boolean;
}) {
  if (hasNoCurrent || hasNoPrior) return null;
  const delta = current - prior;
  const isGood = invertBetter ? delta < 0 : delta > 0;
  const isBad  = invertBetter ? delta > 0 : delta < 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold',
      isGood && 'text-emerald-600 dark:text-emerald-400',
      isBad  && 'text-rose-500 dark:text-rose-400',
      !isGood && !isBad && 'text-slate-400 dark:text-slate-500',
    )}>
      {isGood && <TrendingUp className="h-3 w-3" />}
      {isBad  && <TrendingDown className="h-3 w-3" />}
      {!isGood && !isBad && <Minus className="h-3 w-3" />}
    </span>
  );
}

function norm(value: number, max: number, invert: boolean): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  const pct = Math.min(1, Math.max(0, value / max));
  return (invert ? 1 - pct : pct) * 100;
}

function shortLabel(full: string) {
  return full.replace('Last ', '').replace(' days', 'd').replace(' months', 'mo').replace(' year', 'yr');
}

function InternalGaugeTooltip({ active, payload, segmentName, tooltipActiveRef, prevActiveRef, setShowTooltip }: {
  active?: boolean; payload?: Array<{ payload?: { name?: string } }>; segmentName: string;
  tooltipActiveRef: React.MutableRefObject<boolean>; prevActiveRef: React.MutableRefObject<boolean>;
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

export const AiVisionMetricRow = React.memo(function AiVisionMetricRow({
  title, infoText, periods, trendData, formatValue,
  invertBetter = false, gaugeMax,
  showGauge = false, targetText = '', scaleLeft = '0', scaleRight,
}: AiVisionMetricRowProps) {
  const { isDark } = useDarkMode();
  const { primary: colorPrimary, accent: colorAccent, accentEnd: colorAccentEnd } = useThemeColors();
  const [showGaugeTooltip, setShowGaugeTooltip] = useState(false);
  const tooltipActiveRef = useRef(false);
  const prevActiveRef    = useRef(false);
  const uid = React.useId().replace(/:/g, '');

  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const refColor  = isDark ? '#334155' : '#94a3b8';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  // ── Bar chart data (delta vs baseline) ──────────────────────────────────────
  const barData = useMemo(() => {
    const baselineNorm = norm(periods[2].hasNoTrades ? 0 : periods[2].value, gaugeMax, invertBetter);
    return [
      {
        label: shortLabel(periods[0].label),
        delta: periods[0].hasNoTrades ? 0 : parseFloat((norm(periods[0].value, gaugeMax, invertBetter) - baselineNorm).toFixed(1)),
        hasNoTrades: periods[0].hasNoTrades,
      },
      {
        label: shortLabel(periods[1].label),
        delta: periods[1].hasNoTrades ? 0 : parseFloat((norm(periods[1].value, gaugeMax, invertBetter) - baselineNorm).toFixed(1)),
        hasNoTrades: periods[1].hasNoTrades,
      },
    ];
  }, [periods, gaugeMax, invertBetter]);

  const maxAbs = Math.max(20, ...barData.map((d) => Math.abs(d.delta)));
  const domain: [number, number] = [-maxAbs, maxAbs];

  // ── Gauge data ───────────────────────────────────────────────────────────────
  const bestPeriod = periods
    .filter((p) => !p.hasNoTrades)
    .reduce<PeriodValue | null>((best, p) => {
      if (best === null) return p;
      return invertBetter ? (p.value < best.value ? p : best) : (p.value > best.value ? p : best);
    }, null);

  const percentage = bestPeriod ? Math.min(100, Math.max(0, (bestPeriod.value / gaugeMax) * 100)) : 0;
  const gaugeData  = [{ name: title, value: percentage }, { name: 'Remaining', value: 100 - percentage }];
  const scaleRightLabel = scaleRight ?? formatValue(gaugeMax);

  // ── Trend average ────────────────────────────────────────────────────────────
  const avg = trendData.length > 0 ? trendData.reduce((s, p) => s + p.value, 0) / trendData.length : undefined;

  // ── Info button ──────────────────────────────────────────────────────────────
  const infoButton = (
    <TooltipProvider>
      <UITooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex h-4 w-4 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none shrink-0" aria-label="More info">
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="end" className="w-64 text-xs rounded-2xl p-3 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm shadow-md text-slate-900 dark:text-slate-100" sideOffset={6}>
          {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
          <div className="relative"><p className="font-semibold mb-1">{title}</p><p className="text-slate-500 dark:text-slate-400">{infoText}</p></div>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );

  // ── Shared diverging bar chart ───────────────────────────────────────────────
  const barChart = (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={barData} margin={{ top: 2, right: 28, bottom: 2, left: 0 }} barCategoryGap="28%">
        <defs>
          <linearGradient id={`row-profit-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
          </linearGradient>
          <linearGradient id={`row-loss-${uid}`} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#fda4af" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity={1} />
          </linearGradient>
        </defs>
        <XAxis type="number" domain={domain} tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} tickCount={5} tickFormatter={(v: number) => (v > 0 ? `+${v}` : `${v}`)} />
        <YAxis type="category" dataKey="label" tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={34} />
        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }} wrapperStyle={{ outline: 'none', zIndex: 1000 }}
          content={(props) => (
            <ChartTooltip active={(props as unknown as { active?: boolean }).active} payload={(props as unknown as { payload?: Array<{ value?: number }> }).payload} label={props.label != null ? String(props.label) : undefined} isDark={isDark} />
          )}
        />
        <ReferenceLine x={0} stroke={refColor} strokeWidth={1.5} />
        <Bar dataKey="delta" radius={[0, 5, 5, 0]} maxBarSize={24}>
          {barData.map((entry, i) => (
            <Cell key={i} fill={entry.hasNoTrades ? (isDark ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,0.4)') : entry.delta >= 0 ? `url(#row-profit-${uid})` : `url(#row-loss-${uid})`} fillOpacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  // ── Shared trendline ─────────────────────────────────────────────────────────
  const trendChart = trendData.length < 2 ? (
    <div className="flex items-center justify-center h-full text-[11px] text-slate-400 dark:text-slate-500">Not enough history</div>
  ) : (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip cursor={{ stroke: colorAccent, strokeWidth: 1, strokeDasharray: '3 3' }} contentStyle={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }} wrapperStyle={{ outline: 'none', zIndex: 1000 }}
          content={(props) => (
            <TrendTooltip active={(props as unknown as { active?: boolean }).active} payload={(props as unknown as { payload?: Array<{ value?: number }> }).payload} label={props.label != null ? String(props.label) : undefined} formatValue={formatValue} isDark={isDark} />
          )}
        />
        {avg !== undefined && <ReferenceLine y={avg} stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth={1} strokeDasharray="4 3" />}
        <Line type="monotone" dataKey="value" stroke={colorPrimary} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: colorPrimary, stroke: gridColor, strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // GAUGE LAYOUT — gauge + pills left | stacked charts right
  // ════════════════════════════════════════════════════════════════════════════
  if (showGauge) {
    return (
      <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* ── Left: gauge + period pills ──────────────────────────────────── */}
          <div className="flex flex-col lg:w-[420px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/50 dark:border-slate-700/40">
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-6 pb-0">
              <h3 className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">{title}</h3>
              {infoButton}
            </div>

            {/* Gauge arc */}
            <div className="relative h-48 px-8">
              {showGaugeTooltip && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none animate-in fade-in duration-150">
                  <div className="relative overflow-hidden rounded-xl px-3 py-1.5 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-sm shadow-md">
                    {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-xl" />}
                    <div className="relative flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colorPrimary }} />
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{bestPeriod ? formatValue(bestPeriod.value) : '—'}</span>
                    </div>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id={`gauge-grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colorPrimary} />
                      <stop offset="50%" stopColor={colorAccent} />
                      <stop offset="100%" stopColor={colorAccentEnd} />
                    </linearGradient>
                  </defs>
                  <Pie data={gaugeData} cx="50%" cy="82%" startAngle={180} endAngle={0} innerRadius={62} outerRadius={100} paddingAngle={2} dataKey="value" cornerRadius={10}>
                    {gaugeData.map((_e, idx) => (
                      <Cell key={idx} fill={idx === 0 ? `url(#gauge-grad-${uid})` : isDark ? 'rgba(51,65,85,0.25)' : 'rgba(226,232,240,0.35)'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={(props: React.ComponentProps<typeof Tooltip>) => (
                    <InternalGaugeTooltip active={(props as { active?: boolean }).active} payload={(props as { payload?: Array<{ payload?: { name?: string } }> }).payload} segmentName={title} tooltipActiveRef={tooltipActiveRef} prevActiveRef={prevActiveRef} setShowTooltip={setShowGaugeTooltip} />
                  )} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-[68px] left-[10%] text-xs font-medium text-slate-400 dark:text-slate-500">{scaleLeft}</div>
              <div className="absolute bottom-[68px] right-[10%] text-xs font-medium text-slate-400 dark:text-slate-500">{scaleRightLabel}</div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center whitespace-nowrap pb-0 translate-y-3">
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{bestPeriod ? formatValue(bestPeriod.value) : '—'}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{bestPeriod ? `Best · ${bestPeriod.label}` : targetText}</div>
              </div>
            </div>

            {/* Period pills */}
            <div className="grid grid-cols-3 gap-3 px-7 mt-auto pb-6 pt-4">
              {periods.map((p, i) => {
                const prior = periods[i + 1];
                return (
                  <div key={p.label} className="flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 border border-slate-200/60 dark:border-slate-700/40 bg-white/30 dark:bg-slate-800/20">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center leading-tight">{p.label}</span>
                    <div className="flex items-center gap-1.5">
                      {prior && <DeltaBadge current={p.value} prior={prior.value} invertBetter={invertBetter} hasNoCurrent={p.hasNoTrades} hasNoPrior={prior.hasNoTrades} />}
                      <span className={cn('text-base font-bold', p.hasNoTrades ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100')}>
                        {p.hasNoTrades ? '—' : formatValue(p.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right: bar chart on top, trendline below ─────────────────────── */}
          <div className="flex flex-col sm:flex-row lg:flex-col flex-1 min-w-0 divide-y sm:divide-y-0 sm:divide-x lg:divide-x-0 lg:divide-y divide-slate-200/50 dark:divide-slate-700/40">
            <div className="flex-1 px-6 pt-4 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Performance vs Baseline</p>
              <div className="h-[140px]">{barChart}</div>
            </div>
            <div className="flex-1 px-6 pt-4 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Trend over time</p>
              <div className="h-[140px]">{trendChart}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COMPACT LAYOUT — bar left, trendline right
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">{title}</h3>
        {infoButton}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-60 h-[86px]">{barChart}</div>
        <div className="self-stretch w-px bg-slate-200/60 dark:bg-slate-700/40 flex-shrink-0" />
        <div className="flex-1 min-w-0 h-[86px]">{trendChart}</div>
      </div>
    </div>
  );
});
