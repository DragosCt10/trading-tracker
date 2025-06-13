import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions, ChartData, TooltipItem } from 'chart.js';
import { Trade } from '@/types/trade';

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

// Props for the component
interface MarketProfitStatisticsCardProps {
  marketStats: MarketStat[];
  chartOptions: ChartOptions<'bar'>;
  getCurrencySymbol: () => string;
  trades: Trade[];
}

/**
 * MarketProfitStatisticsCard
 * 
 * Displays profit and PnL percentage by market in a horizontal bar chart.
 * Profit includes calculated_profit for non-BE trades and BE trades when profit_taken is true.
 */
const MarketProfitStatisticsCard: React.FC<MarketProfitStatisticsCardProps> = ({
  marketStats,
  chartOptions,
  getCurrencySymbol,
  trades,
}) => {
  // Prepare chart data
  const data: ChartData<'bar', number[], string> = {
    labels: marketStats.map(
      (stat) => `${stat.market} (${stat.pnlPercentage.toFixed(2)}%)`
    ),
    datasets: [
      {
        label: 'Profit',
        data: marketStats.map((stat) => {
          // Base profit from non-BE trades
          let totalProfit = stat.profit;
          
          // Add BE trades profit if profit_taken is true
          if (stat.profitTaken) {
            const beProfit = (stat.beWins + stat.beLosses) * stat.profit;
            totalProfit += beProfit;
          }
          
          return totalProfit;
        }),
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
            // Count all trades for this market
            const tradeCount = trades.filter(t => t.market === marketName).length;
            const market = marketStats.find((s) => s.market === marketName);
            const profit = market?.profit || 0;
            const currencySymbol = getCurrencySymbol();
            return [
              ` ${tradeCount} trades`,
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