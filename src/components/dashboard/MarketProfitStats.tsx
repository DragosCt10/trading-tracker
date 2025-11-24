'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Bar as ReBar,
  Cell,
  LabelList,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Trade } from '@/types/trade';

export interface MarketStat {
  market: string;
  profit: number;
  pnlPercentage: number;
  wins: number;
  losses: number;
  nonBeWins: number;
  nonBeLosses: number;
  beWins: number;
  beLosses: number;
  profitTaken: boolean;
}

interface MarketProfitStatisticsCardProps {
  marketStats: MarketStat[];
  chartOptions: any; // kept for API compatibility, not used
  getCurrencySymbol: () => string;
  trades: Trade[];
}

// Colors as used in MonthlyPerformanceChart
const COLOR_PROFIT_POSITIVE = 'rgba(52,211,153,0.8)'; // emerald-400
const COLOR_PROFIT_NEGATIVE = 'rgba(248,113,113,0.8)'; // red-400

const MarketProfitStatisticsCard: React.FC<MarketProfitStatisticsCardProps> = ({
  marketStats,
  getCurrencySymbol,
  trades,
}) => {
  const chartData = marketStats.map((stat) => ({
    ...stat,
    tradeCount: trades.filter((t) => t.market === stat.market).length,
    profitPercent: stat.pnlPercentage ? Number(stat.pnlPercentage.toFixed(2)) : 0,
  }));

  // Handle no trades: Show empty message like TradesStatsBarCard
  if (!marketStats || marketStats.length === 0) {
    return (
      <Card className="border shadow-none bg-white h-[360px] flex flex-col">
        <CardHeader className="pb-1 flex-shrink-0">
          <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
            Market Profit Statistics
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 mb-3 leading-tight">
            Profit and P&amp;L percentage by market
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

  // Use same coloring as MonthlyPerformanceChart (emerald/red w/opacity)
  const getBarColor = (profit: number) =>
    profit >= 0 ? COLOR_PROFIT_POSITIVE : COLOR_PROFIT_NEGATIVE;

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (active && payload && payload.length > 0) {
      const stat: MarketStat & { tradeCount: number } = payload[0].payload;
      const currencySymbol = getCurrencySymbol();
      return (
        <div className="rounded-lg shadow bg-white p-3 border border-slate-200 text-slate-800 text-[13px] leading-snug min-w-[140px]">
          <div className="font-semibold mb-1 text-[15px]">{stat.market}</div>
          <div className="text-slate-500 mb-1">
            Profit:{' '}
            <span className="text-slate-800 font-semibold">
              {currencySymbol}
              {stat.profit.toFixed(2)}
            </span>{' '}
            ({stat.tradeCount} trade{stat.tradeCount === 1 ? '' : 's'})
          </div>
          <div className="text-slate-500">
            P&amp;L: {stat.pnlPercentage.toFixed(2)}% | {stat.wins}W / {stat.losses}L
          </div>
        </div>
      );
    }
    return null;
  };

  // X-Axis: custom tick (market + tradeCount + pnl%)
  const renderXAxisTick = (props: any) => {
    const { x, y, index } = props;
    const stat = chartData[index];
    if (!stat) return null;

    return (
      <g>
        <text
          x={x}
          y={y + 10}
          textAnchor="middle"
          fill="#64748b" // slate-500
          fontSize={12}
          fontWeight={500} // font-medium
        >
          {stat.market} - {stat.tradeCount}
        </text>
        <text
          x={x}
          y={y + 25}
          textAnchor="middle"
          fill="#64748b" // slate-500
          fontSize={12}
          fontWeight={500} // font-medium
        >
          ({stat.profitPercent}%)
        </text>
      </g>
    );
  };

  const yAxisTickFormatter = (value: number) =>
    `${getCurrencySymbol()}${Number(value ?? 0).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })}`;

  const renderBarLabel = (props: any) => {
    if (!props || props.value == null) return null;
    const value = Number(props.value);
    const x = Number(props.x || 0);
    const y = Number(props.y || 0);
    const width = Number(props.width);
    const height = Number(props.height);
    const yPos = value >= 0 ? y - 5 : y + height - 5;

    return (
      <text
        x={x + width / 2}
        y={yPos}
        fill="#1e293b"
        textAnchor="middle"
        fontSize={12}
        fontWeight={500}
      >
        {getCurrencySymbol()}
        {value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </text>
    );
  };

  return (
    <Card className="border shadow-none h-[360px] flex flex-col bg-white">
      <CardHeader className="pb-1 flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
          Market Profit Statistics
        </CardTitle>
        <CardDescription className="text-sm text-slate-500 mb-3 leading-tight">
          Profit and P&amp;L percentage by market
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-end mt-1">
        <div className="w-full h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 30, right: 18, left: 5, bottom: 10 }}
              barCategoryGap="25%"
            >
              <XAxis
                dataKey="market"
                tick={(props: any) => renderXAxisTick(props) ?? <></>} 
                axisLine={false}
                tickLine={false}
                interval={0}
                height={38}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }} // slate-500, 11px
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisTickFormatter}
                width={60}
              />
              <ReTooltip
                content={<CustomTooltip />}
                cursor={false}
                wrapperStyle={{ outline: 'none' }}
              />
              <ReBar dataKey="profit" radius={[7, 7, 7, 7]} barSize={32}>
                {chartData.map((stat) => (
                  <Cell key={stat.market} fill={getBarColor(stat.profit)} />
                ))}
                <LabelList dataKey="profit" content={renderBarLabel} />
              </ReBar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketProfitStatisticsCard;
