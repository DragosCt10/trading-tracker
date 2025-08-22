import { useState, useEffect, useMemo } from 'react';
import { Trade } from '@/types/trade';
import { AccountSettings } from '@/types/account-settings';
import { useUserDetails } from './useUserDetails';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { calculateMonthlyStats } from '@/utils/calculateMonthlyState';
import { calculateMacroStats } from '@/utils/calculateMacroStats';
import { calculateWinRates } from '@/utils/calculateWinRates';
import { calculateProfit } from '@/utils/calculateProfit';
import { calculateTradeCounts } from '@/utils/calculateTradeCounts';
import { calculateStreaks } from '@/utils/calculateStreaks';
import {
  calculateLiquidityStats,
  calculateSetupStats,
  calculateDirectionStats,
  calculateLocalHLStats,
  calculateIntervalStats,
  calculateSLSizeStats,
  calculateReentryStats,
  calculateBreakEvenStats,
  calculateMssStats,
  calculateNewsStats,
  calculateDayStats,
  calculateMarketStats,
} from '@/utils/calculateCategoryStats';
import {
  DayStats, 
  DirectionStats, 
  EvaluationStats, 
  IntervalStats, 
  LiquidityStats, 
  LocalHLStats, 
  MarketStats, 
  MonthlyStats,
  MonthlyStatsResult, 
  MssStats, 
  NewsStats,
  SetupStats, 
  SLSizeStats, 
  Stats, 
  TradeTypeStats } from '@/types/dashboard';
import { calculateEvaluationStats } from '@/utils/calculateEvaluationStats';


const TIME_INTERVALS = [
  { label: '< 10 a.m', start: '00:00', end: '09:59' },
  { label: '10 a.m - 12 p.m', start: '10:00', end: '11:59' },
  { label: '12 p.m - 16 p.m', start: '12:00', end: '16:59' },
  { label: '17 p.m - 21 p.m', start: '17:00', end: '20:59' },
] as const;

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
    quarter: trade.quarter,
    evaluation: trade.evaluation,
    rr_hit_1_4: trade.rr_hit_1_4,
    partials_taken: trade.partials_taken
  };
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
  selectedMarket,
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
  selectedMarket: string;
}) {
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
    averagePnLPercentage: 0,
    evaluationStats: [],
    winRateWithBE: 0,
    beWins: 0,
    beLosses: 0,
    currentStreak: 0,
    maxWinningStreak: 0,
    maxLosingStreak: 0
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStatsResult>({
    bestMonth: null,
    worstMonth: null,
    monthlyData: {}
  });
  const [monthlyStatsAllTrades, setMonthlyStatsAllTrades] = useState<Record<string, MonthlyStats>>({});
  const [localHLStats, setLocalHLStats] = useState<LocalHLStats>({
    lichidat: {
      wins: 0,
      losses: 0,
      winRate: 0,
      winsWithBE: 0,
      lossesWithBE: 0,
      winRateWithBE: 0
    },
    nelichidat: {
      wins: 0,
      losses: 0,
      winRate: 0,
      winsWithBE: 0,
      lossesWithBE: 0,
      winRateWithBE: 0
    }
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
  const [marketAllTradesStats, setMarketAllTradesStats] = useState<MarketStats[]>([]);
  const [slSizeStats, setSlSizeStats] = useState<SLSizeStats[]>([]);
  const [macroStats, setMacroStats] = useState({
    profitFactor: 0,
    consistencyScore: 0,
    consistencyScoreWithBE: 0,
    sharpeWithBE: 0,
  });
  const [evaluationStats, setEvaluationStats] = useState<EvaluationStats[]>([]);
  const [intervalStats, setIntervalStats] = useState<IntervalStats[]>([]);
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
      const limit = 500; // Initial batch size
      let offset = 0;
      let allTrades: Trade[] = [];
      let totalCount = 0;
    
      try {
        // First query to get total count and initial batch
        const initialQuery = supabase
          .from(`${mode}_trades`)
          .select('*', { count: 'exact' })
          .eq('user_id', session.user.id)
          .eq('account_id', activeAccount.id)
          .gte('trade_date', startDate)
          .lte('trade_date', endDate)
          .order('trade_date', { ascending: false })
          .range(offset, offset + limit - 1);

        const { data: initialData, error: initialError, count } = await initialQuery;

        if (initialError) {
          console.error('Supabase error:', initialError);
          throw initialError;
        }

        totalCount = count || 0;
        allTrades = initialData || [];

        // Start background fetch of remaining data
        if (totalCount > limit) {
          offset += limit;
          const fetchRemainingData = async () => {
            while (offset < totalCount) {
              const { data: moreData, error: fetchError } = await supabase
                .from(`${mode}_trades`)
                .select('*')
                .eq('user_id', session.user.id)
                .eq('account_id', activeAccount.id)
                .gte('trade_date', startDate)
                .lte('trade_date', endDate)
                .order('trade_date', { ascending: false })
                .range(offset, offset + limit - 1);

              if (fetchError) {
                console.error('Error fetching more data:', fetchError);
                break;
              }

              allTrades = allTrades.concat(moreData || []);
              offset += limit;
            }
          };

          // Start background fetch without awaiting
          fetchRemainingData();
        }

        // Transform Supabase data to match Trade type
        return allTrades.map(trade => mapSupabaseTradeToTrade(trade, mode));
      } catch (error) {
        console.error('Error in fetchTrades:', error);
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
      const limit = 500; // Initial batch size
      let offset = 0;
      let allTrades: Trade[] = [];
      let totalCount = 0;
      
      try {
        // First query to get total count and initial batch
        const initialQuery = supabase
          .from(`${mode}_trades`)
          .select('*', { count: 'exact' })
          .eq('user_id', session.user.id)
          .eq('account_id', activeAccount.id)
          .gte('trade_date', dateRange.startDate)
          .lte('trade_date', dateRange.endDate)
          .order('trade_date', { ascending: false })
          .range(offset, offset + limit - 1);

        const { data: initialData, error: initialError, count } = await initialQuery;

        if (initialError) {
          console.error('Supabase error:', initialError);
          throw initialError;
        }

        totalCount = count || 0;
        allTrades = initialData || [];

        // Start background fetch of remaining data
        if (totalCount > limit) {
          offset += limit;
          const fetchRemainingData = async () => {
            while (offset < totalCount) {
              const { data: moreData, error: fetchError } = await supabase
                .from(`${mode}_trades`)
                .select('*')
                .eq('user_id', session.user.id)
                .eq('account_id', activeAccount.id)
                .gte('trade_date', dateRange.startDate)
                .lte('trade_date', dateRange.endDate)
                .order('trade_date', { ascending: false })
                .range(offset, offset + limit - 1);

              if (fetchError) {
                console.error('Error fetching more data:', fetchError);
                break;
              }

              allTrades = allTrades.concat(moreData || []);
              offset += limit;
            }
          };

          // Start background fetch without awaiting
          fetchRemainingData();
        }

        // Transform Supabase data to match Trade type
        return allTrades.map(trade => mapSupabaseTradeToTrade(trade, mode));
      } catch (error) {
        console.error('Error in fetchTrades:', error);
        return [];
      }
    },
    enabled: !contextLoading && !isSessionLoading && !userLoading && !!session?.user?.id && !!activeAccount?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const calendarMonthTrades = useMemo(() => {
    if (!allTrades.length) return [];
    const { startDate, endDate } = calendarDateRange;
    return allTrades.filter(t =>
      t.trade_date >= startDate && t.trade_date <= endDate
    );
  }, [allTrades, calendarDateRange]);

  // Calculate monthly stats when all trades change or selected year changes
  useEffect(() => {
    if (allTrades.length > 0 && activeAccount?.account_balance != null) {
      const { monthlyData, bestMonth, worstMonth } = calculateMonthlyStats(
        allTrades,
        selectedYear,
        activeAccount.account_balance
      );

      const marketStats = calculateMarketStats(allTrades, activeAccount.account_balance);
      
      setMonthlyStatsAllTrades(monthlyData);
      setMonthlyStats({ bestMonth, worstMonth, monthlyData });
      setMarketAllTradesStats(marketStats);
    } else {
      // handle empty state
      setMonthlyStatsAllTrades({});
      setMonthlyStats({ bestMonth: null, worstMonth: null, monthlyData: {} });
      setMarketAllTradesStats([]);
    }
  }, [allTrades.length, selectedYear, activeAccount?.account_balance]);


  // Calculate macro stats when allTrades change
  useEffect(() => {
    if (allTrades?.length && activeAccount?.account_balance != null) {
      const macro = calculateMacroStats(allTrades, activeAccount.account_balance);
      setMacroStats(prev =>
        JSON.stringify(prev) !== JSON.stringify(macro) ? macro : prev
      );
    } else {
      setMacroStats({ profitFactor: 0, consistencyScore: 0, consistencyScoreWithBE: 0, sharpeWithBE: 0 });
    }
  }, [allTrades.length, activeAccount?.account_balance]);

  
  // Filter trades based on selected market
  const filteredTradesByMarket = useMemo(() => {
    if (selectedMarket === 'all') return filteredTrades;
    return filteredTrades.filter(trade => trade.market === selectedMarket);
  }, [filteredTrades, selectedMarket]);

  // Use filteredTradesByMarket instead of filteredTrades in all the calculations
  useEffect(() => {
    if (filteredTradesByMarket && filteredTradesByMarket.length > 0 && activeAccount?.account_balance != null) {
      const { winRate, winRateWithBE } = calculateWinRates(filteredTradesByMarket);
      const { totalProfit, averageProfit, averagePnLPercentage, maxDrawdown } = calculateProfit(
        filteredTradesByMarket,
        activeAccount.account_balance
      );
      const { totalTrades, totalWins, totalLosses, beWins, beLosses } = calculateTradeCounts(filteredTradesByMarket); 
      const evaluationStats = calculateEvaluationStats(filteredTradesByMarket);
      const { currentStreak, maxWinningStreak, maxLosingStreak } = calculateStreaks(filteredTradesByMarket);
      setEvaluationStats(evaluationStats);

      setStats(prev => ({ 
        ...prev, 
        winRate, 
        winRateWithBE, 
        totalProfit, 
        averageProfit, 
        averagePnLPercentage, 
        maxDrawdown, 
        totalTrades, 
        totalWins, 
        totalLosses, 
        beWins, 
        beLosses,
        currentStreak,
        maxWinningStreak,
        maxLosingStreak
      }));
    }
  }, [filteredTradesByMarket]);

  useEffect(() => {
    if (filteredTradesByMarket.length > 0 && activeAccount?.account_balance != null) {
      setLiquidityStats(calculateLiquidityStats(filteredTradesByMarket));
      setSetupStats(calculateSetupStats(filteredTradesByMarket));
      setDirectionStats(calculateDirectionStats(filteredTradesByMarket));
      setLocalHLStats(calculateLocalHLStats(filteredTradesByMarket));
      setIntervalStats(calculateIntervalStats(filteredTradesByMarket, TIME_INTERVALS));
      setSlSizeStats(calculateSLSizeStats(filteredTradesByMarket)); 
      setReentryStats(calculateReentryStats(filteredTradesByMarket));
      setBreakEvenStats(calculateBreakEvenStats(filteredTradesByMarket));
      setMssStats(calculateMssStats(filteredTradesByMarket));
      setNewsStats(calculateNewsStats(filteredTradesByMarket));
      setDayStats(calculateDayStats(filteredTradesByMarket));
      setMarketStats(calculateMarketStats(filteredTradesByMarket, activeAccount.account_balance));
    }
  }, [filteredTradesByMarket, activeAccount?.account_balance]);


  return {
    calendarMonthTrades,
    allTrades,
    filteredTrades: filteredTradesByMarket,
    filteredTradesLoading,
    allTradesLoading,
    isLoadingTrades: allTradesLoading || filteredTradesLoading,
    stats,
    monthlyStats,
    monthlyStatsAllTrades,
    localHLStats,
    setupStats,
    liquidityStats,
    directionStats,
    reentryStats,
    breakEvenStats,
    intervalStats,
    mssStats,
    newsStats,
    dayStats,
    marketStats,
    marketAllTradesStats,
    slSizeStats,
    macroStats,
    evaluationStats,
  };
}