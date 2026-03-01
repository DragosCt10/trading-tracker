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
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { formatPercent, cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { calculateNewsNameStats, NEWS_NO_EVENT_LABEL } from '@/utils/calculateCategoryStats';
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

/** Card className matching DayStatisticsCard (including shadow) */
const CARD_CLASS =
  'relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col';

const FILTER_BTN_ACTIVE =
  'themed-btn-primary text-white font-semibold shadow-md border-0';
const FILTER_BTN_INACTIVE =
  'border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium';

export const NewsNameChartCard: React.FC<NewsNameChartCardProps> = React.memo(
  function NewsNameChartCard({ trades, isLoading: externalLoading }) {
    const { mounted, isDark } = useDarkMode();
    const [isLoading, setIsLoading]         = useState(true);
    const [intensityFilter, setIntensityFilter] = useState<IntensityFilter>(null);
    const [unnamedOnly, setUnnamedOnly]     = useState(false);

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
      if (unnamedOnly) return trades;
      if (intensityFilter === null) return trades;
      return trades.filter((t) => t.news_intensity === intensityFilter);
    }, [trades, intensityFilter, unnamedOnly]);

    const stats     = useMemo(
      () => calculateNewsNameStats(filteredTrades, { includeUnnamed: true }),
      [filteredTrades]
    );
    const chartData = useMemo<ChartDatum[]>(() => {
      const rows = stats.map((s) => ({
        newsName:      s.newsName,
        category:      s.newsName,
        wins:          s.wins,
        losses:        s.losses,
        breakEven:     s.breakEven,
        totalTrades:   s.total,
        winRate:       s.winRate,
        winRateWithBE: s.winRateWithBE,
      }));
      if (unnamedOnly) {
        return rows.filter((d) => d.newsName === NEWS_NO_EVENT_LABEL);
      }
      // "All" = by event only (exclude unnamed)
      return rows.filter((d) => d.newsName !== NEWS_NO_EVENT_LABEL);
    }, [stats, unnamedOnly]);

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
      <CardHeader className="pb-2 flex-shrink-0 flex flex-row items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            News Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Wins, losses and BE per news event
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-shrink-0 pt-0.5">
          {/* Show filter — match TradeFiltersBar active style */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">Show</span>
            <Button
              type="button"
              variant={!unnamedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUnnamedOnly(false)}
              className={cn(
                'cursor-pointer rounded-xl px-4 py-2 text-sm transition-colors duration-200 relative overflow-hidden group',
                !unnamedOnly ? FILTER_BTN_ACTIVE : FILTER_BTN_INACTIVE
              )}
            >
              <span className="relative z-10">By event</span>
              {!unnamedOnly && (
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              )}
            </Button>
            <Button
              type="button"
              variant={unnamedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUnnamedOnly(true)}
              className={cn(
                'cursor-pointer rounded-xl px-4 py-2 text-sm transition-colors duration-200 relative overflow-hidden group',
                unnamedOnly ? FILTER_BTN_ACTIVE : FILTER_BTN_INACTIVE
              )}
            >
              <span className="relative z-10">Unnamed news</span>
              {unnamedOnly && (
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              )}
            </Button>
          </div>
          {/* Intensity filter — same active style; disabled when Unnamed news */}
          <div
            className={cn(
              'flex items-center gap-2',
              unnamedOnly && 'opacity-50 pointer-events-none'
            )}
            aria-disabled={unnamedOnly}
          >
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">Intensity</span>
            {INTENSITY_OPTIONS.map((opt) => {
              const isActive = intensityFilter === opt.value;
              return (
                <Button
                  key={String(opt.value)}
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  disabled={unnamedOnly}
                  onClick={() => !unnamedOnly && setIntensityFilter(opt.value)}
                  className={cn(
                    'cursor-pointer rounded-xl px-4 py-2 text-sm transition-colors duration-200 relative overflow-hidden group',
                    isActive ? FILTER_BTN_ACTIVE : FILTER_BTN_INACTIVE,
                    unnamedOnly && 'cursor-not-allowed'
                  )}
                >
                  <span className="relative z-10">{opt.label}</span>
                  {isActive && (
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>
    );

    /* ------------------------------------------------------------------ */
    /* Loading                                                              */
    /* ------------------------------------------------------------------ */
    if (!mounted || isLoading) {
      return (
<Card className={CARD_CLASS}>
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
        <Card className={CARD_CLASS}>
          {header}
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-1">
              {unnamedOnly
                ? 'No trades marked as news without an event name.'
                : intensityFilter !== null
                  ? `No trades with ${activeLabel} intensity.`
                  : 'No news-related trades with a news name yet.'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
              {unnamedOnly
                ? 'Mark trades as News and leave the event name empty to see them here.'
                : intensityFilter !== null
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
      <Card className={CARD_CLASS}>
        {header}
        <CardContent className="flex-1 flex items-end mt-1">
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 30, right: 56, left: 56, bottom: 10 }}
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
                    offset: 0,
                    style: { fill: axisTextColor, fontSize: 13, textAnchor: 'middle' },
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
                  width={56}
                  tickMargin={8}
                  label={{
                    value: 'Win Rate',
                    angle: 90,
                    position: 'insideRight',
                    offset: -8,
                    style: { fill: axisTextColor, fontSize: 13, textAnchor: 'middle' },
                  }}
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
                    minWidth: '180px',
                  }}
                  wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                  cursor={{ stroke: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.4)', strokeWidth: 1 }}
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
