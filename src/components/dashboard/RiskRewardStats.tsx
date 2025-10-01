'use client';

import { Bar } from 'react-chartjs-2';
import { Trade } from '@/types/trade';

interface RiskRewardStatsProps {
  trades: Trade[];
}

function parseRatio(val: number | string | null): number | null {
  if (typeof val === 'string') {
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }
  if (typeof val === 'number') return val;
  return null;
}

export function RiskRewardStats({ trades }: RiskRewardStatsProps) {
  const uniqueMarkets = Array.from(new Set(trades.map(trade => trade.market)));

  const getUniqueRiskRewardRatios = () => {
    const ratios = trades.map(trade => parseRatio(trade.risk_reward_ratio_long));
    const uniqueRatios = Array.from(new Set(ratios))
      .filter((r): r is number => r !== null && r > 0)
      .sort((a, b) => a - b);

    return uniqueRatios.length > 0 ? uniqueRatios : [2.0, 2.5, 3.0, 3.5];
  };

  const uniqueRiskRewardRatios = getUniqueRiskRewardRatios();

  const calculateDistribution = () =>
    uniqueMarkets.map(market => {
      const marketTrades = trades.filter(trade => trade.market === market);
      return uniqueRiskRewardRatios.map(ratio => {
        const tradesWithRatio = marketTrades.filter(
          trade => parseRatio(trade.risk_reward_ratio_long) === ratio
        );
        const percentage =
          marketTrades.length > 0
            ? (tradesWithRatio.length / marketTrades.length) * 100
            : 0;
        return Number(percentage.toFixed(1));
      });
    });

  const riskRewardData = {
    labels: uniqueRiskRewardRatios.map(ratio => ratio.toString()),
    datasets: uniqueMarkets.map((market, index) => ({
      label: market,
      data: calculateDistribution()[index],
      backgroundColor: `rgba(${index * 50}, ${200 - index * 30}, ${
        150 + index * 20
      }, 0.8)`,
      borderRadius: 6,
      barThickness: 15,
    })),
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const trades = context.dataset.data[context.dataIndex];
            return `${context.dataset.label}: ${trades}% of trades`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { display: false }, title: { display: false } },
      y: { grid: { display: false }, title: { display: false } },
    },
  };

  return (
    <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold text-stone-900 mb-1">
        Potential Risk/Reward Ratio Statistics
      </h2>
      <p className="text-sm text-stone-500 mb-4">
        Distribution of trades based on potential risk/reward ratio for each
        market
      </p>
      <div className="h-80">
        <Bar data={riskRewardData} options={options} />
      </div>
    </div>
  );
}
