import { Trade } from '@/types/trade';
import { AccountSettings } from '@/types/account-settings';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getCalendarTrades } from '@/lib/server/dashboardStats';
import { queryKeys } from '@/lib/queryKeys';
import { TRADES_DATA, STATIC_DATA } from '@/constants/queryConfig';

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
  /** Execution filter forwarded to server so stats reflect the selected view. */
  selectedExecution?: 'all' | 'executed' | 'nonExecuted';
}) {
  const userId = session?.user?.id as string | undefined;
  const accountId = activeAccount?.id as string | undefined;
  const accountBalance = activeAccount?.account_balance ?? 0;
  const resolvedViewMode = viewMode ?? 'dateRange';

  const statsEnabled =
    !!userId && !!accountId && !!selectedYear && !!mode && !contextLoading && !isSessionLoading;

  // ── Query 1: all dashboard stats (server-computed, filter-aware) ──────────
  const {
    data: dashboardStats,
    isFetching: statsLoading,
  } = useQuery({
    queryKey: queryKeys.dashboardStats(
      mode, accountId, userId, strategyId,
      selectedYear, resolvedViewMode,
      dateRange.startDate, dateRange.endDate,
      selectedMarket, selectedExecution
    ),
    queryFn: async () => {
      if (!userId || !accountId) return null;
      return getDashboardStats({
        userId,
        accountId,
        mode,
        strategyId,
        selectedYear,
        viewMode: resolvedViewMode,
        dateRange,
        accountBalance,
        selectedMarket,
        selectedExecution,
      });
    },
    enabled: statsEnabled,
    ...TRADES_DATA,
  });

  // ── Query 2: calendar trades for the visible month ────────────────────────
  const {
    data: calendarTrades = [],
    isFetching: calendarLoading,
  } = useQuery<Trade[]>({
    queryKey: queryKeys.calendarTrades(
      mode, accountId, userId, strategyId,
      calendarDateRange.startDate, calendarDateRange.endDate
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
    ...STATIC_DATA, // calendar month data doesn't change mid-session
  });

  // ── Derive earliest trade date ───────────────────────────────────────────
  const earliestTradeDate = dashboardStats?.earliestTradeDate ?? null;

  return {
    // Stats (pre-computed server-side)
    stats: dashboardStats?.stats ?? null,
    monthlyStats: dashboardStats?.monthlyStats ?? null,
    monthlyStatsAllTrades: dashboardStats?.monthlyStatsAllTrades ?? {},
    localHLStats: dashboardStats?.localHLStats ?? null,
    setupStats: dashboardStats?.setupStats ?? [],
    nonExecutedSetupStats: dashboardStats?.nonExecutedSetupStats ?? [],
    liquidityStats: dashboardStats?.liquidityStats ?? [],
    nonExecutedLiquidityStats: dashboardStats?.nonExecutedLiquidityStats ?? [],
    directionStats: dashboardStats?.directionStats ?? [],
    intervalStats: dashboardStats?.intervalStats ?? [],
    mssStats: dashboardStats?.mssStats ?? [],
    newsStats: dashboardStats?.newsStats ?? [],
    dayStats: dashboardStats?.dayStats ?? [],
    marketStats: dashboardStats?.marketStats ?? [],
    nonExecutedMarketStats: dashboardStats?.nonExecutedMarketStats ?? [],
    marketAllTradesStats: dashboardStats?.marketAllTradesStats ?? [],
    slSizeStats: dashboardStats?.slSizeStats ?? [],
    macroStats: dashboardStats?.macroStats ?? null,
    evaluationStats: dashboardStats?.evaluationStats ?? [],
    riskStats: dashboardStats?.riskStats ?? null,
    allTradesRiskStats: dashboardStats?.allTradesRiskStats ?? null,
    yearlyPartialTradesCount: dashboardStats?.yearlyPartialTradesCount ?? 0,
    yearlyPartialsBECount: dashboardStats?.yearlyPartialsBECount ?? 0,
    nonExecutedTotalTradesCount: dashboardStats?.nonExecutedTotalTradesCount ?? 0,
    tradeMonths: dashboardStats?.tradeMonths ?? [],
    earliestTradeDate,
    // Inline-computed stats (reentry, breakEven, trend) — previously in StrategyClient useMemos
    reentryStats: dashboardStats?.reentryStats ?? [],
    breakEvenStats: dashboardStats?.breakEvenStats ?? [],
    trendStats: dashboardStats?.trendStats ?? [],

    // Calendar trades (full Trade[] for the visible month only)
    calendarMonthTrades: calendarTrades,

    // Loading states
    isLoadingStats: statsLoading,
    isLoadingCalendar: calendarLoading,
    isLoadingTrades: statsLoading,
    // Keep legacy names so StrategyClient props don't break immediately
    allTradesLoading: statsLoading,
    filteredTradesLoading: statsLoading,
    nonExecutedTradesLoading: false,
    nonExecutedTotalTradesLoading: statsLoading,
  };
}
