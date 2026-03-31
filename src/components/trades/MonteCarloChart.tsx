'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ReferenceLine,
} from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { MonteCarloPoint } from '@/utils/monteCarloSimulation';

type DisplayMode = 'r' | 'dollar';

interface TooltipData {
  index: number;
  // original percentile values (for tooltip display)
  p10: number; p25: number; p50: number; p75: number; p90: number;
}

const MonteCarloTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: TooltipData }>;
  isDark: boolean;
  mode: DisplayMode;
  currencySymbol: string;
}> = ({ active, payload, isDark, mode, currencySymbol }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  const fmt = (val: number) =>
    mode === 'r'
      ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}R`
      : `${val >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const row = (label: string, value: number, color: string) => (
    <div key={label} className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        {label}
      </span>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {fmt(value)}
      </span>
    </div>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 min-w-[190px]">
      {isDark && (
        <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />
      )}
      <div className="relative flex flex-col gap-2">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
          Trade #{d.index}
        </p>
        {row('90th pct', d.p90, 'var(--tc-primary, #8b5cf6)')}
        {row('75th pct', d.p75, 'var(--tc-primary, #8b5cf6)')}
        {row('Median', d.p50, 'var(--tc-accent, #6d28d9)')}
        {row('25th pct', d.p25, '#f43f5e')}
        {row('10th pct', d.p10, '#f43f5e')}
      </div>
    </div>
  );
};

export interface MonteCarloChartProps {
  data: MonteCarloPoint[];
  mode: DisplayMode;
  currencySymbol: string;
}

export const MonteCarloChart: React.FC<MonteCarloChartProps> = ({
  data,
  mode,
  currencySymbol,
}) => {
  const { isDark } = useDarkMode();

  // Resolve which percentile fields to use based on mode
  const pick = (point: MonteCarloPoint) =>
    mode === 'r'
      ? { p10: point.p10, p25: point.p25, p50: point.p50, p75: point.p75, p90: point.p90 }
      : { p10: point.d10, p25: point.d25, p50: point.d50, p75: point.d75, p90: point.d90 };

  // Transform to stacked format to handle negative ranges.
  // offset lifts all values so the minimum (p10 at worst step) is ≥ 0.5.
  const { chartData, offset } = useMemo(() => {
    if (data.length === 0) return { chartData: [], offset: 0 };

    const minVal = Math.min(...data.map((d) => pick(d).p10));
    const off = minVal < 0 ? Math.abs(minVal) + (mode === 'r' ? 0.5 : 1) : mode === 'r' ? 0.5 : 1;

    const points = data.map((d) => {
      const { p10, p25, p50, p75, p90 } = pick(d);
      return {
        index: d.tradeIndex,
        base: p10 + off,
        band1: p25 - p10,
        band2: p50 - p25,
        band3: p75 - p50,
        band4: p90 - p75,
        median: p50 + off,
        // Keep original values for tooltip
        p10, p25, p50, p75, p90,
        offset: off,
      };
    });

    return { chartData: points, offset: off };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mode]);

  const axisColor = isDark ? '#64748b' : '#94a3b8';
  const zeroLine = isDark ? '#475569' : '#cbd5e1';

  const formatAxis = (shifted: number) => {
    const raw = shifted - offset;
    if (mode === 'r') {
      return `${raw >= 0 ? '+' : ''}${raw.toFixed(1)}R`;
    }
    const abs = Math.abs(raw);
    const sign = raw >= 0 ? '+' : '-';
    if (abs >= 1000) return `${sign}${currencySymbol}${(abs / 1000).toFixed(1)}k`;
    return `${sign}${currencySymbol}${abs.toFixed(0)}`;
  };

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
        <defs>
          <linearGradient id="mc-band4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--tc-primary, #8b5cf6)" stopOpacity={0.12} />
            <stop offset="100%" stopColor="var(--tc-primary, #8b5cf6)" stopOpacity={0.06} />
          </linearGradient>
          <linearGradient id="mc-band3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--tc-primary, #8b5cf6)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--tc-primary, #8b5cf6)" stopOpacity={0.14} />
          </linearGradient>
          <linearGradient id="mc-band2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.28} />
          </linearGradient>
          <linearGradient id="mc-band1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.06} />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.12} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="index"
          tick={{ fill: axisColor, fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `#${v}`}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tick={{ fill: axisColor, fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatAxis}
          width={mode === 'dollar' ? 64 : 52}
        />

        <ReTooltip
          content={
            <MonteCarloTooltip isDark={isDark} mode={mode} currencySymbol={currencySymbol} />
          }
          cursor={{ stroke: isDark ? '#475569' : '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 2' }}
        />

        {/* Zero reference line */}
        <ReferenceLine
          y={offset}
          stroke={zeroLine}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        {/* Invisible base layer (bottom of p10) */}
        <Area type="monotone" dataKey="base" stackId="mc" fill="transparent" stroke="none" isAnimationActive={false} />
        {/* p10 → p25: worst outer (red faint) */}
        <Area type="monotone" dataKey="band1" stackId="mc" fill="url(#mc-band1)" stroke="none" isAnimationActive={false} />
        {/* p25 → p50: lower inner (red) */}
        <Area type="monotone" dataKey="band2" stackId="mc" fill="url(#mc-band2)" stroke="none" isAnimationActive={false} />
        {/* p50 → p75: upper inner (primary) */}
        <Area type="monotone" dataKey="band3" stackId="mc" fill="url(#mc-band3)" stroke="none" isAnimationActive={false} />
        {/* p75 → p90: best outer (primary faint) */}
        <Area type="monotone" dataKey="band4" stackId="mc" fill="url(#mc-band4)" stroke="none" isAnimationActive={false} />

        {/* Median line */}
        <Line
          type="monotone"
          dataKey="median"
          stroke="var(--tc-primary, #8b5cf6)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--tc-primary, #8b5cf6)', strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
