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

interface RiskRewardStatsProps {
  trades: Trade[];
  isLoading?: boolean;
}

// Only ratios we care about
export const DISPLAY_RATIOS = [2, 2.5, 3] as const;

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
      const tradesWithRatio = marketTrades.filter(
        (t) => t.risk_reward_ratio_long === ratio
      );
      const percentage =
        marketTrades.length > 0
          ? (tradesWithRatio.length / marketTrades.length) * 100
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
        totalTrades: allMarketTrades.length, // Use all trades for this market, not just filtered ones
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

  // Generate gradient IDs for each market
  const getGradientId = (market: string) => `rrGradient-${market.replace(/\s+/g, '-')}`;
  
  // Use the same gradient as SL Size Statistics (blue to cyan) for all markets
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
    
    // Get the ratio from the label
    const ratio = label;
    
    // Find the row data for this ratio
    const rowData = chartData.find((d) => d.ratio === ratio);
    
    if (!rowData || !rowData.marketDetails || rowData.marketDetails.length === 0) {
      return null;
    }

    // Filter market details to only show markets with non-zero values
    const activeMarkets = rowData.marketDetails.filter((md: any) => md.percentage > 0);

    if (activeMarkets.length === 0) {
      return null;
    }

    return (
      <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Risk/Reward {ratio}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                <th className="text-left py-2 pr-4 font-semibold text-slate-600 dark:text-slate-400">Market</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-400">%</th>
                <th className="text-right py-2 pl-2 font-semibold text-slate-600 dark:text-slate-400">Trades</th>
              </tr>
            </thead>
            <tbody>
              {activeMarkets.map((marketData: { 
                market: string; 
                percentage: number; 
                tradesWithRatio: number; 
                totalTrades: number;
                wins: number;
                losses: number;
                winRate: number;
              }) => (
                <tr key={marketData.market} className="border-b border-slate-100/60 dark:border-slate-800/60 last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-700 dark:text-slate-300">
                    {marketData.market}
                  </td>
                  <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-slate-100">
                    {marketData.percentage.toFixed(1)}%
                  </td>
                  <td className="py-2 pl-2 text-right text-slate-600 dark:text-slate-400">
                    {marketData.tradesWithRatio}/{marketData.totalTrades}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const yAxisTickFormatter = (value: number) =>
    `${Number(value ?? 0).toFixed(0)}%`;

  // --- Custom render X axis tick to left-align ratio number -----
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

  // --- 4. Render card + chart -------------------------------------------

  const hasAnyQualifyingTrades = filteredTrades.length > 0;

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
          Potential Risk/Reward Ratio Statistics
        </CardTitle>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Distribution of trades based on potential risk/reward ratio for each market
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex items-center">
        <div className="w-full h-full">
          {!mounted || isLoading ? (
            <div className="flex items-center justify-center w-full h-full min-h-[180px]">
              <BouncePulse size="md" />
            </div>
          ) : !hasAnyQualifyingTrades ? (
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No qualifying trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                No qualifying trades with Risk/Reward ratios of 2, 2.5, and 3 for any market.
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 24, left: 70, bottom: 48 }}
                barCategoryGap="30%"
              >
                <defs>
                  {eligibleMarkets.map((market) => (
                    <linearGradient 
                      key={market} 
                      id={getGradientId(market)} 
                      x1="0" 
                      y1="0" 
                      x2="0" 
                      y2="1"
                    >
                      <stop offset="0%" stopColor={gradientColor.start} stopOpacity={1} />
                      <stop offset="50%" stopColor={gradientColor.mid} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={gradientColor.end} stopOpacity={0.9} />
                    </linearGradient>
                  ))}
                </defs>
                
                <XAxis
                  dataKey="ratio"
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
                  label={{
                    value: 'Percentage of trades',
                    angle: -90,
                    position: 'middle',
                    fill: axisTextColor,
                    fontSize: 12,
                    fontWeight: 500,
                    dy: -10,
                    dx: -50,
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

                {eligibleMarkets.map((market, index) => {
                  // For stacked bars, we need to determine radius based on position
                  // Since Recharts applies radius per bar component (not per data point),
                  // we use a function to calculate radius dynamically based on the data
                  const isFirst = index === 0;
                  const isLast = index === eligibleMarkets.length - 1;
                  
                  // Use Cell component to apply different radius per data point
                  return (
                    <ReBar
                      key={market}
                      dataKey={market}
                      name={market}
                      stackId="a"
                      fill={`url(#${getGradientId(market)})`}
                      barSize={18}
                    >
                      {chartData.map((row, rowIndex) => {
                        // Find markets with non-zero values for this ratio
                        const marketsWithData = eligibleMarkets.filter((m) => (row[m] ?? 0) > 0);
                        const hasData = (row[market] ?? 0) > 0;
                        
                        if (!hasData) {
                          return <Cell key={`${row.ratio}-${market}`} radius={[0, 0, 0, 0] as any} />;
                        }
                        
                        // Find position among markets with data for this ratio
                        const dataIndex = marketsWithData.indexOf(market);
                        const isFirstInStack = dataIndex === 0;
                        const isLastInStack = dataIndex === marketsWithData.length - 1;
                        const isOnlyInStack = marketsWithData.length === 1;
                        
                        const radius = isOnlyInStack
                          ? [4, 4, 4, 4] // Single bar: round all corners
                          : isFirstInStack
                          ? [0, 0, 4, 4] // Bottom bar: round bottom corners
                          : isLastInStack
                          ? [4, 4, 0, 0] // Top bar: round top corners
                          : [0, 0, 0, 0]; // Middle bars: no rounding
                        
                        return <Cell key={`${row.ratio}-${market}`} radius={radius as any} />;
                      })}
                    </ReBar>
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
