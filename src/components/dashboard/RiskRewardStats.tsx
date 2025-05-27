'use client';

import { Bar } from 'react-chartjs-2';
import { Trade } from '@/types/trade';

interface RiskRewardStatsProps {
  trades: Trade[];
}

export function RiskRewardStats({ trades }: RiskRewardStatsProps) {
  // Get unique markets from trades
  const uniqueMarkets = Array.from(new Set(trades.map(trade => trade.market)));

  // Extract unique risk:reward ratios from trades and sort them
  const getUniqueRiskRewardRatios = () => {
    const uniqueRatios = Array.from(new Set(trades.map(trade => trade.risk_reward_ratio_long)))
      .filter(ratio => ratio > 0) // Filter out zero or invalid ratios
      .sort((a, b) => a - b); // Sort in ascending order
    
    // Return default values if no valid ratios found
    return uniqueRatios.length > 0 ? uniqueRatios : [2.0, 2.5, 3.0, 3.5];
  };

  const uniqueRiskRewardRatios = getUniqueRiskRewardRatios();

  // Calculate the distribution of trades by risk:reward ratio for each market
  const calculateDistribution = () => {
    return uniqueMarkets.map(market => {
      const marketTrades = trades.filter(trade => trade.market === market);
      return uniqueRiskRewardRatios.map(ratio => {
        const tradesWithRatio = marketTrades.filter(trade => trade.risk_reward_ratio_long === ratio);
        const percentage = marketTrades.length > 0 ? (tradesWithRatio.length / marketTrades.length) * 100 : 0;
        return Number(percentage.toFixed(1)); // Round to 1 decimal place
      });
    });
  };

  const riskRewardData = {
    labels: uniqueRiskRewardRatios.map(ratio => ratio.toString()),
    datasets: uniqueMarkets.map((market, index) => ({
      label: market,
      data: calculateDistribution()[index],
      backgroundColor: `rgba(${index * 50}, ${200 - index * 30}, ${150 + index * 20}, 0.8)`,
      borderRadius: 6,
      barThickness: 15, // Make bars thinner
    })),
  };

  const options = {
    indexAxis: 'y' as const, // Make the chart horizontal
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const trades = context.dataset.data[context.dataIndex];
            return `${context.dataset.label}: ${trades}% of trades`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false, // Remove grid lines
        },
        ticks: {
          display: false,
        },
        title: {
          display: false,
        },
      },
      y: {
        grid: {
          display: false,
        },
        title: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold text-stone-900 mb-1">Potential Risk/Reward Ratio Statistics</h2>
      <p className="text-sm text-stone-500 mb-4">Distribution of trades based on potential risk/reward ratio for each market</p>
      <div className="h-80">
        <Bar data={riskRewardData} options={options} />
      </div>
    </div>
  );
}