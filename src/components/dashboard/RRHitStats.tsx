import { Bar } from 'react-chartjs-2';
import { Trade } from '@/types/trade';

interface RRHitStats {
  market: string;
  total: number;
  hits: number;
  misses: number;
  hitRate: number;
}

interface RRHitStatsProps {
  trades: Trade[];
}

export function RRHitStats({ trades }: RRHitStatsProps) {

  // Group trades by market and count only losing trades that hit RR1.4
  const marketStats = trades.reduce<Record<string, number>>((acc, trade) => {
    if (trade.trade_outcome === 'Lose' && trade.rr_hit_1_4) {
      acc[trade.market] = (acc[trade.market] || 0) + 1;
    }
    return acc;
  }, {});

  // Convert to array and sort by count
  const stats = Object.entries(marketStats)
    .map(([market, count]) => ({ market, count }))
    .sort((a, b) => b.count - a.count);

  const data = {
    labels: stats.map(stat => `${stat.market} (${stat.count})`),
    datasets: [
      {
        label: 'Lose Trades Hit 1.4RR',
        data: stats.map(stat => stat.count),
        backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
        borderRadius: 6,
        barPercentage: 0.5,
        categoryPercentage: 0.5,
      }
    ]
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const stat = stats[context.dataIndex];
            return `Lose Trades Hit 1.4RR: ${stat.count}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        ticks: { display: false }
      },
      y: {
        stacked: false,
        grid: { display: false },
        ticks: {
          color: 'rgb(41, 37, 36)' // stone-800
        }
      }
    }
  };

  return (
    <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold text-stone-900 mb-1 flex items-center">
        <span>Lose Trades that Hit 1.4RR by Market</span>
      </h2>
      <p className="text-sm text-stone-500 mb-4">Only losing trades that hit the 1.4 Risk/Reward ratio target, grouped by market.</p>
      <div className="h-80">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}