'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar as ReBar,
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
import { Trade } from '@/types/trade';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { useDarkMode } from '@/hooks/useDarkMode';

export interface DisplacementSizeStatsProps {
  trades: Trade[];
  isLoading?: boolean;
}

export const DISPLACEMENT_BUCKETS = [
  { key: '0-10', label: '0–10', min: 0, max: 10 },
  { key: '10-20', label: '10–20', min: 10, max: 20 },
  { key: '20-30', label: '20–30', min: 20, max: 30 },
  { key: '30-40', label: '30–40', min: 30, max: 40 },
  { key: '40+', label: '40+', min: 40, max: Infinity },
] as const;

export const DisplacementSizeStats: React.FC<DisplacementSizeStatsProps> = React.memo(
  function DisplacementSizeStats({ trades, isLoading: externalLoading }) {
    const filteredTrades = trades.filter(
      (t) =>
        typeof t.displacement_size === 'number' &&
        (t.trade_outcome === 'Win' || t.trade_outcome === 'Lose' || t.trade_outcome === 'BE')
    );

    const allTradesPerMarket = new Map<string, Trade[]>();
    trades.forEach((t) => {
      const market = t.market || 'Unknown';
      if (!allTradesPerMarket.has(market)) {
        allTradesPerMarket.set(market, []);
      }
      allTradesPerMarket.get(market)!.push(t);
    });

    const hasAnyQualifyingTrades = filteredTrades.length > 0;

    const uniqueMarkets = Array.from(
      new Set(filteredTrades.map((t) => t.market || 'Unknown'))
    ).sort();

    const { mounted, isDark } = useDarkMode();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      if (mounted) {
        if (externalLoading !== undefined) {
          if (externalLoading) {
            setIsLoading(true);
          } else {
            const timer = setTimeout(() => setIsLoading(false), 600);
            return () => clearTimeout(timer);
          }
        } else {
          const timer = setTimeout(() => setIsLoading(false), 1000);
          return () => clearTimeout(timer);
        }
      }
    }, [mounted, externalLoading]);

    const axisTextColor = isDark ? '#cbd5e1' : '#64748b';

    const chartData = DISPLACEMENT_BUCKETS.map((bucket) => {
      const tradesInBucket = filteredTrades.filter((t) => {
        const d = t.displacement_size ?? 0;
        return d >= bucket.min && d < bucket.max;
      });
      const totalTrades = trades.length;
      const percentage =
        totalTrades > 0 ? (tradesInBucket.length / totalTrades) * 100 : 0;

      const marketDetails = uniqueMarkets
        .map((market) => {
          const marketTrades = filteredTrades.filter((t) => (t.market || 'Unknown') === market);
          const allMarketTrades = allTradesPerMarket.get(market) || [];
          const tradesInBucketForMarket = marketTrades.filter((t) => {
            const d = t.displacement_size ?? 0;
            return d >= bucket.min && d < bucket.max;
          });

          if (tradesInBucketForMarket.length === 0) return null;

          const marketPercentage =
            allMarketTrades.length > 0
              ? (tradesInBucketForMarket.length / allMarketTrades.length) * 100
              : 0;

          const wins = tradesInBucketForMarket.filter((t) => t.trade_outcome === 'Win').length;
          const losses = tradesInBucketForMarket.filter((t) => t.trade_outcome === 'Lose').length;
          const breakEven = tradesInBucketForMarket.filter((t) => t.trade_outcome === 'BE').length;
          const totalForWinrate = wins + losses;
          const winRate = totalForWinrate > 0 ? (wins / totalForWinrate) * 100 : 0;

          return {
            market,
            percentage: Number(marketPercentage.toFixed(1)),
            tradesWithBucket: tradesInBucketForMarket.length,
            totalTrades: allMarketTrades.length,
            wins,
            losses,
            breakEven,
            winRate: Number(winRate.toFixed(1)),
          };
        })
        .filter(Boolean) as Array<{
          market: string;
          percentage: number;
          tradesWithBucket: number;
          totalTrades: number;
          wins: number;
          losses: number;
          breakEven: number;
          winRate: number;
        }>;

      return {
        range: bucket.label,
        rangeKey: bucket.key,
        percentage: Number(percentage.toFixed(1)),
        totalTradesInBucket: tradesInBucket.length,
        totalTrades,
        marketDetails,
      };
    });

    const chartBarsData = chartData.map((d) => ({
      name: d.range,
      value: d.percentage,
      range: d.range,
      percentage: d.percentage,
      totalTradesInBucket: d.totalTradesInBucket,
    }));

    const maxValue = Math.max(...chartBarsData.map((d) => d.value), 1);

    const gradientColor = {
      start: '#3b82f6',
      mid: '#06b6d4',
      end: '#0ea5e9',
    };

    const CustomTooltip = ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: { payload: (typeof chartBarsData)[number] }[];
    }) => {
      if (!active || !payload?.length) return null;
      const d = payload[0].payload;
      const rowData = chartData.find((r) => r.range === d.range);
      if (!rowData?.marketDetails?.length) return null;

      const activeMarkets = rowData.marketDetails.filter((md) => md.tradesWithBucket > 0);
      if (activeMarkets.length === 0) return null;

      return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-50">
          <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="relative text-xs">
            <div className="font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Displacement Size {d.range}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mb-2">
              Overall:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {rowData.percentage.toFixed(1)}%
              </span>{' '}
              ({rowData.totalTradesInBucket}/{rowData.totalTrades} trades)
            </div>
            <div className="overflow-x-auto mt-1.5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                    <th className="text-left py-2 pr-4 font-semibold text-slate-600 dark:text-slate-400">Market</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">Wins</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">Losses</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">BE</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">Win Rate</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">%</th>
                    <th className="text-right py-2 pl-2 font-semibold text-slate-600 dark:text-slate-400">Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMarkets.map((marketData) => (
                    <tr key={marketData.market} className="border-b border-slate-100/60 dark:border-slate-800/60 last:border-0">
                      <td className="py-2 pr-4 font-medium text-slate-700 dark:text-slate-300">
                        {marketData.market}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {marketData.wins}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-rose-600 dark:text-rose-400">
                        {marketData.losses}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-amber-600 dark:text-amber-400">
                        {marketData.breakEven}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-amber-600 dark:text-amber-400">
                        {marketData.winRate.toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                        {marketData.percentage.toFixed(1)}%
                      </td>
                      <td className="py-2 pl-2 text-right text-slate-600 dark:text-slate-400">
                        {marketData.tradesWithBucket}/{marketData.totalTrades}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    };

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-[420px] flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Displacement Size Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on displacement size ranges
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (!hasAnyQualifyingTrades) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-[420px] flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Displacement Size Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
              Distribution of trades based on displacement size ranges
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
              No displacement size data found
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
              Add trades with Displacement Size to see distribution here.
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-visible border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-[420px] flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Displacement Size Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of trades based on displacement size ranges
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative pl-1 pr-4">
            <div className="w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartBarsData}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 0, bottom: 20 }}
                  barCategoryGap="20%"
                >
                  <defs>
                    <linearGradient id="dispSizeStatsGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={gradientColor.start} stopOpacity={1} />
                      <stop offset="50%" stopColor={gradientColor.mid} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={gradientColor.end} stopOpacity={0.9} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    type="number"
                    domain={[0, Math.ceil(maxValue * 1.15)]}
                    tick={{ fill: axisTextColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${Number(value ?? 0).toFixed(0)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: axisTextColor, fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={72}
                    tickMargin={8}
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
                    cursor={{ fill: 'transparent', radius: 8 }}
                    content={<CustomTooltip />}
                  />

                  <ReBar
                    dataKey="value"
                    radius={[0, 8, 8, 0]}
                    barSize={18}
                    fill="url(#dispSizeStatsGradient)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
