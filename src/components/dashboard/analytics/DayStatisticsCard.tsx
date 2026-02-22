'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar as ReBar,
  Line,
  Area,
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
import { Trade } from '@/types/trade';
import { calculateDayStats as calculateDayStatsUtil } from '@/utils/calculateCategoryStats';
import type { DayStats, BaseStats } from '@/types/dashboard';
import { useDarkMode } from '@/hooks/useDarkMode';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Map short or alternate day names to canonical full name for chart order */
const DAY_NORMALIZE: Record<string, string> = {
  Mon: 'Monday', Monday: 'Monday',
  Tue: 'Tuesday', Tues: 'Tuesday', Tuesday: 'Tuesday',
  Wed: 'Wednesday', Wednesday: 'Wednesday',
  Thu: 'Thursday', Thurs: 'Thursday', Thursday: 'Thursday',
  Fri: 'Friday', Friday: 'Friday',
  Sat: 'Saturday', Saturday: 'Saturday',
  Sun: 'Sunday', Sunday: 'Sunday',
};
function normalizeDay(day: string): string {
  return DAY_NORMALIZE[day] ?? day;
}

// Type that matches both DayStats and filtered stats (which may not have day property)
type DayStatsLike = BaseStats & {
  day?: string;
  total?: number;
};

export interface DayStatisticsCardProps {
  dayStats: DayStatsLike[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

/**
 * Calculate Days Stats from trades array
 * @param trades - Array of trades to compute stats from
 * @returns Array of Days Stats
 */
export function calculateDayStats(trades: Trade[]): DayStats[] {
  return calculateDayStatsUtil(trades);
}

/**
 * Convert day stats to chart data format (for bar card; kept for compatibility)
 */
export function convertDayStatsToChartData(
  dayStats: DayStatsLike[],
  _includeTotalTrades: boolean = false
): { category: string; wins: number; losses: number; beWins: number; beLosses: number; winRate: number; winRateWithBE: number; totalTrades?: number }[] {
  return dayStats.map((stat) => {
    const totalTrades = (stat.wins ?? 0) + (stat.losses ?? 0) + (stat.beWins ?? 0) + (stat.beLosses ?? 0);
    return {
      category: `${stat.day}`,
      wins: stat.wins ?? 0,
      losses: stat.losses ?? 0,
      beWins: stat.beWins ?? 0,
      beLosses: stat.beLosses ?? 0,
      winRate: stat.winRate ?? 0,
      winRateWithBE: stat.winRateWithBE ?? 0,
      totalTrades,
    };
  });
}

/**
 * Convert filtered day stats to chart data format (includes totalTrades)
 */
export function convertFilteredDayStatsToChartData(dayStats: DayStatsLike[]) {
  return convertDayStatsToChartData(dayStats, true);
}

export const DayStatisticsCard: React.FC<DayStatisticsCardProps> = React.memo(
  function DayStatisticsCard({ dayStats, isLoading: externalLoading, includeTotalTrades = false }) {
    const { mounted, isDark } = useDarkMode();
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
      if (mounted) {
        if (externalLoading) {
          setIsLoading(true);
        } else {
          const timer = setTimeout(() => setIsLoading(false), 600);
          return () => clearTimeout(timer);
        }
      }
    }, [mounted, externalLoading]);

    const statsByDay: Record<string, { wins: number; losses: number; beWins: number; beLosses: number; winRate: number; winRateWithBE: number }> = {};
    dayStats.forEach((stat) => {
      const rawDay = stat.day ?? 'Unknown';
      const day = normalizeDay(rawDay);
      const existing = statsByDay[day];
      const wins = (stat.wins ?? 0) + (existing?.wins ?? 0);
      const losses = (stat.losses ?? 0) + (existing?.losses ?? 0);
      const beWins = (stat.beWins ?? 0) + (existing?.beWins ?? 0);
      const beLosses = (stat.beLosses ?? 0) + (existing?.beLosses ?? 0);
      const total = wins + losses + beWins + beLosses;
      statsByDay[day] = {
        wins,
        losses,
        beWins,
        beLosses,
        winRate: stat.winRate ?? (wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0),
        winRateWithBE: stat.winRateWithBE ?? (total > 0 ? ((wins + beWins) / total) * 100 : 0),
      };
    });

    // Build chart data: first the 7 canonical days (in order), then any other keys (e.g. "Unknown") so data always shows
    const knownDays = DAYS.map((day) => {
      const stats = statsByDay[day] ?? { wins: 0, losses: 0, beWins: 0, beLosses: 0, winRate: 0, winRateWithBE: 0 };
      const totalTrades = stats.wins + stats.losses + stats.beWins + stats.beLosses;
      return {
        day,
        totalTrades,
        wins: stats.wins,
        losses: stats.losses,
        beWins: stats.beWins,
        beLosses: stats.beLosses,
        winRate: stats.winRate,
        winRateWithBE: stats.winRateWithBE,
      };
    });
    const otherDayKeys = Object.keys(statsByDay).filter((k) => !DAYS.includes(k));
    const otherDays = otherDayKeys.map((day) => {
      const stats = statsByDay[day];
      const totalTrades = stats.wins + stats.losses + stats.beWins + stats.beLosses;
      return {
        day,
        totalTrades,
        wins: stats.wins,
        losses: stats.losses,
        beWins: stats.beWins,
        beLosses: stats.beLosses,
        winRate: stats.winRate,
        winRateWithBE: stats.winRateWithBE,
      };
    });
    const chartData = [...knownDays, ...otherDays];

    // Use raw dayStats to decide "has trades" so we don't show "No trades" when data exists but labels differed
    const hasTrades =
      dayStats.some(
        (s) =>
          ((s.wins ?? 0) + (s.losses ?? 0) + (s.beWins ?? 0) + (s.beLosses ?? 0)) > 0
      ) || chartData.some((d) => d.totalTrades > 0);
    const axisTextColor = isDark ? '#cbd5e1' : '#64748b';

    const CustomTooltip = ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: { payload: (typeof chartData)[number] }[];
    }) => {
      if (!active || !payload?.length) return null;
      const d = payload[0].payload;
      return (
        <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            {d.day} ({d.totalTrades} trades)
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins:</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {d.wins} {d.beWins > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({d.beWins} BE)</span>}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses:</span>
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {d.losses} {d.beLosses > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({d.beLosses} BE)</span>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate:</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                {d.winRate.toFixed(2)}%
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate (w/ BE):</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                {d.winRateWithBE.toFixed(2)}%
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

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Days Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on day of the week
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (!hasTrades) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Days Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on day of the week
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                There are no trades to display for this category yet. Start trading to see your statistics here!
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    const maxTotal = Math.max(
      ...chartData.map((d) => d.wins + d.losses),
      ...chartData.map((d) => d.totalTrades),
      1
    );

    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Days Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of trades based on day of the week
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex items-end mt-1">
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 30, right: 56, left: 56, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="dayComposedTotalArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dayComposedWinsBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="dayComposedLossesBar" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                    <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="day"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisTextColor, fontSize: 11 }}
                  tickFormatter={(value: string) => {
                    const d = chartData.find((x) => x.day === value);
                    return d ? `${d.day.slice(0, 3)} (${d.totalTrades})` : (value?.slice(0, 3) ?? '');
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
                    border: isDark
                      ? '1px solid rgba(51, 65, 85, 0.6)'
                      : '1px solid rgba(148, 163, 184, 0.2)',
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
                  fill="url(#dayComposedTotalArea)"
                  stroke="none"
                />
                <ReBar dataKey="wins" name="Wins" fill="url(#dayComposedWinsBar)" radius={[4, 4, 0, 0]} barSize={20} yAxisId="left" />
                <ReBar dataKey="losses" name="Losses" fill="url(#dayComposedLossesBar)" radius={[4, 4, 0, 0]} barSize={20} yAxisId="left" />
                <Line
                  type="monotone"
                  dataKey="winRate"
                  name="Win Rate"
                  yAxisId="right"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }
);
