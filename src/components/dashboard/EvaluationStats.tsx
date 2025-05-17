import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

interface EvaluationStats {
  grade: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface EvaluationStatsProps {
  stats: EvaluationStats[];
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const GRADE_ORDER = ['A+', 'A', 'B', 'C'];

export function EvaluationStats({ stats }: EvaluationStatsProps) {
  // Filter out 'Not Evaluated' and sort by grade order
  const filtered = stats
    .filter(stat => GRADE_ORDER.includes(stat.grade))
    .sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));

  const labels = filtered.map(stat => `${stat.grade} (${stat.total})`);

  const data = {
    labels,
    datasets: [
      {
        label: 'Wins',
        data: filtered.map(stat => stat.wins),
        backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
        borderRadius: 6,
        barPercentage: 0.5,
        categoryPercentage: 0.5,
      },
      {
        label: 'Losses',
        data: filtered.map(stat => stat.losses),
        backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
        borderRadius: 6,
        barPercentage: 0.5,
        categoryPercentage: 0.5,
      },
    ],
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
            return `${context.dataset.label}: ${context.parsed.x}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        ticks: { display: false },
      },
      y: {
        stacked: false,
        grid: { display: false },
        ticks: {
          color: 'rgb(41, 37, 36)', // stone-800
        },
      },
    },
  };

  return (
    <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold text-stone-900 mb-1 flex items-center">
        <span>Evaluation Grade Statistics</span>
        <span className="ml-1 cursor-help group relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="absolute bottom-full -left-5 md:left-1/2 transform -translate-x-1/2 mb-2 w-72 sm:w-80 md:w-96 bg-white border border-stone-200 rounded-lg shadow-lg p-3 sm:p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="text-xs sm:text-sm text-stone-700 space-y-1 sm:space-y-2">
              <div className="font-semibold text-stone-900 mb-1 sm:mb-2">Evaluation Grade Guide</div>
              <div className="bg-blue-50 border-blue-200 border rounded p-1.5 sm:p-2">
                <span className="font-medium">A+</span> — Perfect execution. Followed all rules, optimal risk management.
              </div>
              <div className="bg-green-50 border-green-200 border rounded p-1.5 sm:p-2">
                <span className="font-medium">A</span> — Excellent trade. Minor deviations from plan but overall strong execution.
              </div>
              <div className="bg-yellow-50 border-yellow-200 border rounded p-1.5 sm:p-2">
                <span className="font-medium">B</span> — Good trade. Some rule violations but managed well. Room for improvement.
              </div>
              <div className="bg-orange-50 border-orange-200 border rounded p-1.5 sm:p-2">
                <span className="font-medium">C</span> — Poor execution. Rules violations.
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-stone-200 transform rotate-45"></div>
          </div>
        </span>
      </h2>
      <p className="text-sm text-stone-500 mb-4">Distribution of evaluation trades by grade.</p>
      <div className="h-80">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}