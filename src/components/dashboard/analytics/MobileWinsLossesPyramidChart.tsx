'use client';

/**
 * MobileWinsLossesPyramidChart
 * Reusable horizontal diverging bar chart (population-pyramid style) for
 * wins / losses data — wins extend right (green), losses extend left (red).
 *
 * Used by ComposedBarWinRateChart on mobile, which powers:
 *   MonthlyPerformanceChart, MarketStatisticsCard, TimeIntervalStatisticsCard,
 *   DayStatisticsCard, NewsNameChartCard, SetupStatisticsCard, LiquidityStatisticsCard.
 *
 * Recharts stacking note: two bars sharing the same stackId with mixed ± values
 * each diverge from x=0 — positives grow right, negatives grow left — giving
 * the classic population-pyramid layout without any custom shapes.
 */

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Bar as ReBar,
  LabelList,
  ReferenceLine,
  Tooltip as ReTooltip,
} from 'recharts';
import { formatPercent } from '@/lib/utils';
import type { BarWinRateChartDatum } from './ComposedBarWinRateChart';

/* ------------------------------------------------------------------ */
/* Tooltip (mirrors ComposedBarWinRateChart's ChartTooltip)            */
/* ------------------------------------------------------------------ */

function PyramidTooltip({
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-100">
      {isDark && (
        <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />
      )}
      <div className="relative flex flex-col gap-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {headerLabel}
          {typeof totalTrades === 'number'
            ? ` (${totalTrades} trade${totalTrades === 1 ? '' : 's'})`
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

/* ------------------------------------------------------------------ */
/* Public interface                                                     */
/* ------------------------------------------------------------------ */

export interface MobileWinsLossesPyramidChartProps {
  data: (BarWinRateChartDatum & Record<string, unknown>)[];
  /** dataKey used as Y-axis category label (e.g. "category", "day", "month") */
  labelKey: string;
  /** Formats each Y-axis tick label; receives (value, index) */
  labelFormatter?: (value: string, index: number) => string;
  /** Returns tooltip header string for a datum */
  tooltipHeaderGetter: (datum: Record<string, unknown>) => string;
  isDark: boolean;
  beCalcEnabled: boolean;
  /** Unique prefix for SVG gradient IDs */
  idPrefix: string;
  /** Y-axis width in px (default: 96) */
  yAxisWidth?: number;
  /** Bar height in px (default: 12) */
  barSize?: number;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function MobileWinsLossesPyramidChart({
  data,
  labelKey,
  labelFormatter,
  tooltipHeaderGetter,
  isDark,
  beCalcEnabled,
  idPrefix,
  yAxisWidth = 96,
  barSize = 12,
}: MobileWinsLossesPyramidChartProps) {
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b';

  // Negate losses so they extend left from 0
  const pyramidData = data.map((d) => ({
    ...d,
    lossNeg: -(d.losses ?? 0),
  }));

  const maxAbs = Math.max(
    ...data.map((d) => d.wins ?? 0),
    ...data.map((d) => d.losses ?? 0),
    1,
  );

  // Compute height dynamically: each row ~38px + top/bottom margins + x-axis
  const chartHeight = Math.max(data.length * 38 + 40, 200);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        layout="vertical"
        data={pyramidData}
        margin={{ top: 12, right: 52, left: 0, bottom: 20 }}
        barCategoryGap="20%"
        barGap={-barSize}
      >
        <defs>
          <linearGradient id={`${idPrefix}WinsH`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={1} />
          </linearGradient>
          <linearGradient id={`${idPrefix}LossesH`} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#e11d48" stopOpacity={1} />
          </linearGradient>
        </defs>

        <XAxis
          type="number"
          domain={[-maxAbs, maxAbs]}
          tick={{ fill: axisTextColor, fontSize: 10, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => String(Math.abs(v))}
          tickCount={7}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey={labelKey}
          tick={{ fill: axisTextColor, fontSize: 10, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          width={yAxisWidth}
          tickFormatter={
            labelFormatter
              ? (v) => {
                  // Look up the correct data-array index by matching the actual
                  // label-key value, NOT the Recharts tick index which can differ
                  // in order between horizontal and vertical chart orientations.
                  const dataIndex = pyramidData.findIndex(
                    (item) => String(item[labelKey as keyof typeof item]) === String(v)
                  );
                  return labelFormatter(String(v), dataIndex >= 0 ? dataIndex : 0);
                }
              : undefined
          }
        />

        <ReferenceLine
          x={0}
          stroke={isDark ? '#475569' : '#cbd5e1'}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        <ReTooltip
          contentStyle={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            boxShadow: 'none',
            minWidth: '160px',
          }}
          wrapperStyle={{ outline: 'none', zIndex: 1000 }}
          cursor={{
            fill: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.06)',
            radius: 4,
          }}
          content={(props) => (
            <PyramidTooltip
              {...props}
              isDark={isDark}
              beCalcEnabled={beCalcEnabled}
              tooltipHeaderGetter={tooltipHeaderGetter}
            />
          )}
        />

        {/* Wins bar — positive value → extends right */}
        <ReBar
          dataKey="wins"
          barSize={barSize}
          radius={[0, 8, 8, 0]}
          fill={`url(#${idPrefix}WinsH)`}
        >
          <LabelList
            dataKey={beCalcEnabled ? 'winRateWithBE' : 'winRate'}
            content={(props: any) => {
              if (!props || props.value == null || (props.value as number) === 0) return null;
              const rate = Number(props.value);
              if (rate <= 0) return null;
              const x = Number(props.x ?? 0);
              const y = Number(props.y ?? 0);
              const width = Number(props.width ?? 0);
              const height = Number(props.height ?? 0);
              return (
                <text
                  x={x + width + 4}
                  y={y + height / 2}
                  fill={isDark ? '#2dd4bf' : '#0d9488'}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={700}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {Math.round(rate)}%
                </text>
              );
            }}
          />
        </ReBar>

        {/* Losses bar — negative value (lossNeg) → extends left */}
        <ReBar
          dataKey="lossNeg"
          barSize={barSize}
          radius={[0, 8, 8, 0]}
          fill={`url(#${idPrefix}LossesH)`}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
