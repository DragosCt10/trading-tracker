'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from 'recharts';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { formatPercent } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { calculateNewsNameStats } from '@/utils/calculateCategoryStats';
import { useDarkMode } from '@/hooks/useDarkMode';

export interface NewsNameChartCardProps {
  trades: Trade[];
  isLoading?: boolean;
}

type IntensityFilter = null | 1 | 2 | 3;

const INTENSITY_OPTIONS: { value: IntensityFilter; label: string }[] = [
  { value: null,  label: 'All'    },
  { value: 1,     label: 'Low'    },
  { value: 2,     label: 'Medium' },
  { value: 3,     label: 'High'   },
];

interface ChartDatum {
  newsName: string;
  category: string;
  wins: number;
  losses: number;
  breakEven: number;
  totalTrades: number;
  winRate: number;
  winRateWithBE: number;
}

function intensityActiveClass(value: IntensityFilter): string {
  if (value === 1) return 'bg-emerald-500 text-white border-emerald-500';
  if (value === 2) return 'bg-amber-500  text-white border-amber-500';
  if (value === 3) return 'bg-rose-500   text-white border-rose-500';
  return 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-800 border-slate-800 dark:border-slate-100';
}

export const NewsNameChartCard: React.FC<NewsNameChartCardProps> = React.memo(
  function NewsNameChartCard({ trades, isLoading: externalLoading }) {
    const { mounted, isDark } = useDarkMode();
    const [isLoading, setIsLoading]         = useState(true);
    const [intensityFilter, setIntensityFilter] = useState<IntensityFilter>(null);

    useEffect(() => {
      if (externalLoading !== undefined) {
        if (externalLoading) {
          setIsLoading(true);
        } else {
          const timer = setTimeout(() => setIsLoading(false), 400);
          return () => clearTimeout(timer);
        }
      } else {
        const timer = setTimeout(() => setIsLoading(false), 400);
        return () => clearTimeout(timer);
      }
    }, [externalLoading]);

    const filteredTrades = useMemo(() => {
      if (intensityFilter === null) return trades;
      return trades.filter((t) => t.news_intensity === intensityFilter);
    }, [trades, intensityFilter]);

    const stats     = useMemo(() => calculateNewsNameStats(filteredTrades), [filteredTrades]);
    const chartData = useMemo<ChartDatum[]>(
      () =>
        stats.map((s) => ({
          newsName:      s.newsName,
          category:      s.newsName,
          wins:          s.wins,
          losses:        s.losses,
          breakEven:     s.breakEven,
          totalTrades:   s.total,
          winRate:       s.winRate,
          winRateWithBE: s.winRateWithBE,
        })),
      [stats]
    );

    const hasData  = chartData.length > 0;
    const maxTotal = hasData
      ? Math.max(...chartData.map((d) => d.wins + d.losses + d.breakEven), 1)
      : 1;
    const axisTextColor = isDark ? '#cbd5e1' : '#64748b';

    /* ------------------------------------------------------------------ */
    /* Tooltip                                                              */
    /* ------------------------------------------------------------------ */
    const CustomTooltip = ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: { payload: ChartDatum }[];
    }) => {
      if (!active || !payload?.length) return null;
      const d = payload[0].payload;
      return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-50">
          <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="relative flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {d.newsName}{' '}
              {d.totalTrades > 0
                ? `(${d.totalTrades} trade${d.totalTrades === 1 ? '' : 's'})`
                : ''}
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{d.wins}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses</span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{d.losses}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Break Even</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{d.breakEven}</span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate</span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {formatPercent(d.winRate)}%
                  <span className="text-slate-500 dark:text-slate-400 text-sm ml-1 font-medium">
                    ({formatPercent(d.winRateWithBE)}% w/BE)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    /* ------------------------------------------------------------------ */
    /* Shared header (filter always visible)                               */
    /* ------------------------------------------------------------------ */
    const header = (
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            News by event
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Wins, losses and BE per news event
          </p>
        </div>

        {/* Intensity filter */}
        <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
          <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">Intensity</span>
          {INTENSITY_OPTIONS.map((opt) => {
            const isActive = intensityFilter === opt.value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => setIntensityFilter(opt.value)}
                className={[
                  'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-150',
                  isActive
                    ? intensityActiveClass(opt.value)
                    : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200',
                ].join(' ')}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );

    /* ------------------------------------------------------------------ */
    /* Loading                                                              */
    /* ------------------------------------------------------------------ */
    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          {header}
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    /* ------------------------------------------------------------------ */
    /* Empty state                                                          */
    /* ------------------------------------------------------------------ */
    if (!hasData) {
      const activeLabel = INTENSITY_OPTIONS.find((o) => o.value === intensityFilter)?.label;
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          {header}
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-1">
              {intensityFilter !== null
                ? `No trades with ${activeLabel} intensity.`
                : 'No news-related trades with a news name yet.'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
              {intensityFilter !== null
                ? 'Try selecting a different intensity filter.'
                : 'Mark trades as News and set the event name (e.g. CPI, NFP) to see the chart here.'}
            </p>
          </CardContent>
        </Card>
      );
    }

    /* ------------------------------------------------------------------ */
    /* Chart                                                                */
    /* ------------------------------------------------------------------ */
    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm flex flex-col">
        {header}
        <CardContent className="flex-1 flex items-end mt-1 pb-6">
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 30, right: 48, left: 56, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="newsNameWinsBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={1}    />
                    <stop offset="50%"  stopColor="#14b8a6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9}  />
                  </linearGradient>
                  <linearGradient id="newsNameLossesBar" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%"   stopColor="#f43f5e" stopOpacity={1}    />
                    <stop offset="50%"  stopColor="#fb7185" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9}  />
                  </linearGradient>
                  <linearGradient id="newsNameBreakEvenBar" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%"   stopColor="#d97706" stopOpacity={1}    />
                    <stop offset="50%"  stopColor="#f59e0b" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.9}  />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="category"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisTextColor, fontSize: 11 }}
                  tickFormatter={(value: string) => {
                    const item = chartData.find((d) => d.category === value);
                    return item ? `${value} (${item.totalTrades})` : value;
                  }}
                  height={38}
                />
                <YAxis
                  yAxisId="left"
                  type="number"
                  tick={{ fill: axisTextColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    Number(v ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
                  }
                  domain={[0, Math.ceil(maxTotal * 1.15)]}
                  width={56}
                  tickMargin={8}
                  label={{
                    value: 'Wins / Losses',
                    angle: -90,
                    position: 'insideLeft',
                    offset: -8,
                    style: { fill: axisTextColor, fontSize: 11, textAnchor: 'middle' },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  type="number"
                  tick={{ fill: axisTextColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                  domain={[0, 100]}
                  width={44}
                  tickMargin={8}
                  label={{
                    value: 'Win Rate',
                    angle: 90,
                    position: 'insideRight',
                    offset: -4,
                    style: { fill: axisTextColor, fontSize: 11, textAnchor: 'middle' },
                  }}
                />
                <ReTooltip
                  contentStyle={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    boxShadow: 'none',
                    minWidth: '180px',
                  }}
                  wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                  cursor={{ fill: 'transparent', radius: 8 }}
                  content={<CustomTooltip />}
                />

                {/* Grouped bars — side by side, matching DayStatisticsCard */}
                <Bar dataKey="wins"      name="Wins"       fill="url(#newsNameWinsBar)"      radius={[7, 7, 7, 7]} barSize={18} yAxisId="left" />
                <Bar dataKey="losses"    name="Losses"     fill="url(#newsNameLossesBar)"    radius={[7, 7, 7, 7]} barSize={18} yAxisId="left" />
                <Bar dataKey="breakEven" name="Break Even" fill="url(#newsNameBreakEvenBar)" radius={[7, 7, 7, 7]} barSize={18} yAxisId="left" />

                {/* Win-rate line — matching DayStatisticsCard */}
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
