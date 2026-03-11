'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { getCalendarTrades } from '@/lib/server/dashboardStats';
import { getFilteredTrades } from '@/lib/server/trades';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA, STATIC_DATA } from '@/constants/queryConfig';
import type { RpcReentryStat, RpcTrendStat } from '@/types/dashboard-rpc';
import type { Trade } from '@/types/trade';
import type { AccountSettings } from '@/types/account-settings';
import type { DashboardApiResponse } from '@/types/dashboard-rpc';
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
  includeCompactTrades,
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
  /** When true, the API includes compact_trades[] for extra cards that need raw trade fields.
   *  When false (default), series[] is used — much smaller payload. */
  includeCompactTrades?: boolean;
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

  // All-time queries (startDate = '2000-01-01') carry a 3-4 MB series[] payload for
  // large accounts. Skip series and fetch trades separately via getFilteredTrades so
  // aggregate stats arrive in < 1 s while trade-array components load concurrently.
  const isAllTimeRange = effectiveStartDate === '2000-01-01';

  const statsEnabled =
    !!userId && !!accountId && !!selectedYear && !!mode && !contextLoading && !isSessionLoading;

  // ── Query 1: dashboard stats from /api/dashboard-stats ───────────────────
  const { data: apiData, isFetching: statsLoading } = useQuery<DashboardApiResponse | null>({
    queryKey: queryKeys.dashboardStats(
      mode, accountId, userId, strategyId,
      selectedYear, resolvedViewMode,
      effectiveStartDate, effectiveEndDate,
      selectedExecution, selectedMarket,
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
        market: selectedMarket,
        ...(strategyId ? { strategyId } : {}),
        ...(includeCompactTrades ? { includeCompactTrades: 'true' } : {}),
        ...(isAllTimeRange ? { skipSeries: 'true' } : {}),
      });
      const res = await fetch(`/api/dashboard-stats?${params}`);
      if (!res.ok) throw new Error(`Dashboard stats fetch failed: ${res.status}`);
      return res.json() as Promise<DashboardApiResponse>;
    },
    enabled: statsEnabled,
    ...TRADES_DATA,
  });

  // ── Query 2 (all-time only): full Trade[] for equity curve, confidence cards, etc. ──
  // When isAllTimeRange, series[] is skipped in Query 1 to save 3-4 MB.
  // This query fills that gap — uses the same key the background prefetch in StrategyClient
  // seeds, so it's a cache hit most of the time.
  const { data: allTimeTrades = [], isFetching: allTimeTradesLoading } = useQuery<Trade[]>({
    queryKey: queryKeys.trades.filtered(
      mode, accountId, userId, 'dateRange',
      effectiveStartDate, effectiveEndDate,
      strategyId ?? null,
    ),
    queryFn: async () => {
      if (!userId || !accountId) return [];
      return getFilteredTrades({
        userId,
        accountId,
        mode,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        includeNonExecuted: true,
        strategyId,
      });
    },
    enabled: isAllTimeRange && statsEnabled,
    ...TRADES_DATA,
  });

  // ── Query 3: calendar trades for the visible month ────────────────────────
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

  // ── Prefetch adjacent calendar months in the background ─────────────────────
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!statsEnabled || !userId || !accountId || calendarLoading) return;
    const tradeMonths: string[] = apiData?.tradeMonths ?? [];
    if (!tradeMonths.length) return;

    const currentStart = new Date(calendarDateRange.startDate);

    const candidates = [subMonths(currentStart, 1), addMonths(currentStart, 1)];
    for (const candidate of candidates) {
      const ym = format(candidate, 'yyyy-MM');
      if (!tradeMonths.includes(ym)) continue;
      const start = format(startOfMonth(candidate), 'yyyy-MM-dd');
      const end = format(endOfMonth(candidate), 'yyyy-MM-dd');
      const key = queryKeys.calendarTrades(mode, accountId, userId, strategyId, start, end);
      if (queryClient.getQueryData(key) !== undefined) continue;
      queryClient.prefetchQuery({
        queryKey: key,
        queryFn: () => getCalendarTrades({ userId: userId!, accountId: accountId!, mode, strategyId, startDate: start, endDate: end }),
        ...STATIC_DATA,
      });
    }
  }, [calendarDateRange.startDate, calendarLoading, statsEnabled, userId, accountId, mode, strategyId, apiData?.tradeMonths, queryClient]);

  // ── Reentry / break-even / trend stats — now computed in the DB ────────────
  const reentryStatsFromApi = useMemo(() => {
    const raw = apiData?.reentry_stats ?? [];
    return raw.map((r: RpcReentryStat) => ({
      ...r,
      total: r.total,
      wins: r.wins,
      losses: r.losses,
      breakEven: r.breakEven,
      winRate: r.winRate,
      winRateWithBE: r.winRateWithBE,
    }));
  }, [apiData?.reentry_stats]);

  const breakEvenStatsFromApi = useMemo(() => {
    const b = apiData?.break_even_stats;
    if (!b) return [];
    const total = b.nonBeWins + b.nonBeLosses + b.beCount;
    return [{
      wins: b.nonBeWins,
      losses: b.nonBeLosses,
      breakEven: b.beCount,
      total,
      winRate: (b.nonBeWins + b.nonBeLosses) > 0 ? (b.nonBeWins / (b.nonBeWins + b.nonBeLosses)) * 100 : 0,
      winRateWithBE: total > 0 ? (b.nonBeWins / total) * 100 : 0,
    }];
  }, [apiData?.break_even_stats]);

  const trendStatsFromApi = useMemo(() => {
    return (apiData?.trend_stats ?? []) as RpcTrendStat[];
  }, [apiData?.trend_stats]);

  // ── Stable non-executed series ────────────────────────────────────────────
  const [stableNonExecSeries, setStableNonExecSeries] = useState<unknown[]>([]);

  useEffect(() => {
    if (!apiData) return;
    const series = apiData.compact_trades?.length
      ? apiData.compact_trades.filter((t) => !t.executed)
      : (apiData.nonExecutedStats?.series ?? []);
    setStableNonExecSeries(series);
  }, [apiData]);

  // ── Trade arrays ──────────────────────────────────────────────────────────
  // All-time range: series[] is skipped in Query 1; use allTimeTrades from Query 2.
  // Other ranges: use compact_trades (if extra cards enabled) or series[] from Query 1.
  const seriesFromApi = (apiData?.compact_trades?.length ? apiData.compact_trades : apiData?.series) ?? [];
  const tradeArray = isAllTimeRange ? allTimeTrades : seriesFromApi;
  const tradesLoading = isAllTimeRange ? allTimeTradesLoading : statsLoading;

  // ── Stats: always from API ────────────────────────────────────────────────
  const stats = apiData ? mapApiToStats(apiData) : null;
  const macroStats = apiData ? mapApiToMacro(apiData) : null;
  const setupStats = (apiData?.setup_stats ?? []) as SetupStats[];
  const liquidityStats = (apiData?.liquidity_stats ?? []) as LiquidityStats[];
  const directionStats = (apiData?.direction_stats ?? []) as DirectionStats[];
  const intervalStats = (apiData?.interval_stats ?? []) as IntervalStats[];
  const mssStats = (apiData?.mss_stats ?? []) as MssStats[];
  const newsStats = (apiData?.news_stats ?? []) as NewsStats[];
  const dayStats = (apiData?.day_stats ?? []) as DayStats[];
  const marketStats = (apiData?.market_stats ?? []) as MarketStats[];
  const slSizeStats = (apiData?.sl_size_stats ?? []) as SLSizeStats[];
  const localHLStats = (apiData?.local_hl_stats ?? null) as LocalHLStats | null;
  const evaluationStats = (apiData?.evaluation_stats ?? []) as EvaluationStat[];
  const riskStats = (apiData?.risk_analysis ?? null) as RiskAnalysis | null;

  const monthlyStats = apiData ? mapApiToMonthlyStats(apiData) : null;

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
    marketAllTradesStats: marketStats,
    slSizeStats,
    macroStats,
    evaluationStats,
    riskStats,
    allTradesRiskStats: riskStats,
    yearlyPartialTradesCount: apiData?.partials.totalPartialTradesCount ?? 0,
    yearlyPartialsBECount: apiData?.partials.totalPartialsBECount ?? 0,
    nonExecutedTotalTradesCount: apiData?.nonExecutedTotalTradesCount ?? 0,
    tradeMonths: apiData?.tradeMonths ?? (apiData?.trade_months ?? []),
    earliestTradeDate: apiData?.earliestTradeDate ?? (apiData?.earliest_trade_date ?? null),

    // Reentry / breakEven / trend — from the RPC
    reentryStats: reentryStatsFromApi,
    breakEvenStats: breakEvenStatsFromApi,
    trendStats: trendStatsFromApi,

    // Trade arrays — all-time uses separate query (no series in dashboardStats);
    // other ranges use compact_trades or series[] from dashboardStats.
    allTrades: tradeArray as unknown as Trade[],
    filteredTrades: tradeArray as unknown as Trade[],
    nonExecutedTrades: stableNonExecSeries as unknown as Trade[],

    // Calendar trades
    calendarMonthTrades: calendarTrades,

    // Loading states
    isLoadingStats: statsLoading,
    isLoadingCalendar: calendarLoading,
    isLoadingTrades: tradesLoading,
    allTradesLoading: tradesLoading,
    filteredTradesLoading: tradesLoading,
    nonExecutedTradesLoading: false,
    nonExecutedTotalTradesLoading: statsLoading,
  };
}
