'use client';

import { useState, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays, startOfYear, endOfYear } from 'date-fns';
import { Trade } from '@/types/trade';
import { useTradingMode } from '@/context/TradingModeContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useRouter } from 'next/navigation';
import { RiskRewardStats } from '@/components/dashboard/RiskRewardStats';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUserDetails } from '@/hooks/useUserDetails';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import DashboardLayout from '@/components/shared/layout/DashboardLayout';
import { BarChart, Bar as ReBar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { EvaluationStats } from '@/components/dashboard/EvaluationStats';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: false,
      min: -0.05, // -5%
      max: 0.1, // 10%
      ticks: {
        stepSize: 0.01, // 1% steps
        callback: function(tickValue: number | string) {
          const value = Number(tickValue) * 100;
          return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
        }
      },
      grid: {
        display: false
      },
      border: {
        display: false
      }
    },
  },
};

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  HKD: 'HK$',
  NZD: 'NZ$'
} as const;

const TIME_INTERVALS = [
  { label: '< 10 a.m', start: '00:00', end: '09:59' },
  { label: '10 a.m - 12 p.m', start: '10:00', end: '11:59' },
  { label: '12 p.m - 16 p.m', start: '12:00', end: '16:59' },
  { label: '17 p.m - 21 p.m', start: '17:00', end: '20:59' },
] as const;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Dashboard() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { mode, activeAccount, isLoading: contextLoading } = useTradingMode();
  const { data: userData, isLoading: userLoading } = useUserDetails();
  
  // Add selected year state for monthly stats only
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Initialize today and default dates
  const today = new Date();
  const initialStartDate = format(subDays(today, 29), 'yyyy-MM-dd');
  const initialEndDate = format(today, 'yyyy-MM-dd');

  // Initialize states with the correct default values
  const [dateRange, setDateRange] = useState({
    startDate: initialStartDate,
    endDate: initialEndDate,
  });

  // Calendar specific date range
  const [calendarDateRange, setCalendarDateRange] = useState({
    startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
  });

  const [activeFilter, setActiveFilter] = useState<'year' | '15days' | '30days' | 'month'>('30days');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    }
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  // Filter button handlers
  const handleFilter = (type: 'year' | '15days' | '30days' | 'month') => {
    const today = new Date();
    setActiveFilter(type);
    if (type === 'year') {
      setDateRange({
        startDate: format(startOfYear(today), 'yyyy-MM-dd'),
        endDate: format(endOfYear(today), 'yyyy-MM-dd'),
      });
    } else if (type === '15days') {
      setDateRange({
        startDate: format(subDays(today, 14), 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      });
    } else if (type === '30days') {
      setDateRange({
        startDate: format(subDays(today, 29), 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      });
    } else if (type === 'month') {
      setDateRange({
        startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
      });
    }
  };

  const { 
    calendarMonthTrades, calendarTradesLoading, allTradesLoading, stats, monthlyStats, monthlyStatsAllTrades, localHLStats, setupStats, liquidityStats, directionStats, reentryStats, breakEvenStats, mssStats, newsStats, dayStats, marketStats, slSizeStats, allTrades, filteredTrades, filteredTradesLoading
  } = useDashboardData({
    session: userData?.session,
    dateRange,
    mode,
    activeAccount: activeAccount as import('@/types/account-settings').AccountSettings | null,
    contextLoading,
    isSessionLoading: userLoading,
    currentDate,
    calendarDateRange,
    selectedYear, // Add selected year to the hook    
  });

  // Check session status
  useEffect(() => {
    if (!userLoading && !userData?.session) {
      router.replace('/login');
    }
  }, [userData, userLoading, router]);

  useEffect(() => {
    // Set initial loading to false after a short delay to ensure context is loaded
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [activeAccount]);

  function getDaysInMonth() {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
  }

  function getDayStats(trades: Trade[]) {
    const totalProfit = trades.reduce((sum, trade) => {
      // Get risk percentage from trade or default to 0.5%
      const riskPerTrade = trade.risk_per_trade || 0.5;
      
      // Calculate actual risk amount based on active account balance
      const riskAmount = (activeAccount?.account_balance || 0) * (riskPerTrade / 100);
      
      // Get risk:reward ratio from trade or default to 2
      const riskRewardRatio = trade.risk_reward_ratio || 2;
      
      // Calculate profit based on outcome
      if (trade.trade_outcome === 'Win') {
        return sum + (riskAmount * riskRewardRatio);
      } else if (trade.trade_outcome === 'Lose') {
        return sum - riskAmount;
      }
      return sum;
    }, 0);

    return {
      totalTrades: trades.length,
      totalProfit,
    };
  }

  const getCurrencySymbol = () => {
    if (!activeAccount?.currency) return '$';
    return CURRENCY_SYMBOLS[activeAccount.currency as keyof typeof CURRENCY_SYMBOLS] || activeAccount.currency;
  };

  const handleMonthNavigation = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      // Update calendar date range when navigating months
      setCalendarDateRange({
        startDate: format(startOfMonth(newDate), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(newDate), 'yyyy-MM-dd'),
      });
      return newDate;
    });
  };

  // Add this after the other hooks and before the return statement
  const totalYearProfit = Object.values(monthlyStatsAllTrades).reduce((sum, stats) => sum + (stats.profit || 0), 0);
  const updatedBalance = (activeAccount?.account_balance || 0) + totalYearProfit;

  function isCustomDateRange() {
    const today = new Date();
    const yearStart = format(startOfYear(today), 'yyyy-MM-dd');
    const yearEnd = format(endOfYear(today), 'yyyy-MM-dd');
    const last15Start = format(subDays(today, 14), 'yyyy-MM-dd');
    const last30Start = format(subDays(today, 29), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

    if (
      (dateRange.startDate === yearStart && dateRange.endDate === yearEnd) ||
      (dateRange.startDate === last15Start && dateRange.endDate === format(today, 'yyyy-MM-dd')) ||
      (dateRange.startDate === last30Start && dateRange.endDate === format(today, 'yyyy-MM-dd')) ||
      (dateRange.startDate === monthStart && dateRange.endDate === monthEnd)
    ) {
      return false;
    }
    return true;
  }

  // Show loading state while checking session or context
  if (userLoading || contextLoading || isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div role="status">
          <svg aria-hidden="true" className="w-8 h-8 text-stone-200 animate-spin fill-stone-800" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
          </svg>
        </div>
        <p className="ml-4 text-stone-600">Loading...</p>
      </div>
    );
  }

  // Redirect if no session
  if (!userData?.session) {
    return null;
  }

  // Show no active account message if there's no active account for the current mode
  if (!activeAccount && !contextLoading) {
    return (
      <DashboardLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-white border border-stone-200 rounded-lg shadow-sm p-6 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-12 w-12 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">No Active Account</h2>
          <p className="text-stone-600 mb-6">
            Please set up and activate an account for {mode} mode to view your trading dashboard.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
          >
            Go to Settings
            </a>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show no trades message if there are no trades
  if (
    activeAccount &&
    !isInitialLoading &&
    !filteredTradesLoading &&
    !calendarTradesLoading &&
    !allTradesLoading &&
    allTrades.length === 0 &&
    filteredTrades.length === 0 &&
    !showDatePicker
  ) {
    return (
      <DashboardLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-white border border-stone-200 rounded-lg shadow-sm p-6 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-12 w-12 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">No Trades Yet</h2>
          <p className="text-stone-600 mb-6">
            Start tracking your trades by adding your first trade. This will help you analyze your trading performance.
          </p>
          <a
            href="/trades/new"
            className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
          >
            Add Your First Trade
          </a>
        </div>
      </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout> 
      {/* Filter Buttons */}
      {/* Add warning if no active account */}
      {!activeAccount && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Please set up an active account in <a href="/settings" className="text-yellow-800 underline hover:text-yellow-900">Account Settings</a> to see accurate profit calculations.
        </div>
      )}

      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Overview Stats</h2>
          <p className="text-stone-500">View your comprehensive trading performance metrics and analytics.</p>
        </div>
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="aria-disabled:cursor-not-allowed w-20 appearance-none outline-none cursor-pointer focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-2.5 text-stone-600/70 peer-focus:text-stone-800 peer-focus:text-stone-800 dark:peer-hover:text-white dark:peer-focus:text-white transition-all duration-300 ease-in overflow-hidden w-5 h-5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 mt-0.5 text-stone-800">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </span>
        </div>
      </div>

      {/* Account Overview Card */}
      <div className="mb-8 bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{activeAccount?.name || 'No Active Account'}</h2>
            <p className="text-sm text-stone-500">Current Balance</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500">Balance incl. year profit</div>
            <div className="text-2xl font-bold text-stone-900">
              {getCurrencySymbol()}{updatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-sm font-semibold ${totalYearProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalYearProfit >= 0 ? '+' : ''}{((totalYearProfit / (activeAccount?.account_balance || 1)) * 100).toFixed(2)}% YTD
            </div>
          </div>
        </div>
        
        {/* Monthly Profit Chart */}
        <div className="h-64 mb-2 relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={MONTHS.map(month => ({
                month,
                profit: monthlyStatsAllTrades[month]?.profit ?? 0,
                profitPercent: monthlyStatsAllTrades[month] ? Number(((monthlyStatsAllTrades[month].profit / (activeAccount?.account_balance || 1)) * 100).toFixed(2)) : 0
              }))}
              margin={{ top: 30, right: 10, left: 0, bottom: 20 }}
            >
              <XAxis dataKey="month" tick={{ fill: '#444', fontSize: 14 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#444', fontSize: 14 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${getCurrencySymbol()}${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
              <ReTooltip formatter={(value: number, name: string) => `${getCurrencySymbol()}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} cursor={false} />
              <ReBar dataKey="profit" radius={[4, 4, 4, 4]} barSize={35}>
                {MONTHS.map((month, idx) => (
                  <Cell
                    key={month}
                    fill={(monthlyStatsAllTrades[month]?.profit ?? 0) >= 0 ? '#4ade80' : '#ef4444'}
                  />
                ))}
                <LabelList
                  dataKey="profitPercent"
                  position="top"
                  className="text-xs"
                  formatter={(value: number) => `${value}%`}
                  fill="#000"
                  offset={10}
                />
              </ReBar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

       {/* Month Stats Cards */}
      <div className="flex gap-4 pb-8">
        {monthlyStats.bestMonth && (
          <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col items-center flex-1">
            <h3 className="text-sm font-semibold text-stone-500 mb-1">Best Month</h3>
            <p className="text-2xl font-bold text-stone-900">
              {monthlyStats.bestMonth.month} {allTrades.length > 0 ? selectedYear : new Date().getFullYear()}
              <span className="text-base font-bold text-green-600">
                &nbsp;({monthlyStats.bestMonth.stats.winRate.toFixed(2)}% WR)
              </span>
            </p>
            <p className="text-sm font-semibold text-green-600 mt-1">
              {getCurrencySymbol()}{monthlyStats.bestMonth.stats.profit.toFixed(2)}
            </p>
          </div>
        )}
        {monthlyStats.worstMonth && (
          <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col items-center flex-1">
            <h3 className="text-sm font-semibold text-stone-500 mb-1">Worst Month</h3>
            <p className="text-2xl font-bold text-stone-900">
              {monthlyStats.worstMonth.month} {allTrades.length > 0 ? selectedYear : new Date().getFullYear()}
              <span className="text-base font-bold text-red-600">
                &nbsp;({monthlyStats.worstMonth.stats.winRate.toFixed(2)}% WR)
              </span>
            </p>
            <p className="text-sm font-semibold text-red-600 mt-1">
              {getCurrencySymbol()}{monthlyStats.worstMonth.stats.profit.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Monthly Performance Chart */}
        <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Monthly Performance</h2>
          <p className="text-sm text-stone-500 mb-4">Monthly performance of trades</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const dataset = context.dataset;
                        const value = context.parsed.x;
                        const month = context.label;
                        const monthData = monthlyStatsAllTrades[month];
                        const winRate = monthData.winRate.toFixed(1);
                        return `${dataset.label}: ${value}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)', // stone-800
                      callback: function(value, index) {
                        // value is the index of the label
                        const labels = this.getLabels();
                        const month = labels && typeof value === 'number' ? labels[value] : value;
                        const stats = monthlyStatsAllTrades[month];
                        const totalTrades = stats ? stats.wins + stats.losses : 0;
                        return `${month} (${totalTrades})`;
                      }
                    }
                  },
                },
              }}
              data={{
                labels: Object.keys(monthlyStatsAllTrades),
                datasets: [
                  {
                    label: 'Wins',
                    data: Object.values(monthlyStatsAllTrades).map(stats => stats.wins),
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage:  0.5,
                    categoryPercentage:  0.5,
                  },
                  {
                    label: 'Losses',
                    data: Object.values(monthlyStatsAllTrades).map(stats => stats.losses),
                    backgroundColor: '#e7e5e4', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.5,
                    categoryPercentage:  0.5,
                  },
                  {
                    label: 'Win Rate',
                    data: Object.values(monthlyStatsAllTrades).map(stats => stats.winRate),
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage:  0.5,
                    categoryPercentage:  0.5,
                  },
                ],
              }}
            />
          </div>
        </div>

      <h2 className="text-2xl font-bold text-stone-900 mt-20">Date Range Stats</h2>
      <p className="text-stone-500 mb-10">Trading performance metrics for your selected date range.</p>

      {/* Date Range and Filter Buttons */}
      <div className="mb-8 bg-white border border-stone-200 rounded-lg shadow-sm p-6">  
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-72">
              <div className="relative w-full">
                <input
                  ref={inputRef}
                  placeholder="Select date range"
                  type="text"
                  className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer pr-10"
                  value={`${dateRange.startDate} ~ ${dateRange.endDate}`}
                  readOnly
                  onFocus={() => setShowDatePicker(true)}
                  onClick={() => setShowDatePicker(true)}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowDatePicker(v => !v)}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
                  </svg>
                </span>
                {showDatePicker && (
                  <div ref={pickerRef} className="absolute shadow-lg rounded-lg z-50 mt-2 left-0 date-range-popup">
                    <DateRange
                      ranges={[
                        {
                          startDate: new Date(dateRange.startDate),
                          endDate: new Date(dateRange.endDate),
                          key: 'selection',
                        },
                      ]}
                      onChange={(ranges) => {
                        const { startDate, endDate } = ranges.selection;
                        const newStart = format(startDate as Date, 'yyyy-MM-dd');
                        const newEnd = format(endDate as Date, 'yyyy-MM-dd');
                        if (dateRange.startDate !== newStart || dateRange.endDate !== newEnd) {
                          setDateRange({
                            startDate: newStart,
                            endDate: newEnd,
                          });
                        }
                      }}
                      moveRangeOnFirstSelection={false}
                      editableDateInputs={true}
                      maxDate={new Date()}
                      showMonthAndYearPickers={true}
                      rangeColors={['#333']}
                      direction="vertical"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-stone-700">Filters:</span>
            <div className="flex flex-wrap gap-2">
              <button
                className={`inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md ${
                  activeFilter === 'year' && !isCustomDateRange()
                    ? 'relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased' 
                    : 'bg-transparent relative text-stone-700 hover:text-stone-700 border-stone-500 hover:bg-transparent duration-150 hover:border-stone-600 rounded-lg hover:opacity-60 hover:shadow-none'
                }`}
                onClick={() => handleFilter('year')}
              >
                Current Year
              </button>
              <button
                className={`inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md ${
                  activeFilter === '15days' && !isCustomDateRange()
                    ? 'relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased' 
                    : 'bg-transparent relative text-stone-700 hover:text-stone-700 border-stone-500 hover:bg-transparent duration-150 hover:border-stone-600 rounded-lg hover:opacity-60 hover:shadow-none'
                }`}
                onClick={() => handleFilter('15days')}
              >
                Last 15 Days
              </button>
              <button
                className={`inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md ${
                  activeFilter === '30days' && !isCustomDateRange()
                    ? 'relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased' 
                    : 'bg-transparent relative text-stone-700 hover:text-stone-700 border-stone-500 hover:bg-transparent duration-150 hover:border-stone-600 rounded-lg hover:opacity-60 hover:shadow-none'
                }`}
                onClick={() => handleFilter('30days')}
              >
                Last 30 Days
              </button>
              <button
                className={`inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md ${
                  activeFilter === 'month' && !isCustomDateRange()
                    ? 'relative bg-gradient-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased' 
                    : 'bg-transparent relative text-stone-700 hover:text-stone-700 border-stone-500 hover:bg-transparent duration-150 hover:border-stone-600 rounded-lg hover:opacity-60 hover:shadow-none'
                }`}
                onClick={() => handleFilter('month')}
              >
                Current Month
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats and Best/Worst Month Cards Row - David UI Style */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stat Cards */}
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-stone-500 mb-1">Total Trades</h3>
          <p className="text-2xl font-bold text-stone-900">{stats.totalTrades}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-stone-500 mb-1">Win Rate</h3>
          <p className="text-2xl font-bold text-stone-900">{stats.winRate.toFixed(2)}% <span className="text-stone-500 text-sm">({stats.winRateWithBE.toFixed(2)}% with BE)</span></p>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-stone-500 mb-1">Total Profit</h3>
          <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{getCurrencySymbol()}{stats.totalProfit.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-stone-500 mb-1">Average Profit</h3>
          <p className={`text-2xl font-bold ${stats.averageProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{getCurrencySymbol()}{stats.averageProfit.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-stone-500 mb-1">Total Wins</h3>
          <p className="text-2xl font-bold text-green-600">
            {stats.totalWins}
            {typeof filteredTrades !== 'undefined' && (
              (() => {
                const beWins = filteredTrades.filter(t => t.trade_outcome === 'Win' && t.break_even).length;
                return beWins > 0 ? ` (${beWins} BE)` : '';
              })()
            )}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-stone-500 mb-1">Total Losses</h3>
          <p className="text-2xl font-bold text-red-600">
            {stats.totalLosses}
            {typeof filteredTrades !== 'undefined' && (
              (() => {
                const beLosses = filteredTrades.filter(t => t.trade_outcome === 'Lose' && t.break_even).length;
                return beLosses > 0 ? ` (${beLosses} BE)` : '';
              })()
            )}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-stone-500 mb-1 flex items-center">
            Max Drawdown
            <span className="ml-1 cursor-help group relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full -left-5 md:left-1/2 transform -translate-x-1/2 mb-2 w-72 sm:w-80 md:w-96 bg-white border border-stone-200 rounded-lg shadow-lg p-3 sm:p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="text-xs sm:text-sm text-stone-700 space-y-1 sm:space-y-2">
                  <div className="font-semibold text-stone-900 mb-1 sm:mb-2">Drawdown Interpretation</div>
                  <div className={`${stats.maxDrawdown <= 2 ? 'bg-blue-50 border-blue-200' : 'bg-stone-50 border-stone-200'} border rounded p-1.5 sm:p-2`}>
                    <span className="font-medium">🔹 0% – 2%</span> — Excellent. Very low risk. Usually seen in algo/automated or conservative systems.
                  </div>
                  <div className={`${stats.maxDrawdown > 2 && stats.maxDrawdown <= 5 ? 'bg-green-50 border-green-200' : 'bg-stone-50 border-stone-200'} border rounded p-1.5 sm:p-2`}>
                    <span className="font-medium">✅ 2% – 5%</span> — Healthy/Moderate. Most professional strategies fall in this zone.
                  </div>
                  <div className={`${stats.maxDrawdown > 5 && stats.maxDrawdown <= 10 ? 'bg-yellow-50 border-yellow-200' : 'bg-stone-50 border-stone-200'} border rounded p-1.5 sm:p-2`}>
                    <span className="font-medium">⚠️ 5% – 10%</span> — Aggressive but Acceptable. Common for swing traders and trend followers.
                  </div>
                  <div className={`${stats.maxDrawdown > 10 && stats.maxDrawdown <= 20 ? 'bg-orange-50 border-orange-200' : 'bg-stone-50 border-stone-200'} border rounded p-1.5 sm:p-2`}>
                    <span className="font-medium">❗ 10% – 20%</span> — High Risk. Suitable only for high-volatility strategies.
                  </div>
                  <div className={`${stats.maxDrawdown > 20 ? 'bg-red-50 border-red-200' : 'bg-stone-50 border-stone-200'} border rounded p-1.5 sm:p-2`}>
                    <span className="font-medium">🚫 20%+</span> — Danger Zone. Signals poor risk control or heavy leverage.
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-stone-200 transform rotate-45"></div>
              </div>
            </span>
          </h3>
          <p className="text-2xl font-bold">{stats.maxDrawdown.toFixed(2)}%</p>
        </div>
        {/* P&L % Stat Card */}
        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-stone-500 mb-1 flex items-center">
            P&L %
            <span className="ml-1 cursor-help group relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full -left-5 md:left-1/2 transform -translate-x-1/2 mb-2 w-60 bg-white border border-stone-200 rounded-lg shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="text-xs sm:text-sm text-stone-700">Average P&L % over starting balance.</div>
              </div>
            </span>
          </h3>
           <p className={`text-2xl font-bold ${stats.averagePnLPercentage > 0 ? 'text-green-600' : stats.averagePnLPercentage < 0 ? 'text-red-600' : 'text-stone-600'}`}>{stats.averagePnLPercentage.toFixed(2)}%</p>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-stone-900">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleMonthNavigation('prev')}
              className="inline-grid place-items-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm min-w-[38px] min-h-[38px] rounded-md bg-transparent border-transparent text-stone-800 hover:bg-stone-800/5 hover:border-stone-800/5 shadow-none hover:shadow-none"
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => handleMonthNavigation('next')}
              className="inline-grid place-items-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm min-w-[38px] min-h-[38px] rounded-md bg-transparent border-transparent text-stone-800 hover:bg-stone-800/5 hover:border-stone-800/5 shadow-none hover:shadow-none"
              aria-label="Next month"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center font-semibold text-sm text-stone-600 p-2">
              {day}
            </div>
          ))}
          
          {(() => {
            const daysInMonth = getDaysInMonth();
            const firstDay = daysInMonth[0];
            const lastDay = daysInMonth[daysInMonth.length - 1];
            
            // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
            const firstDayOfWeek = firstDay.getDay();
            // Convert to Monday-based (0 = Monday, 6 = Sunday)
            const mondayBasedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
            
            // Create array of empty cells for days before the first day of the month
            const emptyCells = Array(mondayBasedFirstDay).fill(null);
            
            return [...emptyCells, ...daysInMonth].map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="p-2 min-h-[80px] border rounded-lg bg-stone-50 border-stone-200"
                  />
                );
              }

              const dayTrades = calendarMonthTrades.filter(trade => {
                const tradeDate = new Date(trade.trade_date);
                return format(tradeDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
              });
              const dayStats = getDayStats(dayTrades);
              const hasBE = dayTrades.some(trade => trade.break_even);

              return (
                <div
                  key={date.toString()}
                  className={`relative p-2 min-h-[80px] border rounded-lg transition-all duration-200 ${
                    dayStats.totalProfit > 0 
                      ? 'bg-green-100/50 border-green-200 hover:bg-green-100' 
                      : dayStats.totalProfit < 0 
                      ? 'bg-red-100/50 border-red-200 hover:bg-red-100'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-sm font-medium text-stone-800 mb-1">{format(date, 'd')}</div>
                  {hasBE && (
                    <div className="absolute top-1 right-1 text-xs font-bold text-stone-900 px-1">BE</div>
                  )}
                  {dayStats.totalTrades > 0 && (
                    <div className="text-xs space-y-1">
                      <div className="font-medium text-stone-700">
                        {dayStats.totalTrades} trade{dayStats.totalTrades !== 1 ? 's' : ''}
                      </div>
                      <div className={`font-semibold ${
                        dayStats.totalProfit >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {getCurrencySymbol()}{Math.abs(dayStats.totalProfit).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Statistics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-8">
        {/* Liquidity Statistics Card */}
        <div className="rounded-lg border shadow-sm overflow-hidden bg-white border-stone-200 shadow-stone-950/5 p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Liquidity Statistics</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on market liquidity conditions</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const stat = liquidityStats[context.dataIndex];
                        const dataset = context.dataset;
                        if (dataset.label === 'Wins') {
                          return `Wins: ${stat.wins} (${stat.beWins} BE)`;
                        }
                        if (dataset.label === 'Losses') {
                          return `Losses: ${stat.losses} (${stat.beLosses} BE)`;
                        }
                        if (dataset.label === 'Win Rate') {
                          return `Win Rate: ${stat.winRate.toFixed(2)}% (${stat.winRateWithBE.toFixed(2)}% with BE)`;
                        }
                        return `${dataset.label}: ${context.parsed.x}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    }
                  },
                },
              }}
              data={{
                labels: liquidityStats.map(stat => `${stat.liquidity} (${stat.wins + stat.losses})`),
                datasets: [
                  {
                    label: 'Wins',
                    data: liquidityStats.map(stat => stat.wins),
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Losses',
                    data: liquidityStats.map(stat => stat.losses),
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Win Rate',
                    data: liquidityStats.map(stat => stat.winRate),
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                ],
              }}
            />
          </div>
        </div>

        {/* Setup Statistics Card */}
        <div className="rounded-lg border shadow-sm overflow-hidden bg-white border-stone-200 shadow-stone-950/5 p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Setup Statistics</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on trading setup</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const stat = setupStats[context.dataIndex];
                        const dataset = context.dataset;
                        if (dataset.label === 'Wins') {
                          return `Wins: ${stat.wins} (${stat.beWins} BE)`;
                        }
                        if (dataset.label === 'Losses') {
                          return `Losses: ${stat.losses} (${stat.beLosses} BE)`;
                        }
                        if (dataset.label === 'Win Rate') {
                          return `Win Rate: ${stat.winRate.toFixed(2)}% (${stat.winRateWithBE.toFixed(2)}% with BE)`;
                        }
                        return `${dataset.label}: ${context.parsed.x}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    }
                  },
                },
              }}
              data={{
                labels: setupStats.map(stat => `${stat.setup} (${stat.wins + stat.losses})`),
                datasets: [
                  {
                    label: 'Wins',
                    data: setupStats.map(stat => stat.wins),
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Losses',
                    data: setupStats.map(stat => stat.losses),
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Win Rate',
                    data: setupStats.map(stat => stat.winRate),
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                ],
              }}
            />
          </div>
        </div>

        {/* Direction Statistics Card */}
        <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Long/Short Statistics</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on direction</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const stat = directionStats[context.dataIndex];
                        const dataset = context.dataset;
                        if (dataset.label === 'Wins') {
                          return `Wins: ${stat.wins} (${stat.beWins} BE)`;
                        }
                        if (dataset.label === 'Losses') {
                          return `Losses: ${stat.losses} (${stat.beLosses} BE)`;
                        }
                        if (dataset.label === 'Win Rate') {
                          return `Win Rate: ${stat.winRate.toFixed(2)}% (${stat.winRateWithBE.toFixed(2)}% with BE)`;
                        }
                        return `${dataset.label}: ${context.parsed.x}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    }
                  },
                },
              }}
              data={{
                labels: directionStats.map(stat => `${stat.direction} (${stat.wins + stat.losses})`),
                datasets: [
                  {
                    label: 'Wins',
                    data: directionStats.map(stat => stat.wins),
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Losses',
                    data: directionStats.map(stat => stat.losses),
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Win Rate',
                    data: directionStats.map(stat => stat.winRate),
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                ],
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-8">
        {/* Local H/L Analysis Card */}
        <div className="rounded-lg border shadow-sm overflow-hidden bg-white border-stone-200 shadow-stone-950/5 p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Local H/L Analysis</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on local high/low status</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const idx = context.dataIndex;
                        const isLichidat = idx === 0;
                        const stat = isLichidat ? localHLStats.lichidat : localHLStats.nelichidat;
                        const dataset = context.dataset;
                        if (dataset.label === 'Wins') {
                          return `Wins: ${stat.wins} (${stat.winsWithBE} BE)`;
                        }
                        if (dataset.label === 'Losses') {
                          return `Losses: ${stat.losses} (${stat.lossesWithBE} BE)`;
                        }
                        if (dataset.label === 'Win Rate') {
                          return `Win Rate: ${stat.winRate.toFixed(2)}% (${stat.winRateWithBE.toFixed(2)}% with BE)`;
                        }
                        return `${dataset.label}: ${context.parsed.x}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    }
                  },
                },
              }}
              data={{
                labels: [
                  `Lichidat (${localHLStats.lichidat.wins + localHLStats.lichidat.losses})`,
                  `Nelichidat (${localHLStats.nelichidat.wins + localHLStats.nelichidat.losses})`
                ],
                datasets: [
                  {
                    label: 'Wins',
                    data: [
                      localHLStats.lichidat.wins,
                      localHLStats.nelichidat.wins,
                    ],
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Losses',
                    data: [
                      localHLStats.lichidat.losses,
                      localHLStats.nelichidat.losses,
                    ],
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Win Rate',
                    data: [
                      localHLStats.lichidat.winRate,
                      localHLStats.nelichidat.winRate,
                    ],
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                ],
              }}
            />
          </div>
        </div>

        {/* Risk/Reward Statistics */}
        <RiskRewardStats trades={filteredTrades} />

        <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Time Interval Analysis</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on time interval</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const interval = TIME_INTERVALS[context.dataIndex];
                        const stat = stats.intervalStats[interval.label] || {};
                        const dataset = context.dataset;
                        if (dataset.label === 'Wins') {
                          return `Wins: ${stat.wins} (${stat.beWins} BE)`;
                        }
                        if (dataset.label === 'Losses') {
                          return `Losses: ${stat.losses} (${stat.beLosses} BE)`;
                        }
                        if (dataset.label === 'Win Rate') {
                          return `Win Rate: ${stat.winRate?.toFixed(2)}% (${stat.winRateWithBE?.toFixed(2)}% with BE)`;
                        }
                        return `${dataset.label}: ${context.parsed.x}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    }
                  },
                },
              }}
              data={{
                labels: TIME_INTERVALS.map(interval => `${interval.label} (${(stats.intervalStats[interval.label]?.wins || 0) + (stats.intervalStats[interval.label]?.losses || 0)})`),
                datasets: [
                  {
                    label: 'Wins',
                    data: TIME_INTERVALS.map(interval => 
                      stats.intervalStats[interval.label]?.wins || 0
                    ),
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8,
                  },
                  {
                    label: 'Losses',
                    data: TIME_INTERVALS.map(interval => 
                      stats.intervalStats[interval.label]?.losses || 0
                    ),
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8,
                  },
                  {
                    label: 'Win Rate',
                    data: TIME_INTERVALS.map(interval => stats.intervalStats[interval.label]?.winRate || 0),
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8,
                  },
                ],
              }}
            />
          </div>
        </div>
      </div>

      {/* SL Size and Trade Types Statistics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* SL Size Statistics Card */}
        <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">SL Size Statistics</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on SL size</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `SL Size: ${context.parsed.x}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    }
                  },
                },
              }}
              data={{
                labels: slSizeStats.map(stat => stat.market),
                datasets: [
                  {
                    label: 'SL Size',
                    data: slSizeStats.map(stat => stat.averageSlSize),
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.4,
                    categoryPercentage: 0.4,
                  }
                ],
              }}
            />
          </div>
        </div>

        {/* Trade Types Statistics Card */}
        <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Trade Types Statistics</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on trade type</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        // There are two stats arrays: reentryStats and breakEvenStats
                        // The first N bars are reentryStats, the next M bars are breakEvenStats
                        const totalStats = [...reentryStats, ...breakEvenStats];
                        const stat = totalStats[context.dataIndex] || {};
                        const dataset = context.dataset;
                        const isReentry = context.dataIndex < reentryStats.length;

                        if (dataset.label === 'Wins') {
                          return isReentry 
                            ? `Wins: ${stat.wins} (${stat.beWins} BE)`
                            : `Wins: ${stat.wins}`;
                        }
                        if (dataset.label === 'Losses') {
                          return isReentry
                            ? `Losses: ${stat.losses} (${stat.beLosses} BE)`
                            : `Losses: ${stat.losses}`;
                        }
                        if (dataset.label === 'Win Rate') {
                          return isReentry
                            ? `Win Rate: ${stat.winRate?.toFixed(2)}% (${stat.winRateWithBE?.toFixed(2)}% with BE)`
                            : `Win Rate: ${stat.winRate?.toFixed(2)}%`;
                        }
                        return `${dataset.label}: ${context.parsed.x}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    }
                  },
                },
              }}
              data={{
                labels: [
                  ...reentryStats.map(stat => `ReEntry (${stat.wins + stat.losses})`),
                  ...breakEvenStats.map(stat => `BE (${stat.wins + stat.losses})`)
                ],
                datasets: [
                  {
                    label: 'Wins',
                    data: [...reentryStats.map(stat => stat.wins), ...breakEvenStats.map(stat => stat.wins)],
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Losses',
                    data: [...reentryStats.map(stat => stat.losses), ...breakEvenStats.map(stat => stat.losses)],
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Win Rate',
                    data: [
                      ...reentryStats.map(stat => {
                        const total = stat.wins + stat.losses;
                        return total > 0 ? (stat.wins / total) * 100 : 0;
                      }),
                      ...breakEvenStats.map(stat => {
                        const total = stat.wins + stat.losses;
                        return total > 0 ? (stat.wins / total) * 100 : 0;
                      })
                    ],
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                ],
              }}
            />
          </div>
        </div>
      </div>

      {/* MSS and News Statistics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* MSS Statistics Card */}
        <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">MSS Statistics</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on MSS</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const stat = mssStats[context.dataIndex] || {};
                        const dataset = context.dataset;
                        if (dataset.label === 'Wins') {
                          return `Wins: ${stat.wins} (${stat.beWins} BE)`;
                        }
                        if (dataset.label === 'Losses') {
                          return `Losses: ${stat.losses} (${stat.beLosses} BE)`;
                        }
                        if (dataset.label === 'Win Rate') {
                          return `Win Rate: ${stat.winRate?.toFixed(2)}% (${stat.winRateWithBE?.toFixed(2)}% with BE)`;
                        }
                        return `${dataset.label}: ${context.parsed.x}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    }
                  },
                },
              }}
              data={{
                labels: mssStats.map(stat => stat.type),
                datasets: [
                  {
                    label: 'Wins',
                    data: mssStats.map(stat => stat.wins),
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Losses',
                    data: mssStats.map(stat => stat.losses),
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Win Rate',
                    data: mssStats.map(stat => {
                      const total = stat.wins + stat.losses;
                      return total > 0 ? (stat.wins / total) * 100 : 0;
                    }),
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                ],
              }}
            />
          </div>
        </div>

        {/* News Statistics Card */}
        <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">News Statistics</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on news</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const stat = newsStats[context.dataIndex] || {};
                        const dataset = context.dataset;
                        if (dataset.label === 'Wins') {
                          return `Wins: ${stat.wins} (${stat.beWins} BE)`;
                        }
                        if (dataset.label === 'Losses') {
                          return `Losses: ${stat.losses} (${stat.beLosses} BE)`;
                        }
                        if (dataset.label === 'Win Rate') {
                          return `Win Rate: ${stat.winRate?.toFixed(2)}% (${stat.winRateWithBE?.toFixed(2)}% with BE)`;
                        }
                        return `${dataset.label}: ${context.parsed.x}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    }
                  },
                },
              }}
              data={{
                labels: newsStats.map(stat => `${stat.type} (${stat.wins + stat.losses})`),
                datasets: [
                  {
                    label: 'Wins',
                    data: newsStats.map(stat => stat.wins),
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Losses',
                    data: newsStats.map(stat => stat.losses),
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                  {
                    label: 'Win Rate',
                    data: newsStats.map(stat => stat.winRate),
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                  },
                ],
              }}
            />
          </div>
        </div>
      </div>

      {/* Day and Market Statistics Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Day Statistics Card */}
        <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Day Statistics</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on day of the week</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const stat = dayStats[context.dataIndex] || {};
                        const dataset = context.dataset;
                        if (dataset.label === 'Wins') {
                          return `Wins: ${stat.wins} (${stat.beWins} BE)`;
                        }
                        if (dataset.label === 'Losses') {
                          return `Losses: ${stat.losses} (${stat.beLosses} BE)`;
                        }
                        if (dataset.label === 'Win Rate') {
                          return `Win Rate: ${stat.winRate?.toFixed(2)}% (${stat.winRateWithBE?.toFixed(2)}% with BE)`;
                        }
                        return `${dataset.label}: ${context.parsed.x}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    }
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    }
                  },
                },
              }}
              data={{
                labels: dayStats.map(stat => `${stat.day} (${stat.wins + stat.losses})`),
                datasets: [
                  {
                    label: 'Wins',
                    data: dayStats.map(stat => stat.wins),
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8,
                  },
                  {
                    label: 'Losses',
                    data: dayStats.map(stat => stat.losses),
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8,
                  },
                  {
                    label: 'Win Rate',
                    data: dayStats.map(stat => stat.winRate),
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8,
                  },
                ],
              }}
            />
          </div>
        </div>

        {/* Market Statistics Card */}
        <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Market Statistics</h2>
          <p className="text-sm text-stone-500 mb-4">Distribution of trades based on market</p>
          <div className="h-80">
            <Bar
              options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const dataset = context.dataset;
                        const value = context.parsed.x;
                        if (dataset.label === 'Win Rate') {
                          return `${dataset.label}: ${value.toFixed(2)}%`;
                        }
                        return `${dataset.label}: ${value}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false
                    } 
                  },
                  y: {
                    stacked: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      color: 'rgb(41, 37, 36)' // stone-800
                    } 
                  },
                },
              }}
              data={{
                labels: marketStats.map(stat => `${stat.market} (${stat.wins + stat.losses})`),
                datasets: [
                  {
                    label: 'Wins',
                    data: marketStats.map(stat => stat.wins),
                    backgroundColor: 'rgba(134, 239, 172, 0.8)', // green-300
                    borderColor: 'rgb(134, 239, 172)', // green-300
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8,
                  },
                  {
                    label: 'Losses',
                    data: marketStats.map(stat => stat.losses),
                    backgroundColor: 'rgba(231, 229, 228, 0.8)', // stone-200
                    borderColor: 'rgb(231, 229, 228)', // stone-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8,
                  },
                  {
                    label: 'Win Rate',
                    data: marketStats.map(stat => {
                      const total = stat.wins + stat.losses;
                      return total > 0 ? (stat.wins / total) * 100 : 0;
                    }),
                    backgroundColor: 'rgba(253, 230, 138, 0.8)', // amber-200
                    borderColor: 'rgb(253, 230, 138)', // amber-200
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.8,
                    categoryPercentage: 0.8,
                  },
                ],
              }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border-stone-200 border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Local H/L + BE Statistics</h2>
          <p className="text-sm text-stone-500 mb-4">Analysis of trades marked as both Local High/Low and Break Even</p>
          <div className="h-80">
            {(() => {
              const lichidatReentryTrades = filteredTrades.filter(
                t => String(t.local_high_low) === 'true' && t.break_even);
              const wins = lichidatReentryTrades.filter(t => t.trade_outcome === 'Win').length;
              const losses = lichidatReentryTrades.filter(t => t.trade_outcome === 'Lose').length;
              const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
              return (
                <Bar
                  options={{
                    ...chartOptions,
                    indexAxis: 'y',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const dataset = context.dataset;
                            const value = context.parsed.x;
                            if (dataset.label === 'Win Rate') {
                              return `${dataset.label}: ${value.toFixed(2)}%`;
                            }
                            return `${dataset.label}: ${value}`;
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
                        ticks: { color: 'rgb(41, 37, 36)' }
                      },
                    },
                  }}
                  data={{
                    labels: [`Local High/Low + BE (${wins + losses})`],
                    datasets: [
                      {
                        label: 'Wins',
                        data: [wins],
                        backgroundColor: 'rgba(134, 239, 172, 0.8)',
                        borderColor: 'rgb(134, 239, 172)',
                        borderWidth: 0,
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.6,
                      },
                      {
                        label: 'Losses',
                        data: [losses],
                        backgroundColor: 'rgba(231, 229, 228, 0.8)',
                        borderColor: 'rgb(231, 229, 228)',
                        borderWidth: 0,
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.6,
                      },
                      {
                        label: 'Win Rate',
                        data: [winRate],
                        backgroundColor: 'rgba(253, 230, 138, 0.8)',
                        borderColor: 'rgb(253, 230, 138)',
                        borderWidth: 0,
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.6,
                      },
                    ],
                  }}
                />
              );
            })()}
          </div>
        </div>
        {/* Evaluation Statistics */}
        <EvaluationStats stats={stats.evaluationStats} />
      </div>
    </DashboardLayout>
  );
} 