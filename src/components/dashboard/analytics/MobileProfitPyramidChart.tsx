'use client';

/**
 * MobileProfitPyramidChart
 * Reusable horizontal diverging bar chart (population-pyramid style) for
 * profit/loss data where each row has a single ± value.
 *
 * Used by: AccountOverviewCard (monthly profit), MarketProfitStats.
 */

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Bar as ReBar,
  Cell,
  LabelList,
  ReferenceLine,
  Tooltip as ReTooltip,
} from 'recharts';

export interface ProfitPyramidDatum {
  /** Y-axis row label */
  label: string;
  /** The ± value — positive bars extend right (green), negative extend left (red) */
  value: number;
  /** Optional percentage label shown outside the bar (e.g. "+5.2%") */
  percent?: number;
}

export interface MobileProfitPyramidChartProps {
  data: ProfitPyramidDatum[];
  isDark: boolean;
  /** Unique prefix for SVG gradient IDs — must differ between instances */
  idPrefix: string;
  /** Formats the X-axis tick labels (default: abbreviated absolute value) */
  xTickFormatter?: (v: number) => string;
  /** Custom tooltip renderer; omit to disable tooltip */
  tooltipContent?: (props: any) => React.ReactNode;
  /** Y-axis width in px (default: 72) */
  yAxisWidth?: number;
  /** Bar height in px (default: 13) */
  barSize?: number;
}

export function MobileProfitPyramidChart({
  data,
  isDark,
  idPrefix,
  xTickFormatter,
  tooltipContent,
  yAxisWidth = 72,
  barSize = 13,
}: MobileProfitPyramidChartProps) {
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b';
  const maxAbsVal = Math.max(...data.map((d) => Math.abs(d.value)), 1);

  const defaultTickFormatter = (v: number) => {
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1000) return `${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
    return String(abs);
  };
  const fmt = xTickFormatter ?? defaultTickFormatter;

  // Compute height dynamically: each row ~38px + top/bottom margins + x-axis
  const chartHeight = Math.max(data.length * 38 + 40, 200);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 12, right: 52, left: 0, bottom: 20 }}
        barCategoryGap="20%"
      >
        <defs>
          <linearGradient id={`${idPrefix}ProfitH`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={1} />
          </linearGradient>
          <linearGradient id={`${idPrefix}LossH`} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#e11d48" stopOpacity={1} />
          </linearGradient>
        </defs>

        <XAxis
          type="number"
          domain={[-maxAbsVal, maxAbsVal]}
          tick={{ fill: axisTextColor, fontSize: 10, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmt}
          tickCount={7}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: axisTextColor, fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          width={yAxisWidth}
        />

        <ReferenceLine
          x={0}
          stroke={isDark ? '#475569' : '#cbd5e1'}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        {tooltipContent && (
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
            content={tooltipContent}
          />
        )}

        <ReBar
          dataKey="value"
          maxBarSize={barSize}
          shape={(props: any) => {
            const { x, y, width, height, value } = props;
            if (width === 0 || height === 0) return null;
            const r = 8;
            const v = Array.isArray(value) ? value[1] : value;
            const fillColor = v >= 0 ? `url(#${idPrefix}ProfitH)` : `url(#${idPrefix}LossH)`;
            // Positive bars: round right end only; negative bars: round left end only
            const radiusArr: [number, number, number, number] =
              v >= 0 ? [0, r, r, 0] : [r, 0, 0, r];
            const [tl, tr, br, bl] = radiusArr;
            // Build SVG path with selective corner rounding
            const w = Math.abs(width);
            const h = Math.abs(height);
            const rx = Math.min(r, w / 2, h / 2);
            const ax = Math.min(tl, rx);
            const bx = Math.min(tr, rx);
            const cx = Math.min(br, rx);
            const dx = Math.min(bl, rx);
            const px = v >= 0 ? x : x + width;
            const py = y;
            const d = `M${px + ax},${py}
              L${px + w - bx},${py}
              Q${px + w},${py} ${px + w},${py + bx}
              L${px + w},${py + h - cx}
              Q${px + w},${py + h} ${px + w - cx},${py + h}
              L${px + dx},${py + h}
              Q${px},${py + h} ${px},${py + h - dx}
              L${px},${py + ax}
              Q${px},${py} ${px + ax},${py} Z`;
            return <path d={d} fill={fillColor} style={{ cursor: 'pointer' }} />;
          }}
        >
          <LabelList
            dataKey="percent"
            content={(props: any) => {
              if (!props || props.value == null || props.value === 0) return null;
              const pct = Number(props.value);
              const x = Number(props.x ?? 0);
              const y = Number(props.y ?? 0);
              const width = Number(props.width ?? 0);
              const height = Number(props.height ?? 0);
              // Position label outside the bar end (away from center line)
              const labelX = pct >= 0 ? x + width + 4 : x - 4;
              return (
                <text
                  x={labelX}
                  y={y + height / 2}
                  fill={
                    pct >= 0
                      ? isDark ? '#2dd4bf' : '#0d9488'
                      : isDark ? '#fb7185' : '#e11d48'
                  }
                  textAnchor={pct >= 0 ? 'start' : 'end'}
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={700}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {pct > 0 ? '+' : ''}
                  {pct}%
                </text>
              );
            }}
          />
        </ReBar>
      </BarChart>
    </ResponsiveContainer>
  );
}
