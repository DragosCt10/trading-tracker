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

const slate500 = '#64748b';

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
  useEffect(() => setMounted(true), []);

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

  const barColors = [
    '#14b8a6', // teal-500
    '#f59e42', // orange/amber
    '#60a5fa', // blue-400
    '#be185d', // pink-700
    '#a21caf', // purple-800
    '#64748b', // slate-500 (fallback)
    '#ef4444', // red-500
  ];

  const yAxisTickFormatter = (value: number) => `${value ?? 0}`;

  /**
   * Improved tooltip: 
   * - More padding, spacing, and use grid for values.
   * - Stronger title, clear "Displacement Size [label]" section.
   * - Slightly increased font, adjusted alignment and font weights and modern look.
   * - Use borders and subtle background for header.
   * - Adds winrate as well.
   */
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    // Extract the relevant rows: only those with trades
    const marketRows = payload
      .map((entry: any) => {
        const market = entry.dataKey;
        const breakdown = entry.payload[`${market}_breakdown`] ?? {};
        if (!breakdown || !breakdown.total || breakdown.total === 0) return null;
        // Calculate winrate as percentage (ignoring BE only if that's desired: here, wins/(wins+losses))
        const totalForWinrate = breakdown.wins + breakdown.losses;
        let winrate = null;
        if (totalForWinrate > 0) {
          winrate = (100 * breakdown.wins / totalForWinrate);
        }
        return {
          market,
          ...breakdown,
          winrate,
        };
      })
      .filter(Boolean);

    if (!marketRows.length) return null;

    return (
      <div className="rounded-2xl shadow bg-white/95 p-4 border border-slate-200 min-w-[270px]">
        <div
          className="mb-2 font-semibold text-slate-900 tracking-tight"
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '-0.5px',
          }}
        >
          Displacement Size <span className="text-emerald-600">{label}</span>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              <th className="text-left font-bold text-slate-500 pb-1 pr-2">Market</th>
              <th className="text-right font-medium text-slate-500 pb-1 px-1">Total</th>
              <th className="text-right font-medium text-slate-500 pb-1 px-1">Wins</th>
              <th className="text-right font-medium text-slate-500 pb-1 px-1">Losses</th>
              <th className="text-right font-medium text-slate-500 pb-1 pl-1">BE</th>
              <th className="text-right font-medium text-slate-500 pb-1 pl-2">Winrate</th>
            </tr>
          </thead>
          <tbody>
            {marketRows.map((row: any, idx: number) => (
              <tr
                key={row.market}
                className={[
                  'transition hover:bg-emerald-50',
                  idx === 0 ? '' : 'border-t border-slate-100'
                ].join(' ')}
              >
                <td className="pr-2 py-1 font-semibold text-slate-900">{row.market}</td>
                <td className="text-right px-1 py-1 font-medium text-slate-900">{row.total}</td>
                <td className="text-right px-1 py-1 font-medium text-emerald-600">{row.wins}</td>
                <td className="text-right px-1 py-1 font-medium text-red-500">{row.losses}</td>
                <td className="text-right pl-1 py-1 font-medium text-blue-500">{row.be}</td>
                <td className="text-right pl-2 py-1 font-medium text-amber-700">
                  {row.winrate !== null
                    ? `${row.winrate.toFixed(1)}%`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Card className="border shadow-none h-96 flex flex-col bg-white">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
          Displacement Size Profitability (Points)
        </CardTitle>
        <CardDescription className="text-sm text-slate-500 mb-3">
          Distribution of trades, grouped by displacement size, <b>per market</b>.<br />
          Hover a bar to see wins, losses, BE counts, and <b>winrate</b> for that market and size.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center">
        <div className="w-full h-full">
          {!mounted ? (
            <div
              className="flex items-center justify-center text-slate-400 h-full text-sm"
              style={{ minHeight: 180 }}
              aria-hidden
            >
              —
            </div>
          ) : !hasAnyQualifyingTrades ? (
            <div
              className="flex items-center justify-center text-slate-400 h-full text-sm"
              style={{ minHeight: 180 }}
            >
              No qualifying trades with displacement size recorded.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupedByBucket}
                margin={{ top: 10, right: 24, left: 16, bottom: 48 }}
                barCategoryGap="30%"
              >
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
                      fill={slate500}
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
                  tick={{ fill: slate500, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yAxisTickFormatter}
                  label={{
                    value: 'Number of trades',
                    angle: -90,
                    position: 'middle',
                    fill: slate500,
                    fontSize: 13,
                    fontWeight: 500,
                    dy: 0,
                    dx: -20,
                  }}
                />

                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 12 }}
                />

                <ReTooltip
                  content={<CustomTooltip />}
                  cursor={false}
                  wrapperStyle={{ outline: 'none' }}
                />

                {uniqueMarkets.map((market, idx) => (
                  <ReBar
                    key={market}
                    dataKey={market}
                    name={market}
                    fill={barColors[idx % barColors.length]}
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
