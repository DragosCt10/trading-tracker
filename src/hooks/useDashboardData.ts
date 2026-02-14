import { useState, useEffect, useMemo } from 'react';
import { Trade } from '@/types/trade';
import { AccountSettings } from '@/types/account-settings';
import { useUserDetails } from './useUserDetails';
import { useQuery } from '@tanstack/react-query';
import { getFilteredTrades } from '@/lib/server/trades';
import { calculateMonthlyStats } from '@/utils/calculateMonthlyState';
import { calculateMacroStats } from '@/utils/calculateMacroStats';
import { calculateWinRates } from '@/utils/calculateWinRates';
import { calculateProfit } from '@/utils/calculateProfit';
import { calculateTradeCounts } from '@/utils/calculateTradeCounts';
import { calculateStreaks } from '@/utils/calculateStreaks';
import { calculateAverageDaysBetweenTrades } from '@/utils/calculateAverageDaysBetweenTrades';
import { calculatePartialTradesStats } from '@/utils/calculatePartialTradesStats';
import { calculateRiskPerTradeStats } from '@/utils/calculateRiskPerTrade';
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
  RiskAnalysis,
  SetupStats, 
  SLSizeStats, 
  Stats, 
  TradeTypeStats } from '@/types/dashboard';
import { calculateEvaluationStats } from '@/utils/calculateEvaluationStats';
import { calculateTradeQualityIndex } from '@/utils/calculateTradeQualityIndex';
import { calculateRRStats } from '@/utils/calculateRMultiple';


const TIME_INTERVALS = [
  { label: '< 10 a.m', start: '00:00', end: '09:59' },
  { label: '10 a.m - 12 p.m', start: '10:00', end: '11:59' },
  { label: '12 p.m - 16 p.m', start: '12:00', end: '16:59' },
  { label: '17 p.m - 21 p.m', start: '17:00', end: '20:59' },
] as const;

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
    maxLosingStreak: 0,
    averageDaysBetweenTrades: 0,
    partialWinningTrades: 0,
    partialLosingTrades: 0,
    beWinPartialTrades: 0,
    beLosingPartialTrades: 0,
    partialWinRate: 0,
    partialWinRateWithBE: 0,
    totalPartialTradesCount: 0,
    totalPartialsBECount: 0,
    tradeQualityIndex: 0,
    multipleR: 0
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
  const [nonExecutedSetupStats, setNonExecutedSetupStats] = useState<SetupStats[]>([]);
  const [liquidityStats, setLiquidityStats] = useState<LiquidityStats[]>([]);
  const [nonExecutedLiquidityStats, setNonExecutedLiquidityStats] = useState<LiquidityStats[]>([]);
  const [directionStats, setDirectionStats] = useState<DirectionStats[]>([]);
  const [reentryStats, setReentryStats] = useState<TradeTypeStats[]>([]);
  const [breakEvenStats, setBreakEvenStats] = useState<TradeTypeStats[]>([]);
  const [mssStats, setMssStats] = useState<MssStats[]>([]);
  const [newsStats, setNewsStats] = useState<NewsStats[]>([]);
  const [dayStats, setDayStats] = useState<DayStats[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats[]>([]);
  const [nonExecutedMarketStats, setNonExecutedMarketStats] = useState<MarketStats[]>([]);
  const [marketAllTradesStats, setMarketAllTradesStats] = useState<MarketStats[]>([]);
  const [yearlyPartialTradesCount, setYearlyPartialTradesCount] = useState<number>(0);
  const [yearlyPartialsBECount, setYearlyPartialsBECount] = useState<number>(0);
  const [slSizeStats, setSlSizeStats] = useState<SLSizeStats[]>([]);
  const [macroStats, setMacroStats] = useState({
    profitFactor: 0,
    consistencyScore: 0,
    consistencyScoreWithBE: 0,
    sharpeWithBE: 0,
    tradeQualityIndex: 0,
    multipleR: 0
  });
  const [riskStats, setRiskStats] = useState<RiskAnalysis | null>(null);
  const [allTradesRiskStats, setAllTradesRiskStats] = useState<RiskAnalysis | null>(null);
  const [evaluationStats, setEvaluationStats] = useState<EvaluationStats[]>([]);
  const [intervalStats, setIntervalStats] = useState<IntervalStats[]>([]);
  // Query for all trades in the selected year (only used for monthly stats)
  const {
    data: allTrades = [],
    isFetching: allTradesLoading,
  } = useQuery<Trade[]>({
    queryKey: ['allTrades', mode, activeAccount?.id, session?.user?.id, selectedYear],
    queryFn: async () => {
      if (!session?.user?.id || !activeAccount?.id) return [];
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      try {
        return await getFilteredTrades({
          userId: session.user.id,
          accountId: activeAccount.id,
          mode,
          startDate,
          endDate,
        });
      } catch (err) {
        console.error('Error fetching allTrades:', err);
        return [];
      }
    },
    enabled: !!session?.user?.id && !!activeAccount?.id && !!selectedYear && !!mode,
    staleTime: 0,
    gcTime: 5 * 60_000,
  });

  // Query for non-executed trades
  const {
    data: nonExecutedTradesData = [],
    isFetching: nonExecutedTradesLoading,
  } = useQuery<Trade[]>({
    queryKey: [
      'nonExecutedTrades',
      mode,
      activeAccount?.id,
      session?.user?.id,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async () => {
      if (!session?.user?.id || !activeAccount?.id) return [];
      try {
        return await getFilteredTrades({
          userId: session.user.id,
          accountId: activeAccount.id,
          mode,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          onlyNonExecuted: true,
        });
      } catch (error) {
        console.error('Error fetching nonExecutedTrades:', error);
        return [];
      }
    },
    enabled:
      !!session?.user?.id &&
      !!activeAccount?.id &&
      !!dateRange.startDate &&
      !!dateRange.endDate &&
      !!mode,
    staleTime: 0,
    gcTime: 5 * 60_000,
  });

  // Query to count all non-executed trades from the current year
  const {
    data: nonExecutedTotalTradesCount = 0,
    isFetching: nonExecutedTotalTradesLoading,
  } = useQuery<number>({
    queryKey: [
      'nonExecutedTotalTradesCount',
      mode,
      activeAccount?.id,
      session?.user?.id,
      selectedYear,
    ],
    queryFn: async () => {
      if (!session?.user?.id || !activeAccount?.id) return 0;
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;
      try {
        const trades = await getFilteredTrades({
          userId: session.user.id,
          accountId: activeAccount.id,
          mode,
          startDate: startOfYear,
          endDate: endOfYear,
          onlyNonExecuted: true,
        });
        return trades.length;
      } catch (error) {
        console.error('Error counting non-executed trades:', error);
        return 0;
      }
    },
    enabled: !!session?.user?.id && !!activeAccount?.id && !!selectedYear && !!mode,
    staleTime: 0,
    gcTime: 5 * 60_000,
  });


  // Query for filtered trades based on date range (independent of year selection)
  const {
    data: filteredTrades = [],
    isFetching: filteredTradesLoading,
  } = useQuery<Trade[]>({
    queryKey: [
      'filteredTrades',
      mode,
      activeAccount?.id,
      session?.user?.id,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async () => {
      if (!session?.user?.id || !activeAccount?.id) return [];
      try {
        return await getFilteredTrades({
          userId: session.user.id,
          accountId: activeAccount.id,
          mode,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });
      } catch (error) {
        console.error('Error fetching filteredTrades:', error);
        return [];
      }
    },
    enabled: !!session?.user?.id && !!activeAccount?.id && !!dateRange.startDate && !!dateRange.endDate,
    staleTime: 0,
    gcTime: 5 * 60_000,
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
      const { totalPartialTradesCount, totalPartialsBECount } = calculatePartialTradesStats(allTrades);
      
      setMonthlyStatsAllTrades(monthlyData);
      setMonthlyStats({ bestMonth, worstMonth, monthlyData });
      setMarketAllTradesStats(marketStats);
      setYearlyPartialTradesCount(totalPartialTradesCount);
      setYearlyPartialsBECount(totalPartialsBECount);
    } else {
      // handle empty state
      setMonthlyStatsAllTrades({});
      setMonthlyStats({ bestMonth: null, worstMonth: null, monthlyData: {} });
      setMarketAllTradesStats([]);
      setYearlyPartialTradesCount(0);
    }
  }, [allTrades.length, selectedYear, activeAccount?.account_balance]);


  // Calculate macro stats and risk stats when allTrades change
  useEffect(() => {
    if (allTrades?.length && activeAccount?.account_balance != null) {
      const macro = calculateMacroStats(allTrades, activeAccount.account_balance);
      const riskAnalysis = calculateRiskPerTradeStats(allTrades);
      
      setMacroStats(prev =>
        JSON.stringify(prev) !== JSON.stringify(macro) ? macro : prev
      );
      setAllTradesRiskStats((prev: RiskAnalysis | null) =>
        JSON.stringify(prev) !== JSON.stringify(riskAnalysis) ? riskAnalysis : prev
      );
    } else {
      setMacroStats({ profitFactor: 0, consistencyScore: 0, consistencyScoreWithBE: 0, sharpeWithBE: 0, tradeQualityIndex: 0, multipleR: 0 });
      setAllTradesRiskStats(null);
    }
  }, [allTrades.length, activeAccount?.account_balance]);

  
  // Filter trades based on selected market
  const filteredTradesByMarket = selectedMarket === 'all'
    ? filteredTrades
    : filteredTrades.filter(trade => trade.market === selectedMarket);

  // Use filteredTradesByMarket instead of filteredTrades in all the calculations
  useEffect(() => {
    const filtered = selectedMarket === 'all' ? filteredTrades : filteredTrades.filter(t => t.market === selectedMarket);
    if (filtered && filtered.length > 0 && activeAccount?.account_balance != null) {
      const { winRate, winRateWithBE } = calculateWinRates(filteredTradesByMarket);
      const { totalProfit, averageProfit, averagePnLPercentage, maxDrawdown } = calculateProfit(
        filtered,
        activeAccount.account_balance
      );
      const { totalTrades, totalWins, totalLosses, beWins, beLosses } = calculateTradeCounts(filtered); 
      const evaluationStats = calculateEvaluationStats(filtered);
      const { currentStreak, maxWinningStreak, maxLosingStreak } = calculateStreaks(filtered);
      const averageDaysBetweenTrades = calculateAverageDaysBetweenTrades(filtered);
      const tradeQualityIndex = calculateTradeQualityIndex(filtered);
      const multipleR = calculateRRStats(filtered)
      const { 
        partialWinningTrades, 
        partialLosingTrades, 
        beWinPartialTrades,
        beLosingPartialTrades,
        partialWinRate, 
        partialWinRateWithBE, 
        totalPartialTradesCount, 
        totalPartialsBECount 
      } = calculatePartialTradesStats(filtered);
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
        maxLosingStreak,
        averageDaysBetweenTrades,
        partialWinningTrades,
        partialLosingTrades,
        beWinPartialTrades,
        beLosingPartialTrades,
        partialWinRate,
        partialWinRateWithBE,
        totalPartialTradesCount,
        totalPartialsBECount,
        tradeQualityIndex,
        multipleR
      }));
    } else {
      // Reset stats when no filtered trades, but only if not already cleared
      setStats(prev => {
        const cleared = {
          ...prev,
          totalTrades: 0,
          totalWins: 0,
          totalLosses: 0,
          winRate: 0,
          totalProfit: 0,
          averageProfit: 0,
          maxDrawdown: 0,
          averagePnLPercentage: 0,
          winRateWithBE: 0,
          beWins: 0,
          beLosses: 0,
          currentStreak: 0,
          maxWinningStreak: 0,
          maxLosingStreak: 0,
          averageDaysBetweenTrades: 0,
          partialWinningTrades: 0,
          partialLosingTrades: 0,
          beWinPartialTrades: 0,
          beLosingPartialTrades: 0,
          partialWinRate: 0,
          partialWinRateWithBE: 0,
          totalPartialTradesCount: 0,
          totalPartialsBECount: 0,
          tradeQualityIndex: 0,
          multipleR: 0
        };
        return JSON.stringify(prev) === JSON.stringify(cleared) ? prev : cleared;
      });
      setEvaluationStats(prev => (prev.length === 0 ? prev : []));
    }
  }, [filteredTrades, selectedMarket, activeAccount?.account_balance]);

  // Calculate non-executed setup stats when nonExecutedTradesData changes
  useEffect(() => {
    // Reset stats if no account balance
    if (!activeAccount?.account_balance) {
      setNonExecutedSetupStats([]);
      setNonExecutedLiquidityStats([]);
      setNonExecutedMarketStats([]);
      return;
    }

    // Calculate stats if we have trades
    if (nonExecutedTradesData?.length > 0) {
      setNonExecutedSetupStats(calculateSetupStats(nonExecutedTradesData));
      setNonExecutedLiquidityStats(calculateLiquidityStats(nonExecutedTradesData));
      setNonExecutedMarketStats(calculateMarketStats(nonExecutedTradesData, activeAccount.account_balance));
    } else {
      setNonExecutedSetupStats([]);
      setNonExecutedLiquidityStats([]);
      setNonExecutedMarketStats([]);
    }
  }, [nonExecutedTradesData?.length, activeAccount?.account_balance]);

  useEffect(() => {
    const filtered = selectedMarket === 'all' ? filteredTrades : filteredTrades.filter(t => t.market === selectedMarket);
    if (filtered.length > 0 && activeAccount?.account_balance != null) {
      setLiquidityStats(calculateLiquidityStats(filtered)); 
      setSetupStats(calculateSetupStats(filtered));
      setDirectionStats(calculateDirectionStats(filtered));
      setLocalHLStats(calculateLocalHLStats(filtered));
      setIntervalStats(calculateIntervalStats(filtered, TIME_INTERVALS));
      setSlSizeStats(calculateSLSizeStats(filtered)); 
      setReentryStats(calculateReentryStats(filtered));
      setBreakEvenStats(calculateBreakEvenStats(filtered));
      setMssStats(calculateMssStats(filtered));
      setNewsStats(calculateNewsStats(filtered));
      setDayStats(calculateDayStats(filtered));
      setMarketStats(calculateMarketStats(filtered, activeAccount.account_balance));
      
      // Calculate risk stats for filtered trades
      const riskAnalysis = calculateRiskPerTradeStats(filtered);
      setRiskStats((prev: RiskAnalysis | null) =>
        JSON.stringify(prev) !== JSON.stringify(riskAnalysis) ? riskAnalysis : prev
      );
    } else {
      // Clear all derived category datasets when empty, but avoid redundant updates
      setLiquidityStats(prev => (prev.length === 0 ? prev : []));
      setSetupStats(prev => (prev.length === 0 ? prev : []));
      setDirectionStats(prev => (prev.length === 0 ? prev : []));
      setLocalHLStats(prev => {
        const cleared = {
          lichidat: { wins: 0, losses: 0, winRate: 0, winsWithBE: 0, lossesWithBE: 0, winRateWithBE: 0 },
          nelichidat: { wins: 0, losses: 0, winRate: 0, winsWithBE: 0, lossesWithBE: 0, winRateWithBE: 0 },
        };
        return JSON.stringify(prev) === JSON.stringify(cleared) ? prev : cleared;
      });
      setIntervalStats(prev => ((prev as any[]).length === 0 ? prev : ([] as any)));
      setSlSizeStats(prev => (prev.length === 0 ? prev : []));
      setReentryStats(prev => (prev.length === 0 ? prev : []));
      setBreakEvenStats(prev => (prev.length === 0 ? prev : []));
      setMssStats(prev => (prev.length === 0 ? prev : []));
      setNewsStats(prev => (prev.length === 0 ? prev : []));
      setDayStats(prev => (prev.length === 0 ? prev : []));
      setMarketStats(prev => (prev.length === 0 ? prev : []));
      setRiskStats(prev => (prev === null ? prev : null));
    }
  }, [filteredTrades, selectedMarket, activeAccount?.account_balance]);

  return {
    calendarMonthTrades,
    allTrades,
    filteredTrades: filteredTradesByMarket,
    filteredTradesLoading,
    allTradesLoading,
    isLoadingTrades: allTradesLoading || filteredTradesLoading || nonExecutedTradesLoading,
    stats,
    monthlyStats,
    monthlyStatsAllTrades,
    localHLStats,
    setupStats,
    nonExecutedSetupStats,
    liquidityStats,
    nonExecutedLiquidityStats,
    directionStats,
    reentryStats,
    breakEvenStats,
    intervalStats,
    mssStats,
    newsStats,
    dayStats,
    marketStats,
    nonExecutedMarketStats,
    marketAllTradesStats,
    slSizeStats,
    macroStats,
    evaluationStats,
    nonExecutedTrades: nonExecutedTradesData,
    nonExecutedTotalTradesCount,
    nonExecutedTradesLoading,
    yearlyPartialTradesCount,
    yearlyPartialsBECount,
    riskStats,
    allTradesRiskStats,
  };
}