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

export interface FvgSizeStatsProps {
  trades: Trade[];
  isLoading?: boolean;
}

export const FVG_SIZE_BUCKETS = [
  { key: '0.5-1', label: '0.5–1', min: 0.5, max: 1 },
  { key: '1-1.5', label: '1–1.5', min: 1, max: 1.5 },
  { key: '1.5-2', label: '1.5–2', min: 1.5, max: 2 },
  { key: '2-2.5', label: '2–2.5', min: 2, max: 2.5 },
  { key: '2.5-3', label: '2.5–3', min: 2.5, max: 3 },
  { key: '3+', label: '3+', min: 3, max: Infinity },
] as const;

export const FvgSizeStats: React.FC<FvgSizeStatsProps> = React.memo(
  function FvgSizeStats({ trades, isLoading: externalLoading }) {
    const filteredTrades = trades.filter(
      (t) =>
        typeof t.fvg_size === 'number' &&
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

    const uniqueMarkets = Array.from(
      new Set(filteredTrades.map((t) => t.market || 'Unknown'))
    ).sort();

    const chartData = FVG_SIZE_BUCKETS.map((bucket) => {
      const tradesInBucket = filteredTrades.filter((t) => {
        const d = t.fvg_size ?? 0;
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
            const d = t.fvg_size ?? 0;
            return d >= bucket.min && d < bucket.max;
          });

          if (tradesInBucketForMarket.length === 0) return null;

          const marketPercentage =
            allMarketTrades.length > 0
              ? (tradesInBucketForMarket.length / allMarketTrades.length) * 100
              : 0;

          const wins = tradesInBucketForMarket.filter((t) => t.trade_outcome === 'Win').length;
          const losses = tradesInBucketForMarket.filter((t) => t.trade_outcome === 'Lose').length;
          const totalForWinrate = wins + losses;
          const winRate = totalForWinrate > 0 ? (wins / totalForWinrate) * 100 : 0;

          return {
            market,
            percentage: Number(marketPercentage.toFixed(1)),
            tradesWithBucket: tradesInBucketForMarket.length,
            totalTrades: allMarketTrades.length,
            wins,
            losses,
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

    const gradientId = 'fvgGradient-main';
    const gradientColor = {
      start: '#3b82f6',
      mid: '#06b6d4',
      end: '#0ea5e9',
    };

    const yAxisTickFormatter = (value: number) =>
      `${Number(value ?? 0).toFixed(0)}%`;

    const CustomTooltip = ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: any[];
      label?: string;
    }) => {
      if (!active || !payload || payload.length === 0) return null;
      const range = label;
      const rowData = chartData.find((d) => d.range === range);
      if (!rowData?.marketDetails?.length) return null;
      const activeMarkets = rowData.marketDetails.filter((md: any) => md.tradesWithBucket > 0);
      if (activeMarkets.length === 0) return null;

      return (
        <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            FVG Size {range}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                  <th className="text-left py-2 pr-4 font-semibold text-slate-600 dark:text-slate-400">Market</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">Wins</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">Losses</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">Win Rate</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">%</th>
                  <th className="text-right py-2 pl-2 font-semibold text-slate-600 dark:text-slate-400">Trades</th>
                </tr>
              </thead>
              <tbody>
                {activeMarkets.map((marketData: any) => (
                  <tr key={marketData.market} className="border-b border-slate-100/60 dark:border-slate-800/60 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-700 dark:text-slate-300">{marketData.market}</td>
                    <td className="py-2 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{marketData.wins}</td>
                    <td className="py-2 px-2 text-right font-bold text-rose-600 dark:text-rose-400">{marketData.losses}</td>
                    <td className="py-2 px-2 text-right font-bold text-amber-600 dark:text-amber-400">{marketData.winRate.toFixed(1)}%</td>
                    <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-slate-100">{marketData.percentage.toFixed(1)}%</td>
                    <td className="py-2 pl-2 text-right text-slate-600 dark:text-slate-400">{marketData.tradesWithBucket}/{marketData.totalTrades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    const renderXAxisTick = (props: any) => {
      const { x, y, payload } = props;
      return (
        <text x={x} y={y} dy={16} textAnchor="middle" fill={axisTextColor} fontSize={12}>
          {payload?.value}
        </text>
      );
    };

    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            FVG Size Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of trades by FVG size ranges
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex items-center w-full min-w-0">
          <div className="w-full h-full min-w-0">
            {!mounted || isLoading ? (
              <div className="flex items-center justify-center w-full h-full min-h-[180px]">
                <BouncePulse size="md" />
              </div>
            ) : !hasAnyQualifyingTrades ? (
              <div className="flex flex-col justify-center items-center w-full h-full">
                <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                  No trades found
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                  There are no trades with FVG size to display yet.
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 16, left: 24, bottom: 48 }}
                  barCategoryGap="20%"
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={gradientColor.start} stopOpacity={1} />
                      <stop offset="50%" stopColor={gradientColor.mid} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={gradientColor.end} stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="range"
                    axisLine={false}
                    tickLine={false}
                    tick={renderXAxisTick as any}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: axisTextColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={yAxisTickFormatter}
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
                      minWidth: '180px',
                    }}
                    wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                    cursor={{ fill: 'transparent', radius: 8 }}
                    content={<CustomTooltip />}
                  />
                  <ReBar
                    dataKey="percentage"
                    fill={`url(#${gradientId})`}
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);
