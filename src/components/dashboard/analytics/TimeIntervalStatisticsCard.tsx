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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { formatPercent } from '@/lib/utils';
import { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { useDarkMode } from '@/hooks/useDarkMode';

export interface TimeIntervalStatisticsCardProps {
  /** Stats per time interval (same buckets as TIME_INTERVALS). */
  data: TradeStatDatum[];
  isLoading?: boolean;
  /** Optional: show only this interval (e.g. "08:00 – 11:59"). Legacy trades with simple time are still counted in the correct bucket via data. */
  selectedIntervalLabel?: string | null;
}

export const TimeIntervalStatisticsCard: React.FC<TimeIntervalStatisticsCardProps> = React.memo(
  function TimeIntervalStatisticsCard({ data, isLoading, selectedIntervalLabel }) {
    const { mounted, isDark } = useDarkMode();

    // When a specific interval is selected, show only that row (data already includes legacy trades bucketed by trade_time)
    const dataToShow = selectedIntervalLabel
      ? data.filter((d) => d.category === selectedIntervalLabel)
      : data;

    // BE new flow: wins, losses, breakEven separate; totalTrades = wins + losses + breakEven
    const withTotals: TradeStatDatum[] = dataToShow.map((d) => {
      const wins = d.wins ?? 0;
      const losses = d.losses ?? 0;
      const breakEven = d.breakEven ?? 0;
      const totalTrades = d.totalTrades ?? wins + losses + breakEven;
      const hasTradesButNoOutcomes = totalTrades > 0 && wins === 0 && losses === 0 && breakEven === 0;
      return {
        ...d,
        totalTrades,
        wins: hasTradesButNoOutcomes ? 0.01 : wins,
        losses,
        breakEven,
      };
    });

    const hasContent = withTotals.some(
      (d) =>
        (d.totalTrades ?? 0) > 0 ||
        (d.wins ?? 0) > 0 ||
        (d.losses ?? 0) > 0 ||
        (d.breakEven ?? 0) > 0
    );
    const axisTextColor = isDark ? '#cbd5e1' : '#64748b';
    const maxTotal = Math.max(
      ...withTotals.map((d) => (d.wins ?? 0) + (d.losses ?? 0) + (d.breakEven ?? 0)),
      ...withTotals.map((d) => d.totalTrades ?? 0),
      1
    );

    const CustomTooltip = ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: { payload: TradeStatDatum }[];
    }) => {
      if (!active || !payload?.length) return null;
      const d = payload[0].payload;
      const wins = d.wins ?? 0;
      const losses = d.losses ?? 0;
      const breakEven = d.breakEven ?? 0;
      const winRate = d.winRate ?? 0;
      const winRateWithBE = d.winRateWithBE ?? d.winRate ?? 0;
      const totalTrades = d.totalTrades ?? wins + losses + breakEven;
      return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-50">
          <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="relative flex flex-col gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
            {d.category} {typeof totalTrades === 'number' ? `(${totalTrades} trade${totalTrades === 1 ? '' : 's'})` : ''}
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
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{breakEven}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {formatPercent(winRate)}%
                <span className="text-slate-500 dark:text-slate-400 text-sm ml-1 font-medium">
                  ({formatPercent(winRateWithBE)}% w/BE)
                </span>
              </span>
            </div>
          </div>
          </div>
        </div>
      );
    };

    const yAxisTickFormatter = (value: number) =>
      Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

    const leftAxisLabel = (props: { viewBox?: { x?: number; y?: number; width?: number; height?: number } }) => {
      const vb = props.viewBox ?? {};
      const x = (vb.x ?? 0) + 6;
      const y = (vb.y ?? 0) + (vb.height ?? 0) / 2;
      return (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          fill={axisTextColor}
          fontSize={12}
          fontWeight={500}
          transform={`rotate(-90, ${x}, ${y})`}
        >
          Wins / Losses
        </text>
      );
    };

    const rightAxisLabel = (props: { viewBox?: { x?: number; y?: number; width?: number; height?: number } }) => {
      const vb = props.viewBox ?? {};
      const x = (vb.x ?? 0) + (vb.width ?? 0) + 8;
      const y = (vb.y ?? 0) + (vb.height ?? 0) / 2;
      return (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          fill={axisTextColor}
          fontSize={12}
          fontWeight={500}
          transform={`rotate(90, ${x}, ${y})`}
        >
          Win Rate
        </text>
      );
    };

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Time Interval Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on time interval
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (!hasContent) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Time Interval Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades based on time interval
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
              No trades found
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
              There are no trades to display for this category yet. Start trading to see your statistics here!
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Time Interval Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of trades based on time interval
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-end mt-1">
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={withTotals}
                margin={{ top: 30, right: 56, left: 56, bottom: 10 }}
                barCategoryGap="20%"
              >
                <defs>
                  <linearGradient id="timeIntervalTotalArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="timeIntervalWinsBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="timeIntervalLossesBar" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                    <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="timeIntervalBreakEvenBar" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#d97706" stopOpacity={1} />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="category"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisTextColor, fontSize: 11 }}
                  tickFormatter={(_: string, i: number) => {
                    const d = withTotals[i];
                    return d ? `${d.category} (${d.totalTrades ?? 0})` : '';
                  }}
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
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  type="number"
                  tick={{ fill: axisTextColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                  width={56}
                  tickMargin={8}
                  label={rightAxisLabel}
                />
                <ReTooltip
                  contentStyle={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
                    backdropFilter: 'blur(16px)',
                    border: isDark ? '1px solid rgba(51, 65, 85, 0.6)' : '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    fontSize: 14,
                    boxShadow: isDark
                      ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                      : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    minWidth: '160px',
                  }}
                  wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                  cursor={{ stroke: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.4)', strokeWidth: 1 }}
                  content={<CustomTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="totalTrades"
                  name="Total"
                  yAxisId="left"
                  fill="url(#timeIntervalTotalArea)"
                  stroke="none"
                />
                <ReBar dataKey="wins" name="Wins" fill="url(#timeIntervalWinsBar)" radius={[7, 7, 7, 7]} barSize={18} yAxisId="left" stackId="wins" />
                <ReBar dataKey="losses" name="Losses" fill="url(#timeIntervalLossesBar)" radius={[7, 7, 7, 7]} barSize={18} yAxisId="left" stackId="losses" />
                <ReBar dataKey="breakEven" name="Break Even" fill="url(#timeIntervalBreakEvenBar)" radius={[7, 7, 7, 7]} barSize={18} yAxisId="left" stackId="breakEven" />
                <Line
                  type="monotone"
                  dataKey="winRate"
                  name="Win Rate"
                  yAxisId="right"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }
);
