'use client';

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

interface RiskRewardStatsProps {
  trades: Trade[];
}

const slate500 = '#64748b';

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

  // simple palette
  const colors = [
    'rgba(45,212,191,0.9)', // teal-400
    'rgba(96,165,250,0.9)', // blue-400
    'rgba(251,191,36,0.9)', // amber-400
    'rgba(244,114,182,0.9)', // pink-400
    'rgba(129,140,248,0.9)', // indigo-400
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
      <div className="rounded-lg shadow bg-white p-3 border border-slate-200 text-[13px] leading-snug min-w-[180px]">
        <div className="font-semibold mb-1 text-slate-800 text-[15px]">
          Risk/Reward {d.ratio}
        </div>
        <div className="space-y-0.5">
          {eligibleMarkets.map((market) => {
            const value = d[market] ?? 0;
            return (
              <div key={market} className="text-slate-500">
                {market}:{' '}
                <span className="font-semibold text-slate-700">
                  {Number(value).toFixed(1)}%
                </span>{' '}
                of trades
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
        fill={slate500}
        fontSize={12}
      >
        {payload?.value}
      </text>
    );
  };

  // --- 4. Render card + chart -------------------------------------------

  // Only show empty message if there are no trades with ANY qualifying ratio for any market
  const hasAnyQualifyingTrades = filteredTrades.length > 0;

  return (
    <Card className="border shadow-none h-96 flex flex-col bg-white">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
          Potential Risk/Reward Ratio Statistics
        </CardTitle>
        <CardDescription className="text-sm text-slate-500 mb-3">
          Distribution of trades based on potential risk/reward ratio for each market
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex items-center">
        <div className="w-full h-full">
          {!hasAnyQualifyingTrades ? (
            <div
              className="flex items-center justify-center text-slate-400 h-full text-sm"
              style={{ minHeight: 180 }}
            >
              No qualifying trades with Risk/Reward ratios of 2, 2.5, and 3 for any market.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 24, left: 16, bottom: 48 }}
                barCategoryGap="30%"
              >
                <XAxis
                  dataKey="ratio"
                  axisLine={false}
                  tickLine={false}
                  tick={renderXAxisTick as any}
                />
                <YAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: slate500, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yAxisTickFormatter}
                  label={{
                    value: 'Percentage of trades',
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

                {eligibleMarkets.map((market, index) => (
                  <ReBar
                    key={market}
                    dataKey={market}
                    name={market}
                    fill={colors[index % colors.length]}
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
