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
  // Only consider trades that have a numerical displacement_size and a clear outcome (Win / Lose / BE)
  // Displacement size can be any number (no filtering by 20+)
  // Note: All trades have Win/Lose outcomes, so we filter by displacement_size only
  const filteredTrades = trades.filter(
    (t) =>
      typeof t.displacement_size === 'number' &&
      (t.trade_outcome === 'Win' || t.trade_outcome === 'Lose' || t.trade_outcome === 'BE')
  );

  // Get all trades per market for total counts (not filtered by displacement_size)
  const allTradesPerMarket = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const market = t.market || 'Unknown';
    if (!allTradesPerMarket.has(market)) {
      allTradesPerMarket.set(market, []);
    }
    allTradesPerMarket.get(market)!.push(t);
  });

  const hasAnyQualifyingTrades = filteredTrades.length > 0;

  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Check for dark mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Keep loading until external loading is complete and minimum time has passed
    if (mounted) {
      // If external loading is provided, use it
      if (externalLoading !== undefined) {
        if (externalLoading) {
          // Still loading externally - keep showing animation
          setIsLoading(true);
        } else {
          // External loading is complete, wait minimum time then stop loading
          const timer = setTimeout(() => {
            setIsLoading(false);
          }, 600);
          return () => clearTimeout(timer);
        }
      } else {
        // No external loading prop - use internal timer
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [mounted, externalLoading]);

  // Dynamic colors based on dark mode
  const slate500 = isDark ? '#94a3b8' : '#64748b'; // slate-400 in dark, slate-500 in light
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b'; // slate-300 in dark, slate-500 in light

  // Unique markets from filtered trades, sorted alphabetically
  const uniqueMarkets = Array.from(
    new Set(filteredTrades.map((t) => t.market || 'Unknown'))
  ).sort();

  // Build chart data: one row per range/bucket, showing total percentage
  const chartData = DISPLACEMENT_BUCKETS.map((bucket) => {
    // Get all trades in this bucket across all markets
    const tradesInBucket = filteredTrades.filter((t) => {
      const d = t.displacement_size ?? 0;
      return d >= bucket.min && d < bucket.max;
    });

    // Use all trades (not filtered) for total count
    const totalTrades = trades.length;
    const percentage =
      totalTrades > 0
        ? (tradesInBucket.length / totalTrades) * 100
        : 0;

    // Store market details for tooltip
    const marketDetails = uniqueMarkets
      .map((market) => {
        const marketTrades = filteredTrades.filter((t) => (t.market || 'Unknown') === market);
        const allMarketTrades = allTradesPerMarket.get(market) || [];
        const tradesInBucketForMarket = marketTrades.filter((t) => {
          const d = t.displacement_size ?? 0;
          return d >= bucket.min && d < bucket.max;
        });

        if (tradesInBucketForMarket.length === 0) {
          return null;
        }

        const marketPercentage =
          allMarketTrades.length > 0
            ? (tradesInBucketForMarket.length / allMarketTrades.length) * 100
            : 0;

        // Calculate wins, losses, and win rate for trades in this bucket for this market
        const wins = tradesInBucketForMarket.filter((t) => t.trade_outcome === 'Win').length;
        const losses = tradesInBucketForMarket.filter((t) => t.trade_outcome === 'Lose').length;
        const totalForWinrate = wins + losses;
        const winRate = totalForWinrate > 0 ? (wins / totalForWinrate) * 100 : 0;

        return {
          market,
          percentage: Number(marketPercentage.toFixed(1)),
          tradesWithBucket: tradesInBucketForMarket.length,
          totalTrades: allMarketTrades.length, // Use all trades for this market, not just filtered ones
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

  // Generate gradient ID (single gradient for all bars)
  const gradientId = 'dsGradient-main';
  
  // Use the same gradient as RiskRewardStats (blue to cyan) for all bars
  const gradientColor = {
    start: '#3b82f6', // blue-500
    mid: '#06b6d4',   // cyan-500
    end: '#0ea5e9',   // sky-500
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
    if (!active || !payload || payload.length === 0) {
      return null;
    }
    
    // Get the range from the label
    const range = label;
    
    // Find the row data for this range
    const rowData = chartData.find((d) => d.range === range);
    
    if (!rowData || !rowData.marketDetails || rowData.marketDetails.length === 0) {
      return null;
    }

    // Filter market details to only show markets with trades in this range
    const activeMarkets = rowData.marketDetails.filter((md: any) => md.tradesWithBucket > 0);

    if (activeMarkets.length === 0) {
      return null;
    }

    return (
      <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Displacement Size {range}
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
              {activeMarkets.map((marketData: { 
                market: string;
                percentage: number;
                tradesWithBucket: number;
                totalTrades: number;
                wins: number;
                losses: number;
                winRate: number;
              }) => (
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
    );
  };

  // --- Custom render X axis tick to center range name -----
  const renderXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <text
        x={x}
        y={y}
        dy={16}
        textAnchor="middle"
        fill={axisTextColor}
        fontSize={12}
      >
        {payload?.value}
      </text>
    );
  };

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
          Displacement Size Stats
        </CardTitle>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Distribution of trades based on displacement size ranges
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
                There are no trades to display for this category yet. Start trading to see your statistics here!
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
                  <linearGradient 
                    id={gradientId} 
                    x1="0" 
                    y1="0" 
                    x2="0" 
                    y2="1"
                  >
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
                    minWidth: '180px'
                  }}
                  wrapperStyle={{ 
                    outline: 'none',
                    zIndex: 1000
                  }}
                  cursor={{ 
                    fill: 'transparent', 
                    radius: 8,
                  }}
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
