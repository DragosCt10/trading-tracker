import { useState, useEffect, useMemo, useRef } from 'react';
import { Trade } from '@/types/trade';
import { AccountSettings } from '@/types/account-settings';
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
} from '@/types/dashboard';
import { calculateEvaluationStats } from '@/utils/calculateEvaluationStats';
import { calculateTradeQualityIndex } from '@/utils/calculateTradeQualityIndex';
import { calculateRRStats } from '@/utils/calculateRMultiple';
import { TIME_INTERVALS } from '@/constants/analytics';

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
  strategyId,
  viewMode,
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
  strategyId?: string | null;
  viewMode?: 'yearly' | 'dateRange';
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
    averageDrawdown: 0,
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
      winRateWithBE: 0,
      total: 0
    },
    nelichidat: {
      wins: 0,
      losses: 0,
      winRate: 0,
      winsWithBE: 0,
      lossesWithBE: 0,
      winRateWithBE: 0,
      total: 0
    }
  });
  const [setupStats, setSetupStats] = useState<SetupStats[]>([]);
  const [nonExecutedSetupStats, setNonExecutedSetupStats] = useState<SetupStats[]>([]);
  const [liquidityStats, setLiquidityStats] = useState<LiquidityStats[]>([]);
  const [nonExecutedLiquidityStats, setNonExecutedLiquidityStats] = useState<LiquidityStats[]>([]);
  const [directionStats, setDirectionStats] = useState<DirectionStats[]>([]);
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
  const queryEnabled = !!session?.user?.id && !!activeAccount?.id && !!selectedYear && !!mode;

  const {
    data: allTrades = [],
    isFetching: allTradesLoading,
  } = useQuery<Trade[]>({
    queryKey: ['allTrades', mode, activeAccount?.id, session?.user?.id, selectedYear, strategyId],
    queryFn: async () => {
      if (!session?.user?.id || !activeAccount?.id) {
        return [];
      }
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      try {
        const trades = await getFilteredTrades({
          userId: session.user.id,
          accountId: activeAccount.id,
          mode,
          startDate,
          endDate,
          strategyId,
        });
        return trades;
      } catch (err) {
        console.error('[useDashboardData] Error fetching allTrades:', err);
        return [];
      }
    },
    enabled: queryEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - reduces refetches while keeping data fresh
    gcTime: 5 * 60_000,
  });

  // Determine the date range to use for filtered trades based on viewMode
  const effectiveDateRange = useMemo(() => {
    if (viewMode === 'yearly') {
      // In yearly mode, use the full year boundaries
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
      };
    }
    // In dateRange mode, use the provided dateRange
    return dateRange;
  }, [viewMode, selectedYear, dateRange]);

  // Query for non-executed trades
  // OPTIMIZATION: In yearly mode, disable this query and derive from allTrades instead
  const {
    data: nonExecutedTradesFromQuery = [],
    isFetching: nonExecutedTradesLoading,
  } = useQuery<Trade[]>({
    queryKey: [
      'nonExecutedTrades',
      mode,
      activeAccount?.id,
      session?.user?.id,
      viewMode,
      effectiveDateRange.startDate,
      effectiveDateRange.endDate,
      strategyId,
    ],
    queryFn: async () => {
      if (!session?.user?.id || !activeAccount?.id) return [];
      try {
        return await getFilteredTrades({
          userId: session.user.id,
          accountId: activeAccount.id,
          mode,
          startDate: effectiveDateRange.startDate,
          endDate: effectiveDateRange.endDate,
          onlyNonExecuted: true,
          strategyId,
        });
      } catch (error) {
        console.error('Error fetching nonExecutedTrades:', error);
        return [];
      }
    },
    enabled:
      viewMode !== 'yearly' && // OPTIMIZATION: Disable in yearly mode - derive from allTrades instead
      !!session?.user?.id &&
      !!activeAccount?.id &&
      !!effectiveDateRange.startDate &&
      !!effectiveDateRange.endDate &&
      !!mode,
    staleTime: 2 * 60 * 1000, // 2 minutes - reduces refetches while keeping data fresh
    gcTime: 5 * 60_000,
  });

  // OPTIMIZATION: In yearly mode, derive non-executed trades from allTrades instead of making a network call
  const nonExecutedTradesData = useMemo(() => {
    if (viewMode === 'yearly') {
      // Derive from allTrades - eliminates duplicate network call
      return allTrades.filter(trade => trade.executed === false);
    }
    // In dateRange mode, use the query result
    return nonExecutedTradesFromQuery;
  }, [viewMode, allTrades, nonExecutedTradesFromQuery]);

  // Derive non-executed trades count from allTrades (eliminates duplicate query)
  // Since allTrades already contains all trades for the year, we can filter and count
  const nonExecutedTotalTradesCount = useMemo(() => {
    if (!allTrades || allTrades.length === 0) return 0;
    return allTrades.filter(trade => trade.executed === false).length;
  }, [allTrades]);
  
  // OPTIMIZATION: In yearly mode, use allTradesLoading since we derive from allTrades
  // In dateRange mode, use the query loading state
  const nonExecutedTotalTradesLoading = viewMode === 'yearly' 
    ? allTradesLoading 
    : nonExecutedTradesLoading;


  // Query for filtered trades based on viewMode:
  // - In yearly mode: reuse allTrades (no separate network call)
  // - In dateRange mode: fetch trades for the selected date range
  // OPTIMIZATION: In yearly mode, disable this query and reuse allTrades instead
  const {
    data: filteredTradesFromQuery = [],
    isFetching: filteredTradesLoading,
  } = useQuery<Trade[]>({
    queryKey: [
      'filteredTrades',
      mode,
      activeAccount?.id,
      session?.user?.id,
      viewMode,
      effectiveDateRange.startDate,
      effectiveDateRange.endDate,
      strategyId,
    ],
    queryFn: async () => {
      if (!session?.user?.id || !activeAccount?.id) return [];
      try {
        return await getFilteredTrades({
          userId: session.user.id,
          accountId: activeAccount.id,
          mode,
          startDate: effectiveDateRange.startDate,
          endDate: effectiveDateRange.endDate,
          strategyId,
        });
      } catch (error) {
        console.error('Error fetching filteredTrades:', error);
        return [];
      }
    },
    enabled: 
      viewMode !== 'yearly' && // OPTIMIZATION: Disable in yearly mode - reuse allTrades instead
      !!session?.user?.id && 
      !!activeAccount?.id && 
      !!effectiveDateRange.startDate && 
      !!effectiveDateRange.endDate,
    staleTime: 2 * 60 * 1000, // 2 minutes - reduces refetches while keeping data fresh
    gcTime: 5 * 60_000,
  });

  // OPTIMIZATION: In yearly mode, reuse allTrades instead of making a separate network call
  // Use JSON.stringify for stable comparison to prevent infinite loops
  const filteredTrades = useMemo(() => {
    if (viewMode === 'yearly') {
      // Reuse allTrades - eliminates duplicate network call
      return allTrades;
    }
    // In dateRange mode, use the query result
    return filteredTradesFromQuery;
  }, [viewMode, allTrades, filteredTradesFromQuery]);
  

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
  }, [allTrades, selectedYear, activeAccount?.account_balance]);


  // Calculate macro stats and risk stats when allTrades change
  useEffect(() => {
    if (allTrades?.length && activeAccount?.account_balance != null) {
      const macro = calculateMacroStats(allTrades, activeAccount.account_balance);
      const riskAnalysis = calculateRiskPerTradeStats(allTrades);
      
      setMacroStats(macro);
      setAllTradesRiskStats(riskAnalysis);
    } else {
      setMacroStats({ profitFactor: 0, consistencyScore: 0, consistencyScoreWithBE: 0, sharpeWithBE: 0, tradeQualityIndex: 0, multipleR: 0 });
      setAllTradesRiskStats(null);
    }
  }, [allTrades, activeAccount?.account_balance]);

  
  // Filter trades based on selected market - memoized to avoid recalculation
  const filteredTradesByMarket = useMemo(() => {
    if (selectedMarket === 'all') return filteredTrades;
    return filteredTrades.filter(trade => trade.market === selectedMarket);
  }, [filteredTrades, selectedMarket]);

  // Create a stable key for filteredTradesByMarket to prevent infinite loops
  // Use length and first/last trade IDs to detect actual data changes
  const filteredTradesKey = useMemo(() => {
    if (filteredTradesByMarket.length === 0) return 'empty';
    const firstId = filteredTradesByMarket[0]?.id;
    const lastId = filteredTradesByMarket[filteredTradesByMarket.length - 1]?.id;
    return `${filteredTradesByMarket.length}-${firstId}-${lastId}`;
  }, [filteredTradesByMarket]);

  // Use refs to track previous key and current trades to prevent infinite loops
  const prevFilteredTradesKeyRef = useRef<string>('');
  const filteredTradesByMarketRef = useRef<Trade[]>(filteredTradesByMarket);
  
  // Update ref whenever filteredTradesByMarket changes (but don't trigger effects)
  useEffect(() => {
    filteredTradesByMarketRef.current = filteredTradesByMarket;
  }, [filteredTradesByMarket]);

  // Calculate main stats when filtered trades change
  useEffect(() => {
    // Skip if the key hasn't actually changed (prevents infinite loops)
    if (filteredTradesKey === prevFilteredTradesKeyRef.current) {
      return;
    }
    prevFilteredTradesKeyRef.current = filteredTradesKey;

    // Use the ref value to avoid dependency on array reference
    const trades = filteredTradesByMarketRef.current;
    
    if (trades.length > 0 && activeAccount?.account_balance != null) {
      const { winRate, winRateWithBE } = calculateWinRates(trades);
      const { totalProfit, averageProfit, averagePnLPercentage, maxDrawdown } = calculateProfit(
        trades,
        activeAccount.account_balance
      );
      const { totalTrades, totalWins, totalLosses, beWins, beLosses } = calculateTradeCounts(trades); 
      const evaluationStats = calculateEvaluationStats(trades);
      const { currentStreak, maxWinningStreak, maxLosingStreak } = calculateStreaks(trades);
      const averageDaysBetweenTrades = calculateAverageDaysBetweenTrades(trades);
      const tradeQualityIndex = calculateTradeQualityIndex(trades);
      const multipleR = calculateRRStats(trades);
      const { 
        partialWinningTrades, 
        partialLosingTrades, 
        beWinPartialTrades,
        beLosingPartialTrades,
        partialWinRate, 
        partialWinRateWithBE, 
        totalPartialTradesCount, 
        totalPartialsBECount 
      } = calculatePartialTradesStats(trades);
      setEvaluationStats(evaluationStats);

      setStats(prev => ({ 
        ...prev, 
        winRate, 
        winRateWithBE, 
        totalProfit, 
        averageProfit, 
        averagePnLPercentage, 
        maxDrawdown,
        averageDrawdown: 0, // Calculated in StrategyClient's filteredStats instead
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
      // Reset stats when no filtered trades
      const clearedStats: Stats = {
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        totalProfit: 0,
        averageProfit: 0,
        intervalStats: {} as Record<string, IntervalStats>,
        maxDrawdown: 0,
        averageDrawdown: 0,
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
      };
      setStats(clearedStats);
      setEvaluationStats([]);
    }
  }, [filteredTradesKey, activeAccount?.account_balance]);

  // Create a stable key for nonExecutedTradesData to prevent infinite loops
  const nonExecutedTradesKey = useMemo(() => {
    if (!nonExecutedTradesData || nonExecutedTradesData.length === 0) return 'empty';
    const firstId = nonExecutedTradesData[0]?.id;
    const lastId = nonExecutedTradesData[nonExecutedTradesData.length - 1]?.id;
    return `${nonExecutedTradesData.length}-${firstId}-${lastId}`;
  }, [nonExecutedTradesData]);

  // Use refs to track previous key and current trades to prevent infinite loops
  const prevNonExecutedTradesKeyRef = useRef<string>('');
  const nonExecutedTradesDataRef = useRef<Trade[]>(nonExecutedTradesData);
  
  // Update ref whenever nonExecutedTradesData changes (but don't trigger effects)
  useEffect(() => {
    nonExecutedTradesDataRef.current = nonExecutedTradesData;
  }, [nonExecutedTradesData]);

  // Calculate non-executed setup stats when nonExecutedTradesData changes
  useEffect(() => {
    // Skip if the key hasn't actually changed (prevents infinite loops)
    if (nonExecutedTradesKey === prevNonExecutedTradesKeyRef.current) {
      return;
    }
    prevNonExecutedTradesKeyRef.current = nonExecutedTradesKey;

    // Reset stats if no account balance
    if (!activeAccount?.account_balance) {
      setNonExecutedSetupStats([]);
      setNonExecutedLiquidityStats([]);
      setNonExecutedMarketStats([]);
      return;
    }

    // Use the ref value to avoid dependency on array reference
    const nonExecutedTrades = nonExecutedTradesDataRef.current;
    if (nonExecutedTrades?.length > 0) {
      setNonExecutedSetupStats(calculateSetupStats(nonExecutedTrades));
      setNonExecutedLiquidityStats(calculateLiquidityStats(nonExecutedTrades));
      setNonExecutedMarketStats(calculateMarketStats(nonExecutedTrades, activeAccount.account_balance));
    } else {
      setNonExecutedSetupStats([]);
      setNonExecutedLiquidityStats([]);
      setNonExecutedMarketStats([]);
    }
  }, [nonExecutedTradesKey, activeAccount?.account_balance]);

  // Use ref to track previous category stats key and prevent infinite loops
  const prevCategoryStatsKeyRef = useRef<string>('');

  // Calculate category stats when filtered trades change
  useEffect(() => {
    // Skip if the key hasn't actually changed (prevents infinite loops)
    if (filteredTradesKey === prevCategoryStatsKeyRef.current) {
      return;
    }
    prevCategoryStatsKeyRef.current = filteredTradesKey;

    // Use the ref value to avoid dependency on array reference
    const trades = filteredTradesByMarketRef.current;
    
    if (trades.length === 0 || activeAccount?.account_balance == null) {
      // Clear all derived category datasets when empty
      const emptyLocalHL: LocalHLStats = {
        lichidat: { 
          wins: 0, 
          losses: 0, 
          winRate: 0, 
          winsWithBE: 0, 
          lossesWithBE: 0, 
          winRateWithBE: 0, 
          total: 0 
        },
        nelichidat: { 
          wins: 0, 
          losses: 0, 
          winRate: 0, 
          winsWithBE: 0, 
          lossesWithBE: 0, 
          winRateWithBE: 0, 
          total: 0 
        },
      };
      setLiquidityStats([]);
      setSetupStats([]);
      setDirectionStats([]);
      setLocalHLStats(emptyLocalHL);
      setIntervalStats([]);
      setSlSizeStats([]);
      setMssStats([]);
      setNewsStats([]);
      setDayStats([]);
      setMarketStats([]);
      setRiskStats(null);
      return;
    }

    // Calculate all category stats in one pass
    setLiquidityStats(calculateLiquidityStats(trades));
    setSetupStats(calculateSetupStats(trades));
    setDirectionStats(calculateDirectionStats(trades));
    setLocalHLStats(calculateLocalHLStats(trades));
    setIntervalStats(calculateIntervalStats(trades, TIME_INTERVALS));
    setSlSizeStats(calculateSLSizeStats(trades));
    setMssStats(calculateMssStats(trades));
    setNewsStats(calculateNewsStats(trades));
    setDayStats(calculateDayStats(trades));
    setMarketStats(calculateMarketStats(trades, activeAccount.account_balance));
    setRiskStats(calculateRiskPerTradeStats(trades));
  }, [filteredTradesKey, activeAccount?.account_balance]);

  return {
    calendarMonthTrades,
    allTrades,
    filteredTrades: filteredTradesByMarket,
    // OPTIMIZATION: In yearly mode, filteredTradesLoading is false since we reuse allTrades
    filteredTradesLoading: viewMode === 'yearly' ? false : filteredTradesLoading,
    allTradesLoading,
    // OPTIMIZATION: In yearly mode, only check allTradesLoading since filteredTrades and nonExecutedTrades are derived
    isLoadingTrades: viewMode === 'yearly' 
      ? allTradesLoading 
      : (allTradesLoading || filteredTradesLoading || nonExecutedTradesLoading),
    stats,
    monthlyStats,
    monthlyStatsAllTrades,
    localHLStats,
    setupStats,
    nonExecutedSetupStats,
    liquidityStats,
    nonExecutedLiquidityStats,
    directionStats,
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
    nonExecutedTotalTradesLoading, // OPTIMIZATION: In yearly mode, uses allTradesLoading; in dateRange mode, uses query loading
    // OPTIMIZATION: In yearly mode, nonExecutedTradesLoading is false since we derive from allTrades
    nonExecutedTradesLoading: viewMode === 'yearly' ? false : nonExecutedTradesLoading,
    yearlyPartialTradesCount,
    yearlyPartialsBECount,
    riskStats,
    allTradesRiskStats,
  };
}