'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions, ChartData, TooltipItem } from 'chart.js';
import { Trade } from '@/types/trade';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

// Define the shape of each market statistic
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
  chartOptions: ChartOptions<'bar'>;
  getCurrencySymbol: () => string;
  trades: Trade[];
}

/**
 * MarketProfitStatisticsCard
 *
 * Displays profit and PnL percentage by market in a vertical bar chart (like MonthlyPerformanceChart).
 * Profit includes calculated_profit for non-BE trades and BE trades when profit_taken is true.
 */
const MarketProfitStatisticsCard: React.FC<MarketProfitStatisticsCardProps> = ({
  marketStats,
  chartOptions,
  getCurrencySymbol,
  trades,
}) => {
  // Collect labels for markets
  const labels = marketStats.map(
    (stat) => `${stat.market} (${stat.pnlPercentage.toFixed(2)}%)`
  );

  // Prepares color based on profit
  const colors = marketStats.map((stat) =>
    stat.profit >= 0
      ? 'rgba(52, 211, 153, 0.85)' // emerald-400, improved opacity for clarity
      : 'rgba(239, 68, 68, 0.85)' // red-500, a bit darker for contrast
  );
  const borderColors = marketStats.map((stat) =>
    stat.profit >= 0
      ? 'rgba(52, 211, 153, 1)'
      : 'rgba(239, 68, 68, 1)'
  );

  // Chart datasets (profit)
  const chartData: ChartData<'bar', number[], string> = {
    labels,
    datasets: [
      {
        label: 'Profit',
        data: marketStats.map((stat) => stat.profit),
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 0,
        borderRadius: 9,
        barPercentage: 0.45,
        categoryPercentage: 0.45,
        maxBarThickness: 56,
      },
    ],
  };

  // Styling
  const slate500 = 'rgb(100, 116, 139)';
  const slate800 = 'rgb(41, 37, 36)';

  // Chart options - no grid, normal font for left labels, dataset label in slate-800 font normal
  const options: ChartOptions<'bar'> = {
    ...chartOptions,
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x',
    layout: { padding: { left: 24, right: 24, top: 8, bottom: 8 } },
    plugins: {
      ...((chartOptions.plugins as object) || {}),
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#fff',
        titleColor: 'rgb(30, 41, 59)',
        bodyColor: slate500,
        borderColor: 'rgb(226, 232, 240)',
        borderWidth: 1.5,
        displayColors: false,
        padding: 14,
        cornerRadius: 7,
        boxPadding: 6,
        titleFont: { size: 15, weight: 'bold' },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            const label = context.label as string;
            const marketName = label.split(' (')[0];
            const tradeCount = trades.filter((t) => t.market === marketName).length;
            const market = marketStats.find((s) => s.market === marketName);
            const profit = market?.profit ?? 0;
            const pnl = market?.pnlPercentage ?? 0;
            const wins = market?.wins ?? 0;
            const losses = market?.losses ?? 0;
            const currencySymbol = getCurrencySymbol();

            let labelBlock = `Profit: ${currencySymbol}${profit.toFixed(2)} (${tradeCount} trade${tradeCount === 1 ? '' : 's'})`;
            labelBlock += `\nP&L: ${pnl.toFixed(2)}% | ${wins}W / ${losses}L`;

            return labelBlock;
          },
          title: (items: TooltipItem<'bar'>[]) => {
            if (!items.length) return '';
            const label = items[0].label as string;
            const marketName = label.split(' (')[0];
            return `${marketName}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        ticks: {
          color: slate500,
          font: { size: 13, weight: 'normal' },
          maxRotation: 0,
          minRotation: 0,
          padding: 7,
          callback: function (_, idx: number) {
            // Normal font, label on the left.
            const stat = marketStats[idx];
            const tradeCount = trades.filter(t => t.market === stat.market).length;
            // Show as "Market [#]\n(PnL%)" but font will be normal, NOT bold.
            return `${stat.market} - ${tradeCount} \n(${stat.pnlPercentage.toFixed(2)}%)`;
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        stacked: false,
        grid: { display: false},
        title: {
          display: true,
          text: 'Profit',
          color: slate500,
          font: { size: 14, weight: 'normal' },
        },
        ticks: {
          color: slate500,
          font: { size: 11, weight: 'normal' },
          padding: 7,
          callback: (val: number | string) =>
            typeof val === 'number'
              ? `${getCurrencySymbol()}${val.toFixed(0)}`
              : val,
        },
      },
    },
    animation: { duration: 700 }
  };

  return (
    <Card className="border shadow-none h-[360px] flex flex-col bg-white">
      <CardHeader className="pb-1 flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
          Market Profit Statistics
        </CardTitle>
        <CardDescription className="text-sm text-slate-500 mb-2 leading-tight">
          Profit and P&amp;L percentage by market
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-end mt-1">
        <div className="w-full h-[250px]">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketProfitStatisticsCard;
