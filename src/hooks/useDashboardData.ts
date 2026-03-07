'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCalendarTrades } from '@/lib/server/dashboardStats';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA, STATIC_DATA } from '@/constants/queryConfig';
import { computeStatsFromTrades } from '@/utils/computeStatsFromTrades';
import type { Trade } from '@/types/trade';
import type { AccountSettings } from '@/types/account-settings';
import type { DashboardApiResponse } from '@/types/dashboard-rpc';
import type { WorkerInput, WorkerOutput, WorkerResult } from '@/workers/dashboardStats.worker';
import type {
  Stats,
  MacroStats,
  MonthlyStatsResult,
  MonthlyStats,
  LocalHLStats,
  SetupStats,
  LiquidityStats,
  DirectionStats,
  IntervalStats,
  DayStats,
  MarketStats,
  MssStats,
  NewsStats,
  SLSizeStats,
  RiskAnalysis,
} from '@/types/dashboard';
import type { EvaluationStat } from '@/utils/calculateEvaluationStats';

// ── Map API response → local Stats type ──────────────────────────────────────

function mapApiToStats(api: DashboardApiResponse): Stats {
  return {
    totalTrades: api.core.totalTrades,
    totalWins: api.core.totalWins,
    totalLosses: api.core.totalLosses,
    winRate: api.core.winRate,
    winRateWithBE: api.core.winRateWithBE,
    totalProfit: api.core.totalProfit,
    averageProfit: api.core.averageProfit,
    averagePnLPercentage: api.core.averagePnLPercentage,
    maxDrawdown: api.maxDrawdown,
    averageDrawdown: 0,
    intervalStats: {} as Stats['intervalStats'],
    evaluationStats: [],
    beWins: api.core.beWins,
    beLosses: api.core.beLosses,
    currentStreak: api.currentStreak,
    maxWinningStreak: api.maxWinningStreak,
    maxLosingStreak: api.maxLosingStreak,
    averageDaysBetweenTrades: api.core.averageDaysBetweenTrades,
    partialWinningTrades: api.partials.partialWinningTrades,
    partialLosingTrades: api.partials.partialLosingTrades,
    partialBETrades: api.partials.partialBETrades,
    totalPartialTradesCount: api.partials.totalPartialTradesCount,
    totalPartialsBECount: api.partials.totalPartialsBECount,
    tradeQualityIndex: api.tradeQualityIndex,
    multipleR: api.multipleR,
  };
}

function mapApiToMacro(api: DashboardApiResponse): MacroStats {
  return {
    profitFactor: api.macro.profitFactor,
    consistencyScore: api.macro.consistencyScore,
    consistencyScoreWithBE: api.macro.consistencyScoreWithBE,
    sharpeWithBE: api.sharpeWithBE,
    tradeQualityIndex: api.tradeQualityIndex,
    multipleR: api.multipleR,
  };
}

function mapApiToMonthlyStats(api: DashboardApiResponse): MonthlyStatsResult {
  return {
    monthlyData: api.monthly_data as Record<string, MonthlyStats>,
    bestMonth: api.best_month as MonthlyStatsResult['bestMonth'],
    worstMonth: api.worst_month as MonthlyStatsResult['worstMonth'],
  };
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useDashboardData({
  session,
  dateRange,
  mode,
  activeAccount,
  contextLoading,
  isSessionLoading,
  calendarDateRange,
  selectedYear,
  selectedMarket,
  strategyId,
  viewMode,
  selectedExecution = 'executed',
}: {
  session: any;
  dateRange: { startDate: string; endDate: string };
  mode: string;
  activeAccount: AccountSettings | null;
  contextLoading: boolean;
  isSessionLoading: boolean;
  calendarDateRange: { startDate: string; endDate: string };
  selectedYear: number;
  selectedMarket: string;
  strategyId?: string | null;
  viewMode?: 'yearly' | 'dateRange';
  selectedExecution?: 'all' | 'executed' | 'nonExecuted';
}) {
  const userId = session?.user?.id as string | undefined;
  const accountId = activeAccount?.id as string | undefined;
  const accountBalance = activeAccount?.account_balance ?? 0;
  const resolvedViewMode = viewMode ?? 'dateRange';

  // Resolve effective date range (yearly mode ignores the dateRange prop)
  const effectiveStartDate = resolvedViewMode === 'yearly'
    ? `${selectedYear}-01-01`
    : dateRange.startDate;
  const effectiveEndDate = resolvedViewMode === 'yearly'
    ? `${selectedYear}-12-31`
    : dateRange.endDate;

  const statsEnabled =
    !!userId && !!accountId && !!selectedYear && !!mode && !contextLoading && !isSessionLoading;

  // ── Query 1: dashboard stats from /api/dashboard-stats ───────────────────
  const { data: apiData, isFetching: statsLoading } = useQuery<DashboardApiResponse | null>({
    queryKey: queryKeys.dashboardStats(
      mode, accountId, userId, strategyId,
      selectedYear, resolvedViewMode,
      effectiveStartDate, effectiveEndDate,
      selectedExecution,
    ),
    queryFn: async () => {
      if (!userId || !accountId) return null;
      const params = new URLSearchParams({
        accountId,
        mode,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        accountBalance: String(accountBalance),
        execution: selectedExecution,
        ...(strategyId ? { strategyId } : {}),
      });
      const res = await fetch(`/api/dashboard-stats?${params}`);
      if (!res.ok) throw new Error(`Dashboard stats fetch failed: ${res.status}`);
      return res.json() as Promise<DashboardApiResponse>;
    },
    enabled: statsEnabled,
    ...TRADES_DATA,
  });

  // ── Query 2: calendar trades for the visible month ────────────────────────
  const { data: calendarTrades = [], isFetching: calendarLoading } = useQuery<Trade[]>({
    queryKey: queryKeys.calendarTrades(
      mode, accountId, userId, strategyId,
      calendarDateRange.startDate, calendarDateRange.endDate,
    ),
    queryFn: async () => {
      if (!userId || !accountId) return [];
      return getCalendarTrades({
        userId, accountId, mode, strategyId,
        startDate: calendarDateRange.startDate,
        endDate: calendarDateRange.endDate,
      });
    },
    enabled: statsEnabled,
    ...STATIC_DATA,
  });

  // ── Web Worker for market-filtered stats (Layer 3) ────────────────────────
  const workerRef = useRef<Worker | null>(null);
  const [workerStats, setWorkerStats] = useState<WorkerResult | null>(null);
  const [workerLoading, setWorkerLoading] = useState(false);
  const requestIdRef = useRef(0);

  // Create the worker once (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    workerRef.current = new Worker(
      new URL('@/workers/dashboardStats.worker.ts', import.meta.url),
    );
    workerRef.current.onmessage = (e: MessageEvent<WorkerOutput>) => {
      if (e.data.requestId === String(requestIdRef.current)) {
        setWorkerStats(e.data.result);
        setWorkerLoading(false);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  // Trigger worker whenever market / base data / execution changes
  useEffect(() => {
    if (selectedMarket === 'all' || !apiData?.compact_trades?.length || !workerRef.current) {
      setWorkerStats(null);
      return;
    }
    const reqId = ++requestIdRef.current;
    setWorkerLoading(true);
    const msg: WorkerInput = {
      requestId: String(reqId),
      trades: apiData.compact_trades,
      accountBalance,
      market: selectedMarket,
      execution: selectedExecution,
    };
    workerRef.current.postMessage(msg);
  }, [selectedMarket, apiData, accountBalance, selectedExecution]);

  // ── Derive reentry/breakEven/trend stats from compact_trades (client-side) ─
  // These aren't produced by the SQL RPC, so we compute them from the compact_trades.
  const derivedStats = useMemo(() => {
    if (!apiData?.compact_trades?.length) return null;
    let ct = apiData.compact_trades;
    if (selectedExecution === 'executed') ct = ct.filter(t => t.executed);
    else if (selectedExecution === 'nonExecuted') ct = ct.filter(t => !t.executed);
    if (selectedMarket !== 'all') ct = ct.filter(t => t.market === selectedMarket);
    return computeStatsFromTrades(ct as unknown as Trade[]);
  }, [apiData?.compact_trades, selectedExecution, selectedMarket]);

  // ── Resolve final stats: worker overrides API when market is filtered ──────
  const useWorker = selectedMarket !== 'all' && !!workerStats;
  const isLoading = statsLoading || (selectedMarket !== 'all' && workerLoading);

  // Stats
  const stats = useWorker
    ? workerStats.stats
    : apiData ? mapApiToStats(apiData) : null;

  const macroStats = useWorker
    ? workerStats.macroStats
    : apiData ? mapApiToMacro(apiData) : null;

  const setupStats = useWorker
    ? workerStats.setupStats as SetupStats[]
    : (apiData?.setup_stats ?? []) as SetupStats[];

  const liquidityStats = useWorker
    ? workerStats.liquidityStats as LiquidityStats[]
    : (apiData?.liquidity_stats ?? []) as LiquidityStats[];

  const directionStats = useWorker
    ? workerStats.directionStats as DirectionStats[]
    : (apiData?.direction_stats ?? []) as DirectionStats[];

  const intervalStats = useWorker
    ? workerStats.intervalStats as IntervalStats[]
    : (apiData?.interval_stats ?? []) as IntervalStats[];

  const mssStats = useWorker
    ? workerStats.mssStats as MssStats[]
    : (apiData?.mss_stats ?? []) as MssStats[];

  const newsStats = useWorker
    ? workerStats.newsStats as NewsStats[]
    : (apiData?.news_stats ?? []) as NewsStats[];

  const dayStats = useWorker
    ? workerStats.dayStats as DayStats[]
    : (apiData?.day_stats ?? []) as DayStats[];

  const marketStats = useWorker
    ? workerStats.marketStats as MarketStats[]
    : (apiData?.market_stats ?? []) as MarketStats[];

  const slSizeStats = useWorker
    ? workerStats.slSizeStats as SLSizeStats[]
    : (apiData?.sl_size_stats ?? []) as SLSizeStats[];

  const localHLStats = useWorker
    ? workerStats.localHLStats as LocalHLStats
    : (apiData?.local_hl_stats ?? null) as LocalHLStats | null;

  const evaluationStats = useWorker
    ? workerStats.evaluationStats as EvaluationStat[]
    : (apiData?.evaluation_stats ?? []) as EvaluationStat[];

  const riskStats = useWorker
    ? workerStats.riskStats
    : (apiData?.risk_analysis ?? null) as RiskAnalysis | null;

  // Monthly stats always come from the API (not market-filtered)
  const monthlyStats = apiData ? mapApiToMonthlyStats(apiData) : null;

  // non-executed reference stats always from API
  const nonExecutedStats = apiData?.nonExecutedStats;
  const nonExecutedSetupStats = (nonExecutedStats?.setup_stats ?? []) as SetupStats[];
  const nonExecutedLiquidityStats = (nonExecutedStats?.liquidity_stats ?? []) as LiquidityStats[];
  const nonExecutedMarketStats = (nonExecutedStats?.market_stats ?? []) as MarketStats[];

  return {
    // Core stats
    stats,
    monthlyStats,
    monthlyStatsAllTrades: apiData?.monthly_data as Record<string, MonthlyStats> ?? {},
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
    marketAllTradesStats: marketStats, // simplified: same range (no separate full-year call)
    slSizeStats,
    macroStats,
    evaluationStats,
    riskStats,
    allTradesRiskStats: riskStats,     // simplified: same as riskStats
    yearlyPartialTradesCount: apiData?.partials.totalPartialTradesCount ?? 0,
    yearlyPartialsBECount: apiData?.partials.totalPartialsBECount ?? 0,
    nonExecutedTotalTradesCount: apiData?.nonExecutedTotalTradesCount ?? 0,
    tradeMonths: apiData?.tradeMonths ?? [],
    earliestTradeDate: apiData?.earliestTradeDate ?? null,

    // Reentry / breakEven / trend — derived from compact_trades on the client
    reentryStats: derivedStats?.reentryStats ?? [],
    breakEvenStats: derivedStats?.breakEvenStats ?? [],
    trendStats: derivedStats?.trendStats ?? [],

    // Trade arrays for components that need raw Trade[] — computed from compact_trades.
    // CompactTrade covers most Trade fields; extra-card-specific fields (confidence_level,
    // mind_state, news_name, displacement_size, fvg_size) will be undefined.
    allTrades: (apiData?.compact_trades ?? []) as unknown as Trade[],
    filteredTrades: (apiData?.compact_trades ?? []) as unknown as Trade[],
    nonExecutedTrades: ((apiData?.compact_trades ?? []).filter((t) => !t.executed)) as unknown as Trade[],

    // Calendar trades
    calendarMonthTrades: calendarTrades,

    // Loading states
    isLoadingStats: isLoading,
    isLoadingCalendar: calendarLoading,
    isLoadingTrades: isLoading,
    allTradesLoading: isLoading,
    filteredTradesLoading: isLoading,
    nonExecutedTradesLoading: false,
    nonExecutedTotalTradesLoading: isLoading,
  };
}
