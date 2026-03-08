'use server';

import { createClient } from '@/utils/supabase/server';
import { getFilteredTrades } from './trades';
import { Trade } from '@/types/trade';
import { TIME_INTERVALS } from '@/constants/analytics';

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
import { calculateEvaluationStats, type EvaluationStat } from '@/utils/calculateEvaluationStats';
import { calculateTradeQualityIndex } from '@/utils/calculateTradeQualityIndex';
import { calculateRRStats } from '@/utils/calculateRMultiple';
import { computeStatsFromTrades } from '@/utils/computeStatsFromTrades';
import {
  calculateProfitFactor,
  calculateConsistencyScore,
  calculateSharpeRatio,
} from '@/utils/analyticsCalculations';

// Month labels used for AccountOverviewCard / MonthlyPerformanceChart
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type MonthlyFullStat = {
  wins: number; losses: number; breakEven: number;
  winRate: number; winRateWithBE: number; profit: number;
};

export type FilteredMacroStats = {
  profitFactor: number;
  consistencyScore: number;
  consistencyScoreWithBE: number;
  sharpeWithBE: number;
  tradeQualityIndex: number;
  multipleR: number;
  nonExecutedTotalTradesCount: number;
  yearlyPartialTradesCount: number;
  yearlyPartialsBECount: number;
};

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


export type DashboardStatsResult = {
  stats: Stats;
  monthlyStats: MonthlyStatsResult;
  monthlyStatsAllTrades: Record<string, MonthlyStats>;
  localHLStats: LocalHLStats;
  setupStats: SetupStats[];
  nonExecutedSetupStats: SetupStats[];
  liquidityStats: LiquidityStats[];
  nonExecutedLiquidityStats: LiquidityStats[];
  directionStats: DirectionStats[];
  intervalStats: IntervalStats[];
  mssStats: MssStats[];
  newsStats: NewsStats[];
  dayStats: DayStats[];
  marketStats: MarketStats[];
  nonExecutedMarketStats: MarketStats[];
  marketAllTradesStats: MarketStats[];
  slSizeStats: SLSizeStats[];
  macroStats: MacroStats;
  evaluationStats: EvaluationStat[];
  riskStats: RiskAnalysis | null;
  allTradesRiskStats: RiskAnalysis | null;
  yearlyPartialTradesCount: number;
  yearlyPartialsBECount: number;
  nonExecutedTotalTradesCount: number;
  /** 'YYYY-MM' strings for calendar month navigation */
  tradeMonths: string[];
  earliestTradeDate: string | null;
  /** reentry/breakEven/trend stats from computeStatsFromTrades (filter-aware) */
  reentryStats: ReturnType<typeof computeStatsFromTrades>['reentryStats'];
  breakEvenStats: ReturnType<typeof computeStatsFromTrades>['breakEvenStats'];
  trendStats: ReturnType<typeof computeStatsFromTrades>['trendStats'];
};

function emptyStats(): Stats {
  return {
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
    partialBETrades: 0,
    totalPartialTradesCount: 0,
    totalPartialsBECount: 0,
    tradeQualityIndex: 0,
    multipleR: 0,
  };
}

function emptyLocalHL(): LocalHLStats {
  return {
    liquidated: { wins: 0, losses: 0, winRate: 0, breakEven: 0, winRateWithBE: 0, total: 0 },
    notLiquidated: { wins: 0, losses: 0, winRate: 0, breakEven: 0, winRateWithBE: 0, total: 0 },
  };
}

/**
 * Server-side computation of all dashboard statistics.
 * Fetches trades, applies filters, and returns pre-computed stats.
 * The client receives only the result (~5KB) instead of 50k raw trade rows.
 */
export async function getDashboardStats({
  userId,
  accountId,
  mode,
  strategyId,
  selectedYear,
  viewMode,
  dateRange,
  accountBalance,
  selectedMarket,
  selectedExecution,
}: {
  userId: string;
  accountId: string;
  mode: string;
  strategyId?: string | null;
  selectedYear: number;
  viewMode: 'yearly' | 'dateRange';
  dateRange: { startDate: string; endDate: string };
  accountBalance: number;
  selectedMarket: string;
  selectedExecution: 'all' | 'executed' | 'nonExecuted';
}): Promise<DashboardStatsResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;

  // Always fetch all executed trades for the selected year (yearly stats, macro stats, calendar nav)
  const allTrades = await getFilteredTrades({
    userId, accountId, mode,
    startDate: yearStart,
    endDate: yearEnd,
    strategyId,
  });

  // Effective date boundaries for the filtered view
  const effectiveStart = viewMode === 'yearly' ? yearStart : dateRange.startDate;
  const effectiveEnd = viewMode === 'yearly' ? yearEnd : dateRange.endDate;

  // Filtered trades: reuse allTrades in yearly mode, fetch date-scoped subset otherwise
  const filteredTradesBase: Trade[] = viewMode === 'yearly'
    ? allTrades
    : await getFilteredTrades({
        userId, accountId, mode,
        startDate: effectiveStart,
        endDate: effectiveEnd,
        strategyId,
      });

  // Non-executed trades for the same effective range
  const nonExecutedTrades: Trade[] = viewMode === 'yearly'
    ? allTrades.filter(t => t.executed === false)
    : await getFilteredTrades({
        userId, accountId, mode,
        startDate: effectiveStart,
        endDate: effectiveEnd,
        onlyNonExecuted: true,
        strategyId,
      });

  // Build tradesToUse: apply execution + market filters (same logic as StrategyClient)
  let tradesToUse: Trade[] = filteredTradesBase;
  if (selectedExecution === 'nonExecuted') {
    tradesToUse = nonExecutedTrades;
  } else if (selectedExecution === 'executed') {
    tradesToUse = tradesToUse.filter(t => t.executed === true);
  }
  if (selectedMarket !== 'all') {
    tradesToUse = tradesToUse.filter(t => t.market === selectedMarket);
  }

  // ── Stats from allTrades (full year) ──────────────────────────────
  const { monthlyData, bestMonth, worstMonth } = calculateMonthlyStats(
    allTrades, selectedYear, accountBalance
  );
  const marketAllTradesStats = calculateMarketStats(allTrades, accountBalance);
  const {
    totalPartialTradesCount: yearlyPartialTradesCount,
    totalPartialsBECount: yearlyPartialsBECount,
  } = calculatePartialTradesStats(allTrades);
  const macroStats = calculateMacroStats(allTrades, accountBalance);
  const allTradesRiskStats = calculateRiskPerTradeStats(allTrades);

  // 'YYYY-MM' strings for calendar navigation (from execution-filtered view)
  const tradeMonthSource = selectedExecution === 'nonExecuted' ? nonExecutedTrades : allTrades;
  const tradeMonthsSet = new Set<string>();
  for (const t of tradeMonthSource) {
    if (t.trade_date) tradeMonthsSet.add(t.trade_date.slice(0, 7));
  }
  const tradeMonths = Array.from(tradeMonthsSet).sort();

  // Earliest trade date in the filtered (but not market/execution filtered) view
  const earliestTradeDate = filteredTradesBase.length > 0
    ? filteredTradesBase.reduce(
        (min, t) => (t.trade_date < min ? t.trade_date : min),
        filteredTradesBase[0].trade_date
      )
    : null;

  // ── Stats from tradesToUse (filter-aware) ─────────────────────────
  let stats: Stats = emptyStats();
  let evaluationStats: EvaluationStat[] = [];
  let riskStats: RiskAnalysis | null = null;
  let setupStats: SetupStats[] = [];
  let liquidityStats: LiquidityStats[] = [];
  let directionStats: DirectionStats[] = [];
  let localHLStats: LocalHLStats = emptyLocalHL();
  let intervalStats: IntervalStats[] = [];
  let slSizeStats: SLSizeStats[] = [];
  let mssStats: MssStats[] = [];
  let newsStats: NewsStats[] = [];
  let dayStats: DayStats[] = [];
  let marketStats: MarketStats[] = [];
  let reentryStats: DashboardStatsResult['reentryStats'] = [];
  let breakEvenStats: DashboardStatsResult['breakEvenStats'] = [];
  let trendStats: DashboardStatsResult['trendStats'] = [];

  if (tradesToUse.length > 0) {
    const { winRate, winRateWithBE } = calculateWinRates(tradesToUse);
    const { totalProfit, averageProfit, averagePnLPercentage, maxDrawdown } =
      calculateProfit(tradesToUse, accountBalance);
    const { totalTrades, totalWins, totalLosses, beWins, beLosses } =
      calculateTradeCounts(tradesToUse);
    const { currentStreak, maxWinningStreak, maxLosingStreak } = calculateStreaks(tradesToUse);
    const averageDaysBetweenTrades = calculateAverageDaysBetweenTrades(tradesToUse);
    const tradeQualityIndex = calculateTradeQualityIndex(tradesToUse);
    const multipleR = calculateRRStats(tradesToUse);
    const {
      partialWinningTrades,
      partialLosingTrades,
      partialBETrades,
      totalPartialTradesCount,
      totalPartialsBECount,
    } = calculatePartialTradesStats(tradesToUse);

    stats = {
      totalTrades, totalWins, totalLosses, winRate, winRateWithBE,
      totalProfit, averageProfit, averagePnLPercentage,
      maxDrawdown, averageDrawdown: 0,
      intervalStats: {} as Record<string, IntervalStats>,
      evaluationStats: [],
      beWins, beLosses,
      currentStreak, maxWinningStreak, maxLosingStreak,
      averageDaysBetweenTrades,
      partialWinningTrades, partialLosingTrades, partialBETrades,
      totalPartialTradesCount, totalPartialsBECount,
      tradeQualityIndex, multipleR,
    };

    evaluationStats = calculateEvaluationStats(tradesToUse);
    riskStats = calculateRiskPerTradeStats(tradesToUse);
    setupStats = calculateSetupStats(tradesToUse);
    liquidityStats = calculateLiquidityStats(tradesToUse);
    directionStats = calculateDirectionStats(tradesToUse);
    localHLStats = calculateLocalHLStats(tradesToUse);
    intervalStats = calculateIntervalStats(tradesToUse, TIME_INTERVALS);
    slSizeStats = calculateSLSizeStats(tradesToUse);
    mssStats = calculateMssStats(tradesToUse);
    newsStats = calculateNewsStats(tradesToUse);
    dayStats = calculateDayStats(tradesToUse);
    marketStats = calculateMarketStats(tradesToUse, accountBalance);

    const computed = computeStatsFromTrades(tradesToUse);
    reentryStats = computed.reentryStats;
    breakEvenStats = computed.breakEvenStats;
    trendStats = computed.trendStats;
  }

  // ── Stats from nonExecutedTrades (for non-executed comparison cards) ──
  const nonExecutedSetupStats = nonExecutedTrades.length > 0
    ? calculateSetupStats(nonExecutedTrades) : [];
  const nonExecutedLiquidityStats = nonExecutedTrades.length > 0
    ? calculateLiquidityStats(nonExecutedTrades) : [];
  const nonExecutedMarketStats = nonExecutedTrades.length > 0
    ? calculateMarketStats(nonExecutedTrades, accountBalance) : [];

  return {
    stats,
    monthlyStats: { bestMonth, worstMonth, monthlyData },
    monthlyStatsAllTrades: monthlyData,
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
    riskStats,
    allTradesRiskStats,
    yearlyPartialTradesCount,
    yearlyPartialsBECount,
    nonExecutedTotalTradesCount: nonExecutedTrades.length,
    tradeMonths,
    earliestTradeDate,
    reentryStats,
    breakEvenStats,
    trendStats,
  };
}

/**
 * Fetches full Trade objects for a specific calendar month.
 * Includes both executed and non-executed trades so the calendar can display all activity.
 * Returns a small dataset (~10–50 trades). Auth is enforced in getFilteredTrades (no duplicate getUser).
 */
export async function getCalendarTrades({
  userId,
  accountId,
  mode,
  strategyId,
  startDate,
  endDate,
}: {
  userId: string;
  accountId: string;
  mode: string;
  strategyId?: string | null;
  startDate: string;
  endDate: string;
}): Promise<Trade[]> {
  return getFilteredTrades({
    userId, accountId, mode,
    startDate, endDate,
    includeNonExecuted: true,
    strategyId,
  });
}
