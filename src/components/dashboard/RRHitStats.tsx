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

  // Group trades by market and calculate RR hit stats
  const marketStats = trades.reduce<Record<string, RRHitStats>>((acc, trade) => {
    if (!acc[trade.market]) {
      acc[trade.market] = {
        market: trade.market,
        total: 0,
        hits: 0,
        misses: 0,
        hitRate: 0
      };
    }
    
    acc[trade.market].total++;
    if (trade.rr_hit_1_4) {
      acc[trade.market].hits++;
    } else {
      acc[trade.market].misses++;
    }
    
    // Calculate hit rate
    acc[trade.market].hitRate = (acc[trade.market].hits / acc[trade.market].total) * 100;
    
    return acc;
  }, {});

  // Convert to array and sort by total trades
  const stats = Object.values(marketStats)
    .filter(stat => stat.total > 0)
    .sort((a, b) => b.total - a.total);

  const data = {
    labels: stats.map(stat => `${stat.market} (${stat.total})`),
    datasets: [
      {
        label: 'Hits',
        data: stats.map(stat => stat.hits),
        backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
        borderRadius: 6,
        barPercentage: 0.5,
        categoryPercentage: 0.5,
      },
      {
        label: 'Misses',
        data: stats.map(stat => stat.misses),
        backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
        borderRadius: 6,
        barPercentage: 0.5,
        categoryPercentage: 0.5,
      },
      {
        label: 'Hit Rate',
        data: stats.map(stat => stat.hitRate),
        backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
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
            const dataset = context.dataset;
            if (dataset.label === 'Hits') {
              return `Hits: ${stat.hits}`;
            }
            if (dataset.label === 'Misses') {
              return `Misses: ${stat.misses}`;
            }
            if (dataset.label === 'Hit Rate') {
              return `Hit Rate: ${stat.hitRate.toFixed(2)}%`;
            }
            return `${dataset.label}: ${context.parsed.x}`;
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
        <span>1.4RR Hit Statistics by Market</span>
        <span className="ml-1 cursor-help group relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="absolute bottom-full -left-5 md:left-1/2 transform -translate-x-1/2 mb-2 w-72 sm:w-80 md:w-96 bg-white border border-stone-200 rounded-lg shadow-lg p-3 sm:p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="text-xs sm:text-sm text-stone-700">
              <p>Shows how often trades hit the 1.4 Risk/Reward ratio target for each market.</p>
              <ul className="mt-2 space-y-1">
                <li><span className="inline-block w-3 h-3 bg-green-300 rounded-sm mr-2"></span>Hits - Trades marked as hitting 1.4RR</li>
                <li><span className="inline-block w-3 h-3 bg-stone-200 rounded-sm mr-2"></span>Misses - Trades that didn't hit 1.4RR</li>
                <li><span className="inline-block w-3 h-3 bg-amber-200 rounded-sm mr-2"></span>Hit Rate - % of trades that hit 1.4RR</li>
              </ul>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-stone-200 transform rotate-45"></div>
          </div>
        </span>
      </h2>
      <p className="text-sm text-stone-500 mb-4">Distribution of 1.4RR hits by market</p>
      <div className="h-80">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
} 