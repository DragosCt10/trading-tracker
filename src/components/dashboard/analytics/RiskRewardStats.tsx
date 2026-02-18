'use client';

import { useState, useEffect } from 'react';
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

interface RiskRewardStatsProps {
  trades: Trade[];
}

// Only ratios we care about
const DISPLAY_RATIOS = [2, 2.5, 3];

export function RiskRewardStats({ trades }: RiskRewardStatsProps) {
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

  // --- 2. Build Recharts data (one object per ratio, only for eligible markets) --------

  // Only consider trades for eligible markets and the chosen ratios
  const filteredTrades = trades.filter(
    (t) =>
      eligibleMarkets.includes(t.market) &&
      typeof t.risk_reward_ratio_long === "number" &&
      DISPLAY_RATIOS.includes(t.risk_reward_ratio_long)
  );

  // For each ratio, build a row for the chart
  const chartData = DISPLAY_RATIOS.map((ratio) => {
    const row: Record<string, string | number> = { ratio: ratio.toString() };
    eligibleMarkets.forEach((market) => {
      const marketTrades = filteredTrades.filter((t) => t.market === market);
      // Show percent, with denominator as all eligible trades for this market and ratio set
      const tradesWithRatio = marketTrades.filter(
        (t) => t.risk_reward_ratio_long === ratio
      );
      const percentage =
        marketTrades.length > 0
          ? (tradesWithRatio.length / marketTrades.length) * 100
          : 0;
      row[market] = Number(percentage.toFixed(1));
    });
    return row;
  });

  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

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

  // Dynamic colors based on dark mode
  const slate500 = isDark ? '#94a3b8' : '#64748b'; // slate-400 in dark, slate-500 in light
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b'; // slate-300 in dark, slate-500 in light

  // Generate gradient IDs for each market
  const getGradientId = (market: string) => `rrGradient-${market.replace(/\s+/g, '-')}`;
  
  // Color palette for markets (will be used in gradients)
  const marketColors = [
    { start: '#14b8a6', mid: '#06b6d4', end: '#0d9488' }, // teal-500 to cyan-500 to teal-600
    { start: '#3b82f6', mid: '#60a5fa', end: '#2563eb' }, // blue-500 to blue-400 to blue-600
    { start: '#f59e0b', mid: '#fbbf24', end: '#d97706' }, // amber-500 to amber-400 to amber-600
    { start: '#ec4899', mid: '#f472b6', end: '#db2777' }, // pink-500 to pink-400 to pink-600
    { start: '#6366f1', mid: '#818cf8', end: '#4f46e5' }, // indigo-500 to indigo-400 to indigo-600
  ];

  // --- 3. Tooltip --------------------------------------------------------

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }
    // d is the hovered ratio's row
    const d = payload[0].payload as (typeof chartData)[number];

    // If no eligible markets at all, hide tooltip
    if (!eligibleMarkets.length) {
      return null;
    }

    return (
      <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Risk/Reward {d.ratio}
        </div>
        <div className="space-y-2">
          {eligibleMarkets.map((market) => {
            const value = d[market] ?? 0;
            return (
              <div key={market} className="flex items-baseline justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{market}:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {Number(value).toFixed(1)}%
                </span>
              </div>
            );
          })}
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
        textAnchor="start"
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
          {!mounted ? (
            <div
              className="flex items-center justify-center text-slate-400 dark:text-slate-500 h-full text-sm"
              style={{ minHeight: 180 }}
              aria-hidden
            >
              —
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
                  {eligibleMarkets.map((market, index) => {
                    const color = marketColors[index % marketColors.length];
                    return (
                      <linearGradient key={market} id={getGradientId(market)} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color.start} stopOpacity={0.9} />
                        <stop offset="50%" stopColor={color.mid} stopOpacity={0.85} />
                        <stop offset="100%" stopColor={color.end} stopOpacity={0.8} />
                      </linearGradient>
                    );
                  })}
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

                {eligibleMarkets.map((market, index) => (
                  <ReBar
                    key={market}
                    dataKey={market}
                    name={market}
                    fill={`url(#${getGradientId(market)})`}
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
