'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar as ReBar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

import { Trade } from '@/types/trade';

interface DisplacementSizeStatsProps {
  trades: Trade[];
}

const DISPLACEMENT_BUCKETS = [
  { key: '10-20', label: '10–20', min: 10, max: 20 },
  { key: '20-30', label: '20–30', min: 20, max: 30 },
  { key: '30-40', label: '30–40', min: 30, max: 40 },
  { key: '40+', label: '40+', min: 40, max: Infinity },
];

export function DisplacementSizeStats({ trades }: DisplacementSizeStatsProps) {
  // Only consider trades that have a numerical displacement_size and a clear outcome (Win / Lose / BE)
  // Displacement size can be any number (no filtering by 20+)
  const filteredTrades = trades.filter(
    (t) =>
      typeof t.displacement_size === 'number' &&
      (t.trade_outcome === 'Win' || t.trade_outcome === 'Lose' || t.trade_outcome === 'BE')
  );

  const hasAnyQualifyingTrades = filteredTrades.length > 0;

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

  // Unique markets from filtered trades, sorted alphabetically
  const uniqueMarkets = Array.from(
    new Set(filteredTrades.map((t) => t.market || 'Unknown'))
  ).sort();

  // Chart data: one bar per market per bucket
  const chartData = DISPLACEMENT_BUCKETS.flatMap((bucket) => {
    return uniqueMarkets.map((market) => {
      const bucketMarketTrades = filteredTrades.filter((t) => {
        const d = t.displacement_size ?? 0;
        return (
          d >= bucket.min &&
          d < bucket.max &&
          (t.market || 'Unknown') === market
        );
      });

      // Count outcomes
      const wins = bucketMarketTrades.filter((t) => t.trade_outcome === 'Win').length;
      const losses = bucketMarketTrades.filter((t) => t.trade_outcome === 'Lose').length;
      // Only count BE trades where t.break_even true
      const be = bucketMarketTrades.filter((t) => t.break_even).length;
      const total = bucketMarketTrades.length;

      return {
        bucketKey: bucket.key,
        bucketLabel: bucket.label,
        market,
        wins,
        losses,
        be,
        total,
        hasTrades: total > 0,
        breakdown: { wins, losses, be, total },
        trades: bucketMarketTrades,
      };
    });
  }).filter((d) => d.hasTrades);

  // Group chartData by bucket for X axis categories
  const groupedByBucket = DISPLACEMENT_BUCKETS.map((bucket) => {
    const row: Record<string, any> = { bucketKey: bucket.key, range: bucket.label };
    uniqueMarkets.forEach((market) => {
      const found = chartData.find(
        (d) => d.bucketKey === bucket.key && d.market === market
      );
      row[market] = found?.total ?? 0;
      row[`${market}_breakdown`] = found || { wins: 0, losses: 0, be: 0, total: 0, trades: [] };
    });
    return row;
  });

  // Check if there's any actual data to display (chartData is empty if no trades match the buckets)
  const hasChartData = chartData.length > 0;

  // Generate gradient IDs for each market
  const getGradientId = (market: string) => `dsGradient-${market.replace(/\s+/g, '-')}`;
  
  // Color palette for markets (will be used in gradients)
  const marketColors = [
    { start: '#14b8a6', mid: '#06b6d4', end: '#0d9488' }, // teal-500 to cyan-500 to teal-600
    { start: '#f59e0b', mid: '#fbbf24', end: '#d97706' }, // amber-500 to amber-400 to amber-600
    { start: '#3b82f6', mid: '#60a5fa', end: '#2563eb' }, // blue-500 to blue-400 to blue-600
    { start: '#ec4899', mid: '#f472b6', end: '#db2777' }, // pink-500 to pink-400 to pink-600
    { start: '#8b5cf6', mid: '#a78bfa', end: '#7c3aed' }, // purple-500 to purple-400 to purple-600
    { start: '#64748b', mid: '#94a3b8', end: '#475569' }, // slate-500 to slate-400 to slate-600
    { start: '#ef4444', mid: '#f87171', end: '#dc2626' }, // red-500 to red-400 to red-600
  ];

  const yAxisTickFormatter = (value: number) => `${value ?? 0}`;

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

    // Get the row data from the first payload entry (all entries share the same payload for the category)
    const rowData = payload[0]?.payload;
    if (!rowData) return null;

    // Extract all markets from uniqueMarkets and get their breakdown data
    const marketRows = uniqueMarkets
      .map((market: string) => {
        const breakdown = rowData[`${market}_breakdown`] ?? {};
        if (!breakdown || !breakdown.total || breakdown.total === 0) return null;
        const wins = breakdown.wins ?? 0;
        const losses = breakdown.losses ?? 0;
        const beWins = breakdown.be ?? 0;
        const beLosses = 0; // BE losses not tracked separately in this component
        const totalForWinrate = wins + losses;
        const winRate = totalForWinrate > 0 ? (wins / totalForWinrate) * 100 : 0;
        return {
          market,
          wins,
          losses,
          beWins,
          beLosses,
          total: breakdown.total,
          winRate,
        };
      })
      .filter(Boolean);

    if (!marketRows.length) return null;

    return (
      <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Displacement Size {label ? <span className="text-emerald-600 dark:text-emerald-400">{label}</span> : ''}
        </div>
        <div className="space-y-2">
          {marketRows.map((row: any, idx: number) => (
            <div key={row.market}>
              {idx > 0 && <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 mb-2" />}
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {row.market} ({row.total} trade{row.total === 1 ? '' : 's'})
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins:</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {row.wins} {row.beWins > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({row.beWins} BE)</span>}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses:</span>
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {row.losses} {row.beLosses > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({row.beLosses} BE)</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate:</span>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    {row.winRate.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
          Displacement Size Statistics
        </CardTitle>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Distribution of trades, grouped by displacement size, per market. 
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center overflow-visible">
        <div className="w-full h-full overflow-visible">
          {!mounted ? (
            <div
              className="flex items-center justify-center text-slate-400 dark:text-slate-500 h-full text-sm"
              style={{ minHeight: 180 }}
              aria-hidden
            >
              —
            </div>
          ) : !hasAnyQualifyingTrades || !hasChartData ? (
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
                data={groupedByBucket}
                margin={{ top: 10, right: 24, left: 70, bottom: 48 }}
                barCategoryGap="30%"
              >
                <defs>
                  {uniqueMarkets.map((market, index) => {
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
                  dataKey="range"
                  axisLine={false}
                  tickLine={false}
                  tick={({ x, y, payload }) => (
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
                  )}
                />
                <YAxis
                  type="number"
                  domain={[0, 'dataMax + 2']}
                  allowDecimals={false}
                  tick={{ fill: axisTextColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yAxisTickFormatter}
                  label={{
                    value: 'Number of trades',
                    angle: -90,
                    position: 'middle',
                    fill: axisTextColor,
                    fontSize: 12,
                    fontWeight: 500,
                    dy: -10,
                    dx: -20,
                  }}
                />

                <ReTooltip
                  shared={true}
                  allowEscapeViewBox={{ x: true, y: true }}
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
                    minWidth: '160px'
                  }}
                  wrapperStyle={{ 
                    outline: 'none',
                    zIndex: 9999,
                    pointerEvents: 'none'
                  }}
                  cursor={{ 
                    fill: 'transparent', 
                    radius: 8,
                  }}
                  content={<CustomTooltip />}
                />

                {uniqueMarkets.map((market, idx) => (
                  <ReBar
                    key={market}
                    dataKey={market}
                    name={market}
                    fill={`url(#${getGradientId(market)})`}
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
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
