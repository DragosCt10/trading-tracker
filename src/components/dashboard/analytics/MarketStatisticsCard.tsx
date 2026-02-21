'use client';

import React, { useState, useEffect } from 'react';
import { Trade } from '@/types/trade';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar as ReBar,
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
import { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { calculateMarketStats as calculateMarketStatsUtil } from '@/utils/calculateCategoryStats';
import type { MarketStats, BaseStats } from '@/types/dashboard';

type MarketStatsLike = BaseStats & {
  market?: string;
  total?: number;
};

export interface MarketStatisticsCardProps {
  marketStats: MarketStatsLike[];
  isLoading?: boolean;
  includeTotalTrades?: boolean;
}

export function calculateMarketStats(trades: Trade[], accountBalance: number): MarketStats[] {
  return calculateMarketStatsUtil(trades, accountBalance);
}

export function convertMarketStatsToChartData(
  marketStats: MarketStatsLike[],
  includeTotalTrades: boolean = false
): TradeStatDatum[] {
  return marketStats.map((stat) => {
    // Use source total (same as Market Profit Stats: actual trade count) so tooltip total matches
    const totalTrades = stat.total ?? (stat.wins + stat.losses);
    const computedWinRate = totalTrades > 0 ? (stat.wins / totalTrades) * 100 : 0;
    return {
      category: `${stat.market}`,
      wins: stat.wins,
      losses: stat.losses,
      beWins: stat.beWins,
      beLosses: stat.beLosses,
      winRate: computedWinRate,
      winRateWithBE: stat.winRateWithBE ?? stat.winRate,
      totalTrades,
    };
  });
}

export function convertFilteredMarketStatsToChartData(marketStats: MarketStatsLike[]): TradeStatDatum[] {
  return convertMarketStatsToChartData(marketStats, true);
}

export const MarketStatisticsCard: React.FC<MarketStatisticsCardProps> = React.memo(
  function MarketStatisticsCard({ marketStats, isLoading, includeTotalTrades = false }) {
    const [mounted, setMounted] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
      setMounted(true);
      const checkDarkMode = () => setIsDark(document.documentElement.classList.contains('dark'));
      checkDarkMode();
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
      return () => observer.disconnect();
    }, []);

    const chartDataRaw = convertMarketStatsToChartData(marketStats, includeTotalTrades);
    // Keep wins/losses as in source (same as Market Profit Stats); total = stat.total (actual trade count)
    const withTotals: TradeStatDatum[] = chartDataRaw.map((d) => {
      const totalTrades = d.totalTrades ?? (d.wins ?? 0) + (d.losses ?? 0);
      const hasTradesButNoOutcomes = totalTrades > 0 && (d.wins ?? 0) === 0 && (d.losses ?? 0) === 0;
      return {
        ...d,
        totalTrades,
        wins: hasTradesButNoOutcomes ? 0.01 : (d.wins ?? 0),
        losses: d.losses ?? 0,
      };
    });

    const hasContent = withTotals.some(
      (d) => (d.totalTrades ?? 0) > 0 || (d.wins ?? 0) > 0 || (d.losses ?? 0) > 0
    );
    const axisTextColor = isDark ? '#cbd5e1' : '#64748b';
    const maxTotal = Math.max(
      ...withTotals.map((d) => (d.wins ?? 0) + (d.losses ?? 0)),
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
      const beWins = d.beWins ?? 0;
      const beLosses = d.beLosses ?? 0;
      const winRate = d.winRate ?? 0;
      const winRateWithBE = d.winRateWithBE ?? d.winRate ?? 0;
      const totalTrades = d.totalTrades ?? wins + losses;
      return (
        <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            {d.category} {typeof totalTrades === 'number' ? `(${totalTrades} trade${totalTrades === 1 ? '' : 's'})` : ''}
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins:</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {wins} {beWins > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({beWins} BE)</span>}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses:</span>
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {losses} {beLosses > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({beLosses} BE)</span>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate:</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                {winRate.toFixed(2)}%
              </div>
            </div>
            {d.winRateWithBE !== undefined && (
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate (w/ BE):</span>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  {winRateWithBE.toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

    const yAxisTickFormatter = (value: number) =>
      Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Market Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on market
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
              Market Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades based on market
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
            Market Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of trades based on market
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-end mt-1">
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={withTotals}
                margin={{ top: 30, right: 20, left: 56, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="marketStatsTotalArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={isDark ? '#64748b' : '#94a3b8'} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="marketStatsWinsBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="marketStatsLossesBar" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                    <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
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
                  fill="url(#marketStatsTotalArea)"
                  stroke="none"
                />
                <ReBar dataKey="wins" name="Wins" fill="url(#marketStatsWinsBar)" radius={[4, 4, 0, 0]} barSize={20} yAxisId="left" />
                <ReBar dataKey="losses" name="Losses" fill="url(#marketStatsLossesBar)" radius={[4, 4, 0, 0]} barSize={20} yAxisId="left" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }
);
