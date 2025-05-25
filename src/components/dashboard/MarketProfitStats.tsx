import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions, ChartData, TooltipItem } from 'chart.js';

// Define the shape of each market statistic
export interface MarketStat {
  market: string;
  profit: number;
  pnlPercentage: number;
  wins: number;
  losses: number;
}

// Props for the component
interface MarketProfitStatisticsCardProps {
  marketStats: MarketStat[];
  chartOptions: ChartOptions<'bar'>;
  getCurrencySymbol: () => string;
}

/**
 * MarketProfitStatisticsCard
 * 
 * Displays profit and PnL percentage by market in a horizontal bar chart.
 */
const MarketProfitStatisticsCard: React.FC<MarketProfitStatisticsCardProps> = ({
  marketStats,
  chartOptions,
  getCurrencySymbol,
}) => {
  // Prepare chart data
  const data: ChartData<'bar', number[], string> = {
    labels: marketStats.map(
      (stat) => `${stat.market} (${stat.pnlPercentage.toFixed(2)}%)`
    ),
    datasets: [
      {
        label: 'Profit',
        data: marketStats.map((stat) => stat.profit),
        backgroundColor: marketStats.map((stat) =>
          stat.profit >= 0 ? 'rgba(74, 222, 128, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: marketStats.map((stat) =>
          stat.profit >= 0 ? 'rgb(74, 222, 128)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 0,
        borderRadius: 4,
        barPercentage: 0.5,
        categoryPercentage: 0.5,
      },
    ],
  };

  // Extend base chart options
  const options: ChartOptions<'bar'> = {
    ...chartOptions,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            const label = context.label as string;
            const marketName = label.split(' (')[0];
            const market = marketStats.find((s) => s.market === marketName);
            const totalTrades = (market?.wins || 0) + (market?.losses || 0);
            const profit = market?.profit || 0;
            const currencySymbol = getCurrencySymbol();
            return [
              ` ${totalTrades} trades`,
              ` Profit: ${currencySymbol}${profit.toFixed(2)}`
            ];
          },
          title: () => '',
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgb(41, 37, 36)', // stone-800
          font: {
            size: 13,
            weight: 'bold',
          },
        },
      },
    },
  };

  return (
    <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold text-stone-900 mb-1">
        Market Profit Statistics
      </h2>
      <p className="text-sm text-stone-500 mb-4">
        Profit and PnL percentage by market
      </p>
      <div className="h-96 flex items-center">
        <Bar options={options} data={data} />
      </div>
    </div>
  );
};

export default MarketProfitStatisticsCard;