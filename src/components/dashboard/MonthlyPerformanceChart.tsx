'use client';

import { Bar } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

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
  chartOptions: ChartOptions<'bar'>;
}

export function MonthlyPerformanceChart({
  monthlyStatsAllTrades,
  chartOptions,
}: MonthlyPerformanceChartProps) {
  const labels = Object.keys(monthlyStatsAllTrades);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Wins',
        data: labels.map((m) => monthlyStatsAllTrades[m].wins),
        backgroundColor: 'rgba(52, 211, 153, 0.8)', // emerald-400
        borderColor: 'rgb(52, 211, 153)',
        borderWidth: 0,
        borderRadius: 5,
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
      {
        label: 'Losses',
        data: labels.map((m) => monthlyStatsAllTrades[m].losses),
        backgroundColor: 'rgba(248, 113, 113, 0.8)', // red-400
        borderColor: 'rgb(248, 113, 113)',
        borderWidth: 0,
        borderRadius: 5,
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      },
      {
        label: 'Win Rate',
        data: labels.map((m) => monthlyStatsAllTrades[m].winRate),
        backgroundColor: 'rgba(253, 186, 116, 0.8)', // orange-300
        borderColor: 'rgb(253, 186, 116)',
        borderWidth: 0,
        borderRadius: 5,
        barPercentage: 0.6,
        categoryPercentage: 0.6,
        yAxisID: 'winRate', // Attach to separate y-axis
      },
    ],
  };

  const slate500 = 'rgb(100, 116, 139)'; // slate-500

  const options: ChartOptions<'bar'> = {
    ...chartOptions,
    plugins: {
      ...((chartOptions.plugins as object) || {}),
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'white',
        titleColor: 'rgb(30, 41, 59)',
        bodyColor: slate500,
        borderColor: 'rgb(226, 232, 240)',
        borderWidth: 1.5,
        displayColors: false,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const month = context.label!;
            const stats = monthlyStatsAllTrades[month];

            if (context.dataset.label === 'Wins') {
              return `Wins: ${context.parsed.y} (${stats.beWins} BE)`;
            }
            if (context.dataset.label === 'Losses') {
              return `Losses: ${context.parsed.y} (${stats.beLosses} BE)`;
            }
            if (context.dataset.label === 'Win Rate') {
              return `Win Rate: ${context.parsed.y?.toFixed(2)}% (${stats.winRateWithBE.toFixed(2)}% w/ BE)`;
            }

            return `${context.dataset.label}: ${context.parsed.y}`;
          },
          title: (items: any) => {
            return items[0]?.label || '';
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
          callback: function (value: any, index: number) {
            const label = labels[index];
            const stats = monthlyStatsAllTrades[label];
            const totalTrades = stats.wins + stats.losses;
            return `${label} (${totalTrades})`;
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        stacked: false,
        grid: { display: false },
        title: {
          display: true,
          text: 'Wins / Losses',
          color: slate500,
        },
        ticks: {
          color: slate500,
          // Show plain numbers for win/loss axis
        },
      },
      winRate: {
        type: 'linear' as const,
        display: false, // hide this axis (no left percentage scale)
        position: 'right' as const,
        min: 0,
        max: 100,
        grid: { display: false },
        title: {
          display: false,
        },
        ticks: {
          color: slate500,
          // If you want to show the right side percentage, set display:true above and uncomment below
          // callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  return (
    <Card className="border shadow-none h-96 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-slate-800 mb-1">Monthly Performance</CardTitle>
        <CardDescription className="text-sm text-slate-500 mb-3">
          Monthly performance of trades
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-center">
        <div className="w-full h-full">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
