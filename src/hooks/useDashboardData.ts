import { useState, useEffect } from 'react';
import { Trade } from '@/types/trade';
import { AccountSettings } from '@/types/account-settings';
import { useRouter } from 'next/navigation';
import { useUserDetails } from './useUserDetails';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

interface IntervalStats {
  wins: number;
  losses: number;
  winRate: number;
}
interface MonthlyStats {
  wins: number;
  losses: number;
  winRate: number;
  profit: number;
}
interface SetupStats {
  setup: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}
interface LiquidityStats {
  liquidity: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}
interface DirectionStats {
  direction: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}
interface TradeTypeStats {
  type: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}
interface MssStats {
  type: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}
interface NewsStats {
  type: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}
interface DayStats {
  day: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}
interface MarketStats {
  market: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}
interface SlSizeStats {
  market: string;
  averageSlSize: number;
}

interface MonthlyStatsWithMonth {
  month: string;
  stats: MonthlyStats;
}

interface Stats {
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalProfit: number;
  averageProfit: number;
  intervalStats: Record<string, IntervalStats>;
  maxDrawdown: number;
  averagePnLPercentage: number;
}

const TIME_INTERVALS = [
  { label: '< 10 a.m', start: '00:00', end: '09:59' },
  { label: '10 a.m - 12 p.m', start: '10:00', end: '11:59' },
  { label: '12 p.m - 16 p.m', start: '12:00', end: '16:59' },
  { label: '17 p.m - 21 p.m', start: '17:00', end: '20:59' },
] as const;

function groupTradesByProperty(trades: Trade[], property: keyof Trade, defaultValue: string = 'Unknown') {
  return trades.reduce((acc: { [key: string]: Trade[] }, trade) => {
    const value = (trade[property] as string) || defaultValue;
    if (!acc[value]) {
      acc[value] = [];
    }
    acc[value].push(trade);
    return acc;
  }, {});
}

function processTradeGroup(label: string, trades: Trade[]) {
  const wins = trades.filter((trade: Trade) => trade.trade_outcome === 'Win').length;
  const losses = trades.filter((trade: Trade) => trade.trade_outcome === 'Lose').length;
  const total = trades.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  return {
    type: label,
    setup: label,
    market: label,
    liquidity: label,
    direction: label,
    day: label,
    total,
    wins,
    losses,
    winRate
  };
}

function processTradeGroups(groups: { [key: string]: Trade[] }) {
  return Object.entries(groups)
    .map(([label, trades]) => processTradeGroup(label, trades))
    .sort((a, b) => b.total - a.total);
}

function mapSupabaseTradeToTrade(trade: any, mode: string): Trade {
  return {
    id: trade.id,
    user_id: trade.user_id,
    account_id: trade.account_id,
    mode: mode,
    trade_link: trade.trade_link,
    liquidity_taken: trade.liquidity_taken,
    trade_time: trade.trade_time,
    trade_date: trade.trade_date,
    day_of_week: trade.day_of_week,
    market: trade.market,
    setup_type: trade.setup_type,
    liquidity: trade.liquidity,
    sl_size: trade.sl_size,
    direction: trade.direction,
    trade_outcome: trade.trade_outcome,
    break_even: trade.break_even,
    reentry: trade.reentry,
    news_related: trade.news_related,
    mss: trade.mss,
    risk_reward_ratio: trade.risk_reward_ratio,
    risk_reward_ratio_long: trade.risk_reward_ratio_long,
    local_high_low: trade.local_high_low,
    risk_per_trade: trade.risk_per_trade,
    calculated_profit: trade.calculated_profit,
    pnl_percentage: trade.pnl_percentage,
    quarter: trade.quarter
  };
}

const fetchTrades = async (url: string, token: string): Promise<Trade[]> => {
   const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const trades: Trade[] = await res.json();
  return Array.isArray(trades) ? trades : [];
};

function normalizeTimeToHHMM(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

export function useDashboardData({
  session,
  dateRange,
  mode,
  activeAccount,
  contextLoading,
  isSessionLoading,
  currentDate,
  calendarDateRange,
  selectedYear,
}: {
  session: any;
  dateRange: { startDate: string; endDate: string };
  mode: string;
  activeAccount: AccountSettings | null;
  contextLoading: boolean;
  isSessionLoading: boolean;
  currentDate: Date;
  calendarDateRange: { startDate: string; endDate: string };
  selectedYear: number;
}) {
  const router = useRouter();
  const { data: user, isLoading: userLoading, error } = useUserDetails();
  const [stats, setStats] = useState<Stats>({
    totalTrades: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    totalProfit: 0,
    averageProfit: 0,
    intervalStats: {} as Record<string, IntervalStats>,
    maxDrawdown: 0,
    averagePnLPercentage: 0
  });
  const [monthlyStats, setMonthlyStats] = useState<{
    bestMonth: MonthlyStatsWithMonth | null;
    worstMonth: MonthlyStatsWithMonth | null;
  }>({
    bestMonth: null,
    worstMonth: null
  });
  const [monthlyStatsAllTrades, setMonthlyStatsAllTrades] = useState<Record<string, MonthlyStats>>({});
  const [localHLStats, setLocalHLStats] = useState({
    lichidat: { wins: 0, losses: 0, winRate: 0 },
    nelichidat: { wins: 0, losses: 0, winRate: 0 }
  });
  const [setupStats, setSetupStats] = useState<SetupStats[]>([]);
  const [liquidityStats, setLiquidityStats] = useState<LiquidityStats[]>([]);
  const [directionStats, setDirectionStats] = useState<DirectionStats[]>([]);
  const [reentryStats, setReentryStats] = useState<TradeTypeStats[]>([]);
  const [breakEvenStats, setBreakEvenStats] = useState<TradeTypeStats[]>([]);
  const [mssStats, setMssStats] = useState<MssStats[]>([]);
  const [newsStats, setNewsStats] = useState<NewsStats[]>([]);
  const [dayStats, setDayStats] = useState<DayStats[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats[]>([]);
  const [slSizeStats, setSlSizeStats] = useState<SlSizeStats[]>([]);

  // Query for all trades in the selected year (only used for monthly stats)
  const { data: allTrades = [], isLoading: allTradesLoading } = useQuery<Trade[]>({
    queryKey: ['allTrades', mode, activeAccount?.id, session?.user?.id, selectedYear],
    queryFn: async () => {
      if (!session?.user?.id || !activeAccount?.id) {
        return [];
      }
      
      const supabase = createClient();
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
    
      try {
        const { data: trades, error } = await supabase
          .from(`${mode}_trades`)
          .select('*')
          .eq('user_id', session.user.id)
          .eq('account_id', activeAccount.id)
          .gte('trade_date', startDate)
          .lte('trade_date', endDate)
          .order('trade_date', { ascending: false });

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        if (!trades) {
          console.log('No trades found');
          return [];
        }
        // Transform Supabase data to match Trade type
        return trades.map(trade => mapSupabaseTradeToTrade(trade, mode));
      } catch (error) {
        console.error('Error in fetchTradessssss:', error);
        return [];
      }
    },
    enabled: !contextLoading && !isSessionLoading && !userLoading && !!session?.user?.id && !!activeAccount?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query for filtered trades based on date range (independent of year selection)
  const { data: filteredTrades = [], isLoading: filteredTradesLoading } = useQuery<Trade[]>({
    queryKey: ['filteredTrades', mode, activeAccount?.id, session?.user?.id, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      if (!session?.user?.id || !activeAccount?.id) return [];
      
      const supabase = createClient();
      
      try {
        const { data: trades, error } = await supabase
          .from(`${mode}_trades`)
          .select('*')
          .eq('user_id', session.user.id)
          .eq('account_id', activeAccount.id)
          .gte('trade_date', dateRange.startDate)
          .lte('trade_date', dateRange.endDate)
          .order('trade_date', { ascending: false });

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        if (!trades) {
          console.log('No trades found');
          return [];
        }
        // Transform Supabase data to match Trade type
        return trades.map(trade => mapSupabaseTradeToTrade(trade, mode));
      } catch (error) {
        console.error('Error in fetchTrades:', error);
        return [];
      }
    },
    enabled: !contextLoading && !isSessionLoading && !userLoading && !!session?.user?.id && !!activeAccount?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query for calendar month trades
  const { data: calendarMonthTrades = [], isLoading: calendarTradesLoading } = useQuery<Trade[]>({
    queryKey: ['calendarTrades', mode, activeAccount?.id, session?.user?.id, calendarDateRange],
    queryFn: async () => {
      if (!session?.user?.id || !activeAccount?.id) {
        return [];
      }
      
      const supabase = createClient();
    
      try {
        const { data: trades, error } = await supabase
          .from(`${mode}_trades`)
          .select('*')
          .eq('user_id', session.user.id)
          .eq('account_id', activeAccount.id)
          .gte('trade_date', calendarDateRange.startDate)
          .lte('trade_date', calendarDateRange.endDate)
          .order('trade_date', { ascending: false });

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        return trades.map(trade => mapSupabaseTradeToTrade(trade, mode));
      } catch (error) {
        console.error('Error fetching trades:', error);
        return [];
      }
    },
    enabled: !!session?.user?.id && !!activeAccount?.id && !contextLoading && !isSessionLoading
  });

  // Calculate stats when filtered trades change
  useEffect(() => {
    if (filteredTrades.length > 0) {
      calculateStats(filteredTrades);
    } else {
      const emptyStats = {
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        totalProfit: 0,
        averageProfit: 0,
        intervalStats: {},
        maxDrawdown: 0,
        averagePnLPercentage: 0
      };
      setStats(prev => {
        return JSON.stringify(prev) === JSON.stringify(emptyStats) ? prev : emptyStats;
      });
      const emptyHL = {
        lichidat: { wins: 0, losses: 0, winRate: 0 },
        nelichidat: { wins: 0, losses: 0, winRate: 0 }
      };
      setLocalHLStats(prev => {
        return JSON.stringify(prev) === JSON.stringify(emptyHL) ? prev : emptyHL;
      });
      setSetupStats(prev => (prev.length === 0 ? prev : []));
      setLiquidityStats(prev => (prev.length === 0 ? prev : []));
      setDirectionStats(prev => (prev.length === 0 ? prev : []));
      setReentryStats(prev => (prev.length === 0 ? prev : []));
      setBreakEvenStats(prev => (prev.length === 0 ? prev : []));
      setMssStats(prev => (prev.length === 0 ? prev : []));
      setNewsStats(prev => (prev.length === 0 ? prev : []));
      setDayStats(prev => (prev.length === 0 ? prev : []));
      setMarketStats(prev => (prev.length === 0 ? prev : []));
      setSlSizeStats(prev => (prev.length === 0 ? prev : []));
    }
  }, [filteredTrades]);

  // Calculate monthly stats when all trades change or selected year changes
  useEffect(() => {
    if (allTrades.length > 0) {
      calculateMonthlyStats(allTrades);
    }
  }, [allTrades, selectedYear]);

  const calculateStats = (trades: Trade[]) => {
    if (trades.length === 0) {
      setStats({
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        totalProfit: 0,
        averageProfit: 0,
        intervalStats: {} as Record<string, IntervalStats>,
        maxDrawdown: 0,
        averagePnLPercentage: 0
      });
      return;
    }

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningBalance = activeAccount?.account_balance || 0;
    
    // Sort trades by date and filter out BE trades
    const sortedNonBETrades = [...trades]
      .filter(trade => !trade.break_even)
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
    
    // Calculate PNL percentage for sorted non-BE trades
    let totalPnLPercentage = 0;
    
    sortedNonBETrades.forEach(trade => {
      const riskPerTrade = trade.risk_per_trade || 0.5;
      const riskAmount = runningBalance * (riskPerTrade / 100);
      const riskRewardRatio = trade.risk_reward_ratio || 2;
      
      if (trade.trade_outcome === 'Win') {
        const profit = riskAmount * riskRewardRatio;
        runningBalance += profit;
        totalPnLPercentage += (profit / (runningBalance - profit)) * 100;
      } else if (trade.trade_outcome === 'Lose') {
        runningBalance -= riskAmount;
        totalPnLPercentage -= (riskAmount / (runningBalance + riskAmount)) * 100;
      }
      
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      
      const drawdown = ((peak - runningBalance) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });
    
    const totalTrades = trades.length;
    const totalWins = trades.filter((t: Trade) => t.trade_outcome === 'Win').length;
    const totalLosses = trades.filter((t: Trade) => t.trade_outcome === 'Lose').length;

    // Calculate local high/low stats (handle both boolean and string values)
    const lichidatTrades = trades.filter((trade: Trade) => 
      String(trade.local_high_low) === 'Lichidat' || String(trade.local_high_low) === 'true' || String(trade.local_high_low) === '1'
    );
    const nelichidatTrades = trades.filter((trade: Trade) => 
      String(trade.local_high_low) === 'Nelichidat' || String(trade.local_high_low) === 'false' || String(trade.local_high_low) === '0'
    );

    const lichidatWins = lichidatTrades.filter((t: Trade) => t.trade_outcome === 'Win').length;
    const lichidatLosses = lichidatTrades.filter((t: Trade) => t.trade_outcome === 'Lose').length;
    const lichidatWinRate = lichidatTrades.length > 0 ? (lichidatWins / lichidatTrades.length) * 100 : 0;

    const nelichidatWins = nelichidatTrades.filter((t: Trade) => t.trade_outcome === 'Win').length;
    const nelichidatLosses = nelichidatTrades.filter((t: Trade) => t.trade_outcome === 'Lose').length;
    const nelichidatWinRate = nelichidatTrades.length > 0 ? (nelichidatWins / nelichidatTrades.length) * 100 : 0;

    setLocalHLStats({
      lichidat: {
        wins: lichidatWins,
        losses: lichidatLosses,
        winRate: lichidatWinRate
      },
      nelichidat: {
        wins: nelichidatWins,
        losses: nelichidatLosses,
        winRate: nelichidatWinRate
      }
    });

    // For profit and winRate, exclude BE trades
    const nonBETrades = trades.filter(t => !t.break_even);
    const winRate = nonBETrades.length > 0 ? (nonBETrades.filter((t: Trade) => t.trade_outcome === 'Win').length / nonBETrades.length) * 100 : 0;
    const totalProfit = nonBETrades.reduce((sum: number, trade: Trade) => {
      const riskPerTrade = trade.risk_per_trade || 0.5;
      const riskAmount = (activeAccount?.account_balance || 0) * (riskPerTrade / 100);
      const riskRewardRatio = trade.risk_reward_ratio || 2;
      if (trade.trade_outcome === 'Win') {
        return sum + (riskAmount * riskRewardRatio);
      } else if (trade.trade_outcome === 'Lose') {
        return sum - riskAmount;
      }
      return sum;
    }, 0) || 0;
    const averageProfit = nonBETrades.length > 0 ? totalProfit / nonBETrades.length : 0;

    // Calculate average PNL percentage as total profit over starting balance
    const startingBalance = activeAccount?.account_balance;
    const averagePnLPercentage = startingBalance ? (totalProfit / startingBalance) * 100 : 0;

    const intervalStats: Record<string, IntervalStats> = {};
    TIME_INTERVALS.forEach(interval => {
      const intervalTrades = trades.filter((trade: Trade) => 
        isTimeInInterval(normalizeTimeToHHMM(trade.trade_time), interval.start, interval.end)
      ) || [];
      const intervalWins = intervalTrades.filter((t: Trade) => t.trade_outcome === 'Win').length;
      const intervalLosses = intervalTrades.filter((t: Trade) => t.trade_outcome === 'Lose').length;
      const intervalWinRate = intervalTrades.length > 0 
        ? (intervalWins / intervalTrades.length) * 100 
        : 0;
      intervalStats[interval.label] = {
        wins: intervalWins,
        losses: intervalLosses,
        winRate: intervalWinRate
      };
    });

    setStats({
      totalTrades,
      totalWins,
      totalLosses,
      winRate,
      totalProfit,
      averageProfit,
      intervalStats,
      maxDrawdown,
      averagePnLPercentage,
    });

    // Calculate other stats
    const setupGroups = groupTradesByProperty(trades as Trade[], 'setup_type');
    setSetupStats(processTradeGroups(setupGroups));
    const liquidityGroups = groupTradesByProperty(trades as Trade[], 'liquidity');
    setLiquidityStats(processTradeGroups(liquidityGroups));
    const directionGroups = groupTradesByProperty(trades as Trade[], 'direction');
    setDirectionStats(processTradeGroups(directionGroups));
    const reentryTrades = trades.filter((trade: Trade) => trade.reentry);
    setReentryStats([processTradeGroup('ReEntry', reentryTrades)]);
    const breakEvenTrades = trades.filter((trade: Trade) => trade.break_even);
    setBreakEvenStats([processTradeGroup('BE', breakEvenTrades)]);
    const mssGroups = groupTradesByProperty(trades as Trade[], 'mss', 'Normal');
    setMssStats(processTradeGroups(mssGroups));
    const newsStats = [
      processTradeGroup('Fara', trades.filter((trade: Trade) => !trade.news_related)),
      processTradeGroup('Stiri', trades.filter((trade: Trade) => trade.news_related))
    ];
    setNewsStats(newsStats);
    const daysOfWeek = ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri'];
    const dayStats = daysOfWeek.map(day => {
      const dayTrades = trades.filter((trade: Trade) => {
        const tradeDate = new Date(trade.trade_date);
        const tradeDayIndex = (tradeDate.getDay() + 6) % 7;
        return tradeDayIndex === daysOfWeek.indexOf(day);
      });
      return processTradeGroup(day, dayTrades);
    });
    setDayStats(dayStats);
    const marketGroups = groupTradesByProperty(trades as Trade[], 'market');
    setMarketStats(processTradeGroups(marketGroups));
    const marketSlSizes = trades.reduce((acc: { [key: string]: number[] }, trade: Trade) => {
      const market = trade.market || 'Unknown';
      if (!acc[market]) {
        acc[market] = [];
      }
      if (trade.sl_size && !isNaN(trade.sl_size)) {
        acc[market].push(trade.sl_size);
      }
      return acc;
    }, {});
    const slStats = Object.entries(marketSlSizes).map(([market, slSizes]) => {
      const arr = slSizes as number[];
      return {
        market,
        averageSlSize: arr.length > 0
          ? Number((arr.reduce((a: number, b: number) => a + b, 0) / arr.length).toFixed(2))
          : 0
      };
    }).filter(stat => stat.averageSlSize > 0)
      .sort((a, b) => b.averageSlSize - a.averageSlSize);
    setSlSizeStats(slStats);
  };

  const calculateMonthlyStats = (trades: Trade[]) => {    
    // Filter trades for the selected year
    const yearTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.trade_date);
      return tradeDate.getFullYear() === selectedYear;
    });

    const monthlyData = yearTrades.reduce((acc: Record<string, MonthlyStats>, trade) => {
      const tradeDate = new Date(trade.trade_date);
      const month = tradeDate.toLocaleString('default', { month: 'long' });
      
      if (!acc[month]) {
        acc[month] = { wins: 0, losses: 0, winRate: 0, profit: 0 };
      }
      
      // Count all trades (including BE) for total trades
      if (trade.trade_outcome === 'Win') {
        acc[month].wins++;
      } else if (trade.trade_outcome === 'Lose') {
        acc[month].losses++;
      }
      
      // Calculate profit only from non-BE trades
      if (!trade.break_even) {
        const riskPerTrade = trade.risk_per_trade || 0.5;
        const riskAmount = (activeAccount?.account_balance || 0) * (riskPerTrade / 100);
        const riskRewardRatio = trade.risk_reward_ratio || 2;
        
        if (trade.trade_outcome === 'Win') {
          acc[month].profit += (riskAmount * riskRewardRatio);
        } else if (trade.trade_outcome === 'Lose') {
          acc[month].profit -= riskAmount;
        }
      }
      
      // Calculate win rate only from non-BE trades
      const nonBETrades = yearTrades.filter(t => !t.break_even && new Date(t.trade_date).toLocaleString('default', { month: 'long' }) === month);
      const nonBEWins = nonBETrades.filter(t => t.trade_outcome === 'Win').length;
      const nonBELosses = nonBETrades.filter(t => t.trade_outcome === 'Lose').length;
      const totalNonBE = nonBEWins + nonBELosses;
      acc[month].winRate = totalNonBE > 0 ? (nonBEWins / totalNonBE) * 100 : 0;
      
      return acc;
    }, {});
        
    // Find best and worst months based on profit
    const monthsWithTrades = Object.entries(monthlyData).filter(([_, stats]) => stats.wins + stats.losses > 0);
    
    if (monthsWithTrades.length > 0) {
      const bestMonth = monthsWithTrades.reduce((best, current) => {
        return current[1].profit > best[1].profit ? current : best;
      }, monthsWithTrades[0]);
      
      const worstMonth = monthsWithTrades.reduce((worst, current) => {
        return current[1].profit < worst[1].profit ? current : worst;
      }, monthsWithTrades[0]);
            
      setMonthlyStatsAllTrades(monthlyData);
      setMonthlyStats({
        bestMonth: { month: bestMonth[0], stats: bestMonth[1] },
        worstMonth: { month: worstMonth[0], stats: worstMonth[1] }
      });
    } else {
      setMonthlyStatsAllTrades({});
      setMonthlyStats({
        bestMonth: null,
        worstMonth: null
      });
    }
  };

  function isTimeInInterval(time: string, start: string, end: string): boolean {
    if (!time) return false;
    const [hours, minutes] = time.split(':').map(Number);
    const timeMinutes = hours * 60 + minutes;
    const [startHours, startMinutes] = start.split(':').map(Number);
    const startTimeMinutes = startHours * 60 + startMinutes;
    const [endHours, endMinutes] = end.split(':').map(Number);
    const endTimeMinutes = endHours * 60 + endMinutes;
    return timeMinutes >= startTimeMinutes && timeMinutes <= endTimeMinutes;
  }

  return {
    calendarMonthTrades,
    allTrades,
    filteredTrades,
    filteredTradesLoading,
    calendarTradesLoading,
    allTradesLoading,
    isLoadingTrades: allTradesLoading || filteredTradesLoading || calendarTradesLoading,
    stats,
    monthlyStats,
    monthlyStatsAllTrades,
    localHLStats,
    setupStats,
    liquidityStats,
    directionStats,
    reentryStats,
    breakEvenStats,
    mssStats,
    newsStats,
    dayStats,
    marketStats,
    slSizeStats,
  };
}