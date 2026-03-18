'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar as ReBar,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from 'recharts';
import { formatPercent } from '@/lib/utils';

export interface BarWinRateChartDatum {
  wins?: number;
  losses?: number;
  breakEven?: number;
  winRate?: number;
  winRateWithBE?: number;
  totalTrades?: number;
}

export interface ComposedBarWinRateChartProps {
  data: BarWinRateChartDatum[];
  /** dataKey for the XAxis (e.g. "day", "month", "category") */
  xAxisDataKey: string;
  /** Tick label formatter for XAxis */
  xAxisTickFormatter: (value: string, index: number) => string;
  /** Returns the header string shown in the tooltip for a given datum */
  tooltipHeaderGetter: (datum: Record<string, unknown>) => string;
  isDark: boolean;
  beCalcEnabled: boolean;
  /** Unique prefix for SVG gradient IDs — must differ between chart instances on the same page */
  idPrefix: string;
  /** Render a filled Area behind the bars for totalTrades. Default: true */
  showArea?: boolean;
  /** Render right YAxis + win-rate Line. Default: true */
  showWinRateLine?: boolean;
  margins?: { top?: number; right?: number; left?: number; bottom?: number };
  /** Passed directly to ComposedChart (e.g. "20%" for TimeIntervalStatisticsCard) */
  barCategoryGap?: string | number;
  /** activeDot prop for the win-rate Line. Default: false */
  lineActiveDot?: boolean | Record<string, unknown>;
}

function ChartTooltip({
  active,
  payload,
  isDark,
  beCalcEnabled,
  tooltipHeaderGetter,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Record<string, unknown> }>;
  isDark?: boolean;
  beCalcEnabled: boolean;
  tooltipHeaderGetter: (datum: Record<string, unknown>) => string;
}) {
  if (!active || !payload?.length) return null;
  const rawDatum = payload[0].payload;
  if (!rawDatum) return null;

  const d = rawDatum as BarWinRateChartDatum;
  const wins = d.wins ?? 0;
  const losses = d.losses ?? 0;
  const breakEven = d.breakEven ?? 0;
  const winRate = d.winRate ?? 0;
  const winRateWithBE = d.winRateWithBE ?? 0;
  const totalTrades = d.totalTrades ?? wins + losses + breakEven;
  const headerLabel = tooltipHeaderGetter(rawDatum);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-100">
      {isDark && <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />}
      <div className="relative flex flex-col gap-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {headerLabel}{' '}
          {typeof totalTrades === 'number'
            ? `(${totalTrades} trade${totalTrades === 1 ? '' : 's'})`
            : ''}
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{wins}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses</span>
            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{losses}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Break Even</span>
            <span className="text-lg font-bold text-slate-600 dark:text-slate-300">{breakEven}</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatPercent(beCalcEnabled ? winRateWithBE : winRate)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_MARGINS = { top: 30, right: 56, left: 56, bottom: 10 };

export const ComposedBarWinRateChart = React.memo(function ComposedBarWinRateChart({
  data,
  xAxisDataKey,
  xAxisTickFormatter,
  tooltipHeaderGetter,
  isDark,
  beCalcEnabled,
  idPrefix,
  showArea = true,
  showWinRateLine = true,
  margins,
  barCategoryGap,
  lineActiveDot = false,
}: ComposedBarWinRateChartProps) {
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b';

  const maxTotal = Math.max(
    ...data.map((d) => (d.wins ?? 0) + (d.losses ?? 0) + (d.breakEven ?? 0)),
    ...data.map((d) => d.totalTrades ?? 0),
    1
  );

  const yAxisTickFormatter = (value: number) =>
    Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

  const leftAxisLabel = (props: { viewBox?: { x?: number; y?: number; width?: number; height?: number } }) => {
    const vb = props.viewBox ?? {};
    const x = (vb.x ?? 0) + 6;
    const y = (vb.y ?? 0) + (vb.height ?? 0) / 2;
    return (
      <text x={x} y={y} textAnchor="middle" fill={axisTextColor} fontSize={12} fontWeight={500} transform={`rotate(-90, ${x}, ${y})`}>
        Wins / Losses
      </text>
    );
  };

  const rightAxisLabel = (props: { viewBox?: { x?: number; y?: number; width?: number; height?: number } }) => {
    const vb = props.viewBox ?? {};
    const x = (vb.x ?? 0) + (vb.width ?? 0) + 8;
    const y = (vb.y ?? 0) + (vb.height ?? 0) / 2;
    return (
      <text x={x} y={y} textAnchor="middle" fill={axisTextColor} fontSize={12} fontWeight={500} transform={`rotate(90, ${x}, ${y})`}>
        Win Rate
      </text>
    );
  };

  const mergedMargins = { ...DEFAULT_MARGINS, ...margins };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={mergedMargins}
        {...(barCategoryGap !== undefined ? { barCategoryGap } : {})}
      >
        <defs>
          <linearGradient id={`${idPrefix}TotalArea`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.2} />
            <stop offset="100%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={`${idPrefix}WinsBar`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id={`${idPrefix}LossesBar`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
            <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id={`${idPrefix}BreakEvenBar`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#64748b" stopOpacity={1} />
            <stop offset="50%" stopColor="#475569" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#334155" stopOpacity={0.9} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey={xAxisDataKey}
          type="category"
          axisLine={false}
          tickLine={false}
          tick={{ fill: axisTextColor, fontSize: 11 }}
          tickFormatter={xAxisTickFormatter}
          height={38}
        />
        <YAxis
          yAxisId="left"
          type="number"
          tick={{ fill: axisTextColor, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={yAxisTickFormatter}
          domain={[0, Math.ceil(maxTotal * 1.15)]}
          width={56}
          tickMargin={8}
          label={leftAxisLabel}
        />
        {showWinRateLine && (
          <YAxis
            yAxisId="right"
            orientation="right"
            type="number"
            tick={{ fill: axisTextColor, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
            domain={[0, 100]}
            width={56}
            tickMargin={8}
            label={rightAxisLabel}
          />
        )}

        <ReTooltip
          contentStyle={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none', minWidth: '180px' }}
          wrapperStyle={{ outline: 'none', zIndex: 1000 }}
          cursor={{ stroke: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.4)', strokeWidth: 1 }}
          content={(props) => (
            <ChartTooltip
              {...props}
              isDark={isDark}
              beCalcEnabled={beCalcEnabled}
              tooltipHeaderGetter={tooltipHeaderGetter}
            />
          )}
        />

        {showArea && (
          <Area
            type="monotone"
            dataKey="totalTrades"
            name="Total"
            yAxisId="left"
            fill={`url(#${idPrefix}TotalArea)`}
            stroke="none"
          />
        )}

        <ReBar dataKey="wins" name="Wins" fill={`url(#${idPrefix}WinsBar)`} radius={[7, 7, 7, 7]} barSize={18} yAxisId="left" />
        <ReBar dataKey="losses" name="Losses" fill={`url(#${idPrefix}LossesBar)`} radius={[7, 7, 7, 7]} barSize={18} yAxisId="left" />
        <ReBar dataKey="breakEven" name="Break Even" fill={`url(#${idPrefix}BreakEvenBar)`} radius={[7, 7, 7, 7]} barSize={18} yAxisId="left" />

        {showWinRateLine && (
          <Line
            type="monotone"
            dataKey="winRate"
            name="Win Rate"
            yAxisId="right"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={lineActiveDot as boolean}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
});
