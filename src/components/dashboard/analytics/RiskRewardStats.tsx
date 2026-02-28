'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar as ReBar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Cell,
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

interface RiskRewardStatsProps {
  trades: Trade[];
  isLoading?: boolean;
}

// All valid Potential R:R values: 1 to 10 in 0.5 steps, plus 10+ (stored as 10.5)
const RATIOS_1_TO_10 = Array.from({ length: 19 }, (_, i) => 1 + i * 0.5) as number[];
export const DISPLAY_RATIOS: readonly number[] = [...RATIOS_1_TO_10, 10.5];

/** Format ratio for display (10.5 -> "10+") */
function formatRatioLabel(ratio: number): string {
  return ratio === 10.5 ? '10+' : String(ratio);
}

export function RiskRewardStats({ trades, isLoading: externalLoading }: RiskRewardStatsProps) {
  // --- 1. Find all unique markets with at least one trade with a qualifying ratio -----

  // Instead of requiring every market to have ALL ratios, we'll include markets
  // that have *any* trades with r/r 2, 2.5 or 3.
  const marketToRatios = new Map<string, Set<number>>();
  trades.forEach((t) => {
    if (
      typeof t.risk_reward_ratio_long === "number" &&
      DISPLAY_RATIOS.includes(t.risk_reward_ratio_long)
    ) {
      if (!marketToRatios.has(t.market)) marketToRatios.set(t.market, new Set());
      marketToRatios.get(t.market)!.add(t.risk_reward_ratio_long);
    }
  });

  // show all markets with at least 1 matching ratio, show chart for all present ratios
  const eligibleMarkets = Array.from(marketToRatios.keys());

  // --- 2. Build Recharts data for stacked bar chart --------

  // Only consider trades for eligible markets and the chosen ratios
  const filteredTrades = trades.filter(
    (t) =>
      eligibleMarkets.includes(t.market) &&
      typeof t.risk_reward_ratio_long === "number" &&
      DISPLAY_RATIOS.includes(t.risk_reward_ratio_long)
  );

  // For each ratio, create one row with all markets as separate dataKeys
  const chartData = DISPLAY_RATIOS.map((ratio) => {
    const row: Record<string, any> = {
      ratio: ratio.toString(),
    };

    // Store market details for tooltip
    const marketDetailsMap = new Map<string, {
      percentage: number;
      tradesWithRatio: number;
      totalTrades: number;
      wins: number;
      losses: number;
      winRate: number;
    }>();

    eligibleMarkets.forEach((market) => {
      const marketTrades = filteredTrades.filter((t) => t.market === market);
      // Get all trades for this market (not filtered by ratio) for total count
      const allMarketTrades = trades.filter((t) => t.market === market);
      const totalTradesForMarket = allMarketTrades.length;
      const tradesWithRatio = marketTrades.filter(
        (t) => t.risk_reward_ratio_long === ratio
      );
      // Percentage of ALL trades in this market that have this ratio
      const percentage =
        totalTradesForMarket > 0
          ? (tradesWithRatio.length / totalTradesForMarket) * 100
          : 0;
      
      // Calculate wins, losses, and win rate for trades with this ratio
      const wins = tradesWithRatio.filter((t) => t.trade_outcome === 'Win').length;
      const losses = tradesWithRatio.filter((t) => t.trade_outcome === 'Lose').length;
      const totalForWinrate = wins + losses;
      const winRate = totalForWinrate > 0 ? (wins / totalForWinrate) * 100 : 0;
      
      // Set the market value in the row (for stacked bars)
      row[market] = Number(percentage.toFixed(1));
      
      // Store details for tooltip
      marketDetailsMap.set(market, {
        percentage: Number(percentage.toFixed(1)),
        tradesWithRatio: tradesWithRatio.length,
        totalTrades: totalTradesForMarket, // All trades for this market
        wins,
        losses,
        winRate: Number(winRate.toFixed(1)),
      });
    });

    // Store market details in the row for tooltip access
    row.marketDetails = Array.from(marketDetailsMap.entries()).map(([market, details]) => ({
      market,
      ...details,
    }));

    return row;
  });

  // Only show ratios that have at least one market with data
  const chartDataWithData = chartData.filter((row) =>
    eligibleMarkets.some((m) => (row[m] ?? 0) > 0)
  );

  // Aggregate data per ratio for the main chart (single bar per ratio, across all markets
  // that actually use that ratio). This keeps the bar percentage aligned with the tooltip's
  // "Overall" percentage.
  const chartBarsData = chartDataWithData
    .map((row) => {
      const details: any[] = row.marketDetails ?? [];
      const active = details.filter((md) => (md.tradesWithRatio ?? 0) > 0);
      const tradesWithRatioTotal = active.reduce(
        (sum, md) => sum + (md.tradesWithRatio ?? 0),
        0
      );
      const totalTradesAll = active.reduce(
        (sum, md) => sum + (md.totalTrades ?? 0),
        0
      );
      const percentage =
        totalTradesAll > 0 ? (tradesWithRatioTotal / totalTradesAll) * 100 : 0;

      const raw = row.ratio;
      const num = raw != null ? parseFloat(String(raw)) : NaN;

      return {
        name: !Number.isNaN(num) ? formatRatioLabel(num) : String(raw),
        ratio: String(raw),
        value: Number(percentage.toFixed(1)),
      };
    })
    .filter((d) => d.value > 0);

  const { mounted, isDark } = useDarkMode();
  const [isLoading, setIsLoading] = useState(true);


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

  // Use the same gradient as Stop Loss Size Stats (blue to cyan) for bars
  const gradientColor = {
    start: '#3b82f6', // blue-500
    mid: '#06b6d4',   // cyan-500
    end: '#0ea5e9',   // sky-500
  };

  // --- 3. Tooltip --------------------------------------------------------

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

    // Get the underlying ratio key from the payload (string like "3" or "10.5")
    const first = payload[0]?.payload as any;
    const ratioKey = first?.ratio ?? label;
    const ratioStr = ratioKey != null ? String(ratioKey) : undefined;
    const ratioNum = ratioStr != null ? parseFloat(ratioStr) : NaN;
    const ratioDisplay =
      !Number.isNaN(ratioNum) ? formatRatioLabel(ratioNum) : ratioStr ?? '';

    // Find the row data for this ratio (for full market breakdown)
    const rowData =
      ratioStr != null ? chartDataWithData.find((d) => d.ratio === ratioStr) : undefined;

    if (!rowData || !rowData.marketDetails || rowData.marketDetails.length === 0) {
      return null;
    }

    // Filter market details to only show markets with non-zero values
    const activeMarkets = rowData.marketDetails.filter((md: any) => md.tradesWithRatio > 0);

    if (activeMarkets.length === 0) {
      return null;
    }

    const totalTradesAll = activeMarkets.reduce(
      (sum: number, md: any) => sum + (md.totalTrades ?? 0),
      0
    );
    const tradesWithRatioAll = activeMarkets.reduce(
      (sum: number, md: any) => sum + (md.tradesWithRatio ?? 0),
      0
    );
    const overallPct =
      totalTradesAll > 0 ? (tradesWithRatioAll / totalTradesAll) * 100 : 0;

    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 text-slate-900 dark:text-slate-50">
        <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
        <div className="relative text-xs">
          <div className="font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
            Risk/Reward {ratioDisplay}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 mb-2">
            Overall:{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {overallPct.toFixed(1)}%
            </span>{' '}
            ({tradesWithRatioAll}/{totalTradesAll} trades)
          </div>
        </div>
        <div className="relative overflow-x-auto text-xs mt-1.5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                <th className="text-left py-2 pr-4 font-semibold text-slate-600 dark:text-slate-400">
                  Market
                </th>
                <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">
                  %
                </th>
                <th className="text-right py-2 pl-2 font-semibold text-slate-600 dark:text-slate-400">
                  Trades
                </th>
              </tr>
            </thead>
            <tbody>
              {activeMarkets.map((marketData: { 
                market: string; 
                tradesWithRatio: number; 
                totalTrades: number;
                wins: number;
                losses: number;
                winRate: number;
              }) => {
                const marketPct =
                  (marketData.totalTrades ?? 0) > 0
                    ? (marketData.tradesWithRatio / marketData.totalTrades) * 100
                    : 0;
                return (
                  <tr
                    key={marketData.market}
                    className="border-b border-slate-100/60 dark:border-slate-800/60 last:border-0"
                  >
                    <td className="py-2 pr-4 font-medium text-slate-700 dark:text-slate-300">
                      {marketData.market}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                      {marketPct.toFixed(1)}%
                    </td>
                    <td className="py-2 pl-2 text-right text-slate-600 dark:text-slate-400">
                      {marketData.tradesWithRatio}/{marketData.totalTrades}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const yAxisTickFormatter = (value: number) =>
    `${Number(value ?? 0).toFixed(0)}%`;

  // --- 4. Render card + chart -------------------------------------------

  const hasAnyQualifyingTrades = filteredTrades.length > 0;

  return (
    <Card className="relative overflow-visible border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-[420px] flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
          Potential Risk/Reward Ratio Stats
        </CardTitle>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Distribution of trades based on potential risk/reward ratio for each market
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
        <div className="flex-1 w-full flex items-center justify-center min-h-0 relative pl-1 pr-4">
          <div className="w-full h-full relative">
            {!mounted || isLoading ? (
              <div className="flex items-center justify-center w-full h-full min-h-[180px]">
                <BouncePulse size="md" />
              </div>
            ) : !hasAnyQualifyingTrades || chartBarsData.length === 0 ? (
              <div className="flex flex-col justify-center items-center w-full h-full">
                <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                  No qualifying trades found
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                  No trades with a potential Risk/Reward ratio (1 – 10 or 10+) for any market.
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartBarsData}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 0, bottom: 20 }}
                  barCategoryGap="20%"
                >
                  <defs>
                    <linearGradient id="riskRewardGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={gradientColor.start} stopOpacity={1} />
                      <stop offset="50%" stopColor={gradientColor.mid} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={gradientColor.end} stopOpacity={0.9} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    type="number"
                    domain={[0, 100]}
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
                      minWidth: '180px'
                    }}
                    wrapperStyle={{
                      outline: 'none',
                      zIndex: 1000
                    }}
                    cursor={{ stroke: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.4)', strokeWidth: 1 }}
                    content={<CustomTooltip />}
                  />

                  <ReBar
                    dataKey="value"
                    radius={[0, 7, 7, 0]}
                    barSize={18}
                    fill="url(#riskRewardGradient)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
