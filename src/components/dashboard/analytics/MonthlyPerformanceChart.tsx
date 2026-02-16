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

interface MonthlyStatsAllTrades {
  [month: string]: {
    wins: number;
    losses: number;
    beWins: number;
    beLosses: number;
    winRate: number;
    winRateWithBE: number;
  };
}

interface MonthlyPerformanceChartProps {
  monthlyStatsAllTrades: MonthlyStatsAllTrades;
  // kept for API compatibility, not used by Recharts
  chartOptions?: any;
}

export function MonthlyPerformanceChart({
  monthlyStatsAllTrades,
}: MonthlyPerformanceChartProps) {
  const slate500 = '#64748b'; // tailwind slate-500

  const labels = Object.keys(monthlyStatsAllTrades);

  const chartData = labels.map((month) => {
    const stats = monthlyStatsAllTrades[month];
    const totalTrades = stats.wins + stats.losses;
    return {
      month,
      totalTrades,
      wins: stats.wins,
      losses: stats.losses,
      beWins: stats.beWins,
      beLosses: stats.beLosses,
      winRate: stats.winRate,
      winRateWithBE: stats.winRateWithBE,
    };
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Card className="border shadow-none bg-white h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
            Monthly Performance
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Monthly performance of trades
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex justify-center items-center">
          <div className="w-full h-full min-h-[180px]" aria-hidden>—</div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className="border shadow-none bg-white h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
            Monthly Performance
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Monthly performance of trades
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex justify-center items-center">
          <div className="flex flex-col justify-center items-center w-full h-full">
            <div className="text-base font-medium text-slate-500 text-center mb-1">
              No trades found
            </div>
            <div className="text-sm text-slate-400 text-center max-w-xs">
              There are no trades to display for this category yet. Start trading to see your statistics here!
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate the max of wins or losses (show on Y axis)
  const maxWinsLosses = Math.max(
    ...chartData.map((d) => Math.max(d.wins, d.losses)),
    1 // fallback in case of empty data
  );

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const d = payload[0].payload as (typeof chartData)[number];

    return (
      <div className="rounded-lg shadow bg-white p-3 border border-slate-200 text-[13px] leading-snug min-w-[160px]">
        <div className="font-semibold mb-1 text-slate-800 text-[15px]">
          {d.month} ({d.totalTrades} trades)
        </div>
        <div className="text-slate-500">
          Wins:{' '}
          <span className="font-semibold text-emerald-600">{d.wins}</span>{' '}
          ({d.beWins} BE)
        </div>
        <div className="text-slate-500">
          Losses:{' '}
          <span className="font-semibold text-red-500">{d.losses}</span>{' '}
          ({d.beLosses} BE)
        </div>
        <div className="text-slate-500 mt-1">
          Win Rate:{' '}
          <span className="font-semibold text-amber-600">
            {d.winRate.toFixed(2)}%
          </span>{' '}
          ({d.winRateWithBE.toFixed(2)}% w/ BE)
        </div>
      </div>
    );
  };

  const renderXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const index = payload?.index;
    const d = chartData[index];
    if (!d) return null;

    return (
      <text
        x={x}
        y={y}
        dy={16}
        textAnchor="middle"
        fill={slate500}
        fontSize={12}
      >
        {d.month} ({d.totalTrades})
      </text>
    );
  };

  // Explicit Y axis tick formatter for wins/losses (integer counts, no %)
  const yAxisTickFormatter = (value: number) =>
    Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

  return (
    <Card className="border shadow-none h-96 flex flex-col bg-white">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
          Monthly Performance
        </CardTitle>
        <CardDescription className="text-sm text-slate-500 mb-3">
          Monthly performance of trades
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex items-center">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 10, right: 24, left: 16, bottom: 48 }}
              barCategoryGap="30%"
            >
              {/* X axis: months and trade counts */}
              <XAxis
                dataKey="month"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={renderXAxisTick as (props: any) => React.ReactElement<SVGElement>}
              />
              {/* Y axis: numeric (wins/losses only, label is win/loss not %/winrate) */}
              <YAxis
                type="number"
                tick={{ fill: slate500, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisTickFormatter}
                // Explicitly set Y axis domain to wins/losses max instead of win rate 0–100
                domain={[0, Math.ceil(maxWinsLosses * 1.12)]}
                label={{
                  value: 'Wins / Losses',
                  angle: -90,
                  position: 'middle',
                  fill: slate500,
                  fontSize: 13,
                  fontWeight: 500,
                  dy: -10,
                }}
              />

              <ReTooltip
                content={<CustomTooltip />}
                cursor={false}
                wrapperStyle={{ outline: 'none' }}
              />

              {/* Wins */}
              <ReBar
                dataKey="wins"
                name="Wins"
                fill="rgba(52,211,153,0.8)" // emerald-400
                radius={[4, 4, 0, 0]}
                barSize={18}
              />

              {/* Losses */}
              <ReBar
                dataKey="losses"
                name="Losses"
                fill="rgba(248,113,113,0.8)" // red-400
                radius={[4, 4, 0, 0]}
                barSize={18}
              />

              {/* Win Rate as bar (0–100) */}
              <ReBar
                dataKey="winRate"
                name="Win Rate"
                fill="rgba(253,186,116,0.8)" // orange-300
                radius={[4, 4, 0, 0]}
                barSize={18}
                yAxisId={1} // Place Win Rate on a secondary axis (not visible)
              />
              {/* Hide secondary Y axis so winRate doesn't affect autoscaling */}
              <YAxis
                yAxisId={1}
                hide={true}
                domain={[0, 100]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
