import { format } from 'date-fns';
import type { DashboardRpcResult } from '@/types/dashboard-rpc';
import type {
  SetupStats,
  LiquidityStats,
  MarketStats,
  SLSizeStats,
  DayStats,
  MssStats,
  LocalHLStats,
  DirectionStats,
  TradeTypeStats,
  NewsNameStats,
  RiskAnalysis,
  MacroStats,
} from '@/types/dashboard';
import type { Trade } from '@/types/trade';
import type { CompactTrade } from '@/types/dashboard-rpc';
import type { StrategyStatsResult } from '@/utils/computeStrategyStatsFromTrades';
import type { PartialTradesStats } from '@/utils/calculatePartialTradesStats';
import type { EvaluationStat } from '@/utils/calculateEvaluationStats';
import {
  calculateReentryStats,
  calculateBreakEvenStats,
  calculateTrendStats,
  calculateNewsNameStats,
} from '@/utils/calculateCategoryStats';
import { calculateEvaluationStats } from '@/utils/calculateEvaluationStats';
import { calculatePartialTradesStats } from '@/utils/calculatePartialTradesStats';
import { computeStrategyStatsFromTrades } from '@/utils/computeStrategyStatsFromTrades';

// Matches the shape of TradeStatDatum from TradesStatsBarCard (structural typing).
export interface IntervalChartDatum {
  category: string;
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number;
  winRateWithBE: number;
  totalTrades: number;
}

export interface SharePageStats {
  // Core computed stats (drawdown, streaks, etc.)
  statsToUse: StrategyStatsResult;
  // Macro stats (profit factor, consistency, sharpe, TQI)
  macroStatsToUse: MacroStats & {
    nonExecutedTotalTradesCount: number;
    yearlyPartialTradesCount: number;
    yearlyPartialsBECount: number;
  };
  // Account overview
  monthlyProfitStats: { [key: string]: { profit: number } };
  totalRangeProfit: number;
  updatedBalance: number;
  // Category stats (from RPC)
  setupStats: SetupStats[];
  liquidityStats: LiquidityStats[];
  marketStats: MarketStats[];
  slSizeStats: SLSizeStats[];
  dayStats: DayStats[];
  mssStats: MssStats[];
  localHLStats: LocalHLStats;
  directionStats: DirectionStats[];
  allTradesRiskStats: RiskAnalysis;
  timeIntervalChartData: IntervalChartDatum[];
  // Computed from compact_trades
  evaluationStats: EvaluationStat[];
  reentryStats: TradeTypeStats[];
  breakEvenStats: TradeTypeStats[];
  trendStats: TradeTypeStats[];
  partials: PartialTradesStats;
  newsNameStats: NewsNameStats[];
  // Calendar navigation
  calendarMonthKeys: string[]; // YYYY-MM strings, from RPC trade_months
  // Has-data flags (all computed from compact_trades)
  hasSetupData: boolean;
  hasLiquidityData: boolean;
  hasMarketData: boolean;
  hasSLSizeData: boolean;
  hasTimeIntervalData: boolean;
  hasDayStatsData: boolean;
  hasMssData: boolean;
  hasLocalHLData: boolean;
  hasNewsNameData: boolean;
  hasPotentialRRData: boolean;
  hasLaunchHourData: boolean;
  hasAvgDisplacementData: boolean;
  hasDisplacementSizeData: boolean;
  hasFvgSizeData: boolean;
  hasConfidenceData: boolean;
  hasMindStateData: boolean;
  // Date range label for the share header
  dateRangeLabel: string;
}


/**
 * Maps a CompactTrade (from the RPC cache) to the canonical Trade type.
 * Fields absent from CompactTrade are filled with safe defaults since the
 * share page only renders analytics — not forms or full trade detail.
 */
export function mapCompactTradesToTrade(compactTrades: CompactTrade[], mode: string): Trade[] {
  return compactTrades.map((ct) => ({
    id: ct.id,
    mode,
    trade_screens: [],
    trade_time: ct.trade_time,
    trade_date: ct.trade_date,
    day_of_week: ct.day_of_week,
    market: ct.market,
    setup_type: ct.setup_type,
    liquidity: ct.liquidity,
    sl_size: ct.sl_size,
    direction: ct.direction,
    trade_outcome: ct.trade_outcome,
    be_final_result: ct.be_final_result ?? null,
    break_even: ct.break_even,
    reentry: ct.reentry,
    news_related: ct.news_related,
    news_name: ct.news_name ?? null,
    news_intensity: ct.news_intensity ?? null,
    mss: ct.mss,
    risk_reward_ratio: ct.risk_reward_ratio,
    risk_reward_ratio_long: ct.risk_reward_ratio_long ?? 0,
    local_high_low: ct.local_high_low,
    risk_per_trade: ct.risk_per_trade,
    calculated_profit: ct.calculated_profit,
    quarter: '',
    evaluation: ct.evaluation,
    partials_taken: ct.partials_taken,
    executed: ct.executed,
    launch_hour: ct.launch_hour,
    displacement_size: ct.displacement_size ?? 0,
    trend: ct.trend ?? null,
    fvg_size: ct.fvg_size ?? null,
    confidence_at_entry: ct.confidence_at_entry ?? null,
    mind_state_at_entry: ct.mind_state_at_entry ?? null,
  }));
}

function buildDateRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameYear && sameMonth) return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
  if (sameYear) return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
}

/**
 * Transforms a cached DashboardRpcResult into all precomputed props needed by
 * ShareStrategyClient. Runs server-side; no DB calls.
 */
export function buildSharePageStatsFromCache(
  cachedStats: DashboardRpcResult,
  accountBalance: number,
  shareMode: string,
  shareStartDate: string,
  shareEndDate: string,
): SharePageStats {
  const trades = mapCompactTradesToTrade(cachedStats.compact_trades ?? [], shareMode);

  // --- Computed from trades (pure functions, no I/O) ---
  const statsToUse = computeStrategyStatsFromTrades({
    tradesToUse: trades,
    accountBalance,
    selectedExecution: null,
    viewMode: 'dateRange',
    selectedMarket: 'all',
    statsFromHook: {},
  });

  const evaluationStats = calculateEvaluationStats(trades) as EvaluationStat[];
  const reentryStats = calculateReentryStats(trades);
  const breakEvenStats = calculateBreakEvenStats(trades);
  const trendStats = calculateTrendStats(trades);
  // Use RPC's execution-filtered direction_stats so counts match all other analytics cards
  const directionStats = (cachedStats.direction_stats ?? []) as unknown as DirectionStats[];
  const partials = calculatePartialTradesStats(trades);
  const newsNameStats = calculateNewsNameStats(trades, { includeUnnamed: true });

  // --- Monthly profit stats: RPC monthly_data keys are already full month names ---
  const monthlyProfitStats: { [key: string]: { profit: number } } = {};
  for (const [monthName, stats] of Object.entries(cachedStats.monthly_data ?? {})) {
    if (!monthName || !stats) continue;
    if (monthlyProfitStats[monthName]) {
      monthlyProfitStats[monthName].profit += stats.profit;
    } else {
      monthlyProfitStats[monthName] = { profit: stats.profit };
    }
  }
  const totalRangeProfit = Object.values(monthlyProfitStats).reduce(
    (sum, m) => sum + m.profit,
    0,
  );
  const updatedBalance = accountBalance + totalRangeProfit;

  // --- Macro stats from RPC ---
  const macroStatsToUse = {
    profitFactor: cachedStats.macro?.profitFactor ?? 0,
    consistencyScore: cachedStats.macro?.consistencyScore ?? 0,
    consistencyScoreWithBE: cachedStats.macro?.consistencyScoreWithBE ?? 0,
    sharpeWithBE: cachedStats.series_stats?.sharpeWithBE ?? 0,
    tradeQualityIndex: cachedStats.series_stats?.tradeQualityIndex ?? 0,
    multipleR: cachedStats.core?.multipleR ?? 0,
    nonExecutedTotalTradesCount: 0,
    yearlyPartialTradesCount: cachedStats.partials?.totalPartialTradesCount ?? 0,
    yearlyPartialsBECount: cachedStats.partials?.totalPartialsBECount ?? 0,
  };

  // --- Category stats from RPC (already in the correct shape) ---
  const setupStats = (cachedStats.setup_stats ?? []) as unknown as SetupStats[];
  const liquidityStats = (cachedStats.liquidity_stats ?? []) as unknown as LiquidityStats[];
  const marketStats = (cachedStats.market_stats ?? []) as unknown as MarketStats[];
  const slSizeStats = (cachedStats.sl_size_stats ?? []) as unknown as SLSizeStats[];
  const dayStats = (cachedStats.day_stats ?? []) as unknown as DayStats[];
  const mssStats = (cachedStats.mss_stats ?? []) as unknown as MssStats[];
  const localHLStats = (cachedStats.local_hl_stats ?? {
    liquidated: { wins: 0, losses: 0, winRate: 0, breakEven: 0, winRateWithBE: 0, total: 0 },
    notLiquidated: { wins: 0, losses: 0, winRate: 0, breakEven: 0, winRateWithBE: 0, total: 0 },
  }) as unknown as LocalHLStats;
  const allTradesRiskStats = (cachedStats.risk_analysis ?? {}) as unknown as RiskAnalysis;

  // --- Time interval chart data from RPC interval_stats ---
  const timeIntervalChartData: IntervalChartDatum[] = (cachedStats.interval_stats ?? []).map((s) => ({
    category: s.label,
    wins: s.wins,
    losses: s.losses,
    breakEven: s.breakEven,
    winRate: s.winRate,
    winRateWithBE: s.winRateWithBE,
    totalTrades: s.wins + s.losses + (s.breakEven ?? 0),
  }));

  // --- Has-data flags ---
  const hasSetupData = setupStats.length > 0;
  const hasLiquidityData = liquidityStats.length > 0;
  const hasMarketData = marketStats.length > 0;
  const hasSLSizeData = slSizeStats.length > 0;
  const hasTimeIntervalData = timeIntervalChartData.some((d) => (d.totalTrades ?? 0) > 0);
  const hasDayStatsData = dayStats.length > 0;
  const hasMssData = mssStats.length > 0;
  const hasLocalHLData =
    (localHLStats.liquidated?.total ?? 0) > 0 ||
    (localHLStats.notLiquidated?.total ?? 0) > 0;
  const hasNewsNameData = newsNameStats.length > 0;
  const hasPotentialRRData = trades.some(
    (t) => typeof t.risk_reward_ratio_long === 'number' && t.risk_reward_ratio_long > 0,
  );
  const hasLaunchHourData = trades.some((t) => t.launch_hour === true);
  const hasAvgDisplacementData = trades.some(
    (t) => typeof t.displacement_size === 'number' && t.displacement_size > 0,
  );
  const hasDisplacementSizeData = trades.some((t) => typeof t.displacement_size === 'number');
  const hasFvgSizeData = trades.some((t) => typeof t.fvg_size === 'number');
  const hasConfidenceData = trades.some(
    (t) => t.confidence_at_entry != null && t.confidence_at_entry >= 1 && t.confidence_at_entry <= 5,
  );
  const hasMindStateData = trades.some(
    (t) => t.mind_state_at_entry != null && t.mind_state_at_entry >= 1 && t.mind_state_at_entry <= 5,
  );

  return {
    statsToUse,
    macroStatsToUse,
    monthlyProfitStats,
    totalRangeProfit,
    updatedBalance,
    setupStats,
    liquidityStats,
    marketStats,
    slSizeStats,
    dayStats,
    mssStats,
    localHLStats,
    directionStats,
    allTradesRiskStats,
    timeIntervalChartData,
    evaluationStats,
    reentryStats,
    breakEvenStats,
    trendStats,
    partials,
    newsNameStats,
    calendarMonthKeys: cachedStats.trade_months ?? [],
    hasSetupData,
    hasLiquidityData,
    hasMarketData,
    hasSLSizeData,
    hasTimeIntervalData,
    hasDayStatsData,
    hasMssData,
    hasLocalHLData,
    hasNewsNameData,
    hasPotentialRRData,
    hasLaunchHourData,
    hasAvgDisplacementData,
    hasDisplacementSizeData,
    hasFvgSizeData,
    hasConfidenceData,
    hasMindStateData,
    dateRangeLabel: buildDateRangeLabel(shareStartDate, shareEndDate),
  };
}

/** Fallback used when the cache is cold (should never happen in practice). */
export function buildEmptySharePageStats(): SharePageStats {
  const emptyStats: StrategyStatsResult = {
    totalTrades: 0, wins: 0, losses: 0, beWins: 0, beLosses: 0,
    totalWins: 0, totalLosses: 0, totalProfit: 0, averageProfit: 0,
    winRate: 0, winRateWithBE: 0, currentStreak: 0, maxWinningStreak: 0,
    maxLosingStreak: 0, averageDaysBetweenTrades: 0, maxDrawdown: 0,
    averageDrawdown: 0, averagePnLPercentage: 0, partialsTaken: 0,
    partialsWins: 0, partialsLosses: 0, partialBETrades: 0,
    partialWinningTrades: 0, partialLosingTrades: 0, tradeQualityIndex: 0, multipleR: 0,
  };
  const emptyMacro = {
    profitFactor: 0, consistencyScore: 0, consistencyScoreWithBE: 0,
    sharpeWithBE: 0, tradeQualityIndex: 0, multipleR: 0,
    nonExecutedTotalTradesCount: 0, yearlyPartialTradesCount: 0, yearlyPartialsBECount: 0,
  };
  const emptyLocalHL: LocalHLStats = {
    liquidated: { wins: 0, losses: 0, winRate: 0, breakEven: 0, winRateWithBE: 0, total: 0 },
    notLiquidated: { wins: 0, losses: 0, winRate: 0, breakEven: 0, winRateWithBE: 0, total: 0 },
  };
  const emptyPartials: PartialTradesStats = {
    partialWinningTrades: 0, partialLosingTrades: 0, partialBETrades: 0,
    totalPartialTradesCount: 0, totalPartialsBECount: 0,
  };
  return {
    statsToUse: emptyStats,
    macroStatsToUse: emptyMacro,
    monthlyProfitStats: {},
    totalRangeProfit: 0,
    updatedBalance: 0,
    setupStats: [], liquidityStats: [], marketStats: [], slSizeStats: [],
    dayStats: [], mssStats: [], localHLStats: emptyLocalHL, directionStats: [],
    allTradesRiskStats: {}, timeIntervalChartData: [], evaluationStats: [],
    reentryStats: [], breakEvenStats: [], trendStats: [], partials: emptyPartials,
    newsNameStats: [], calendarMonthKeys: [],
    hasSetupData: false, hasLiquidityData: false, hasMarketData: false, hasSLSizeData: false,
    hasTimeIntervalData: false, hasDayStatsData: false, hasMssData: false, hasLocalHLData: false,
    hasNewsNameData: false, hasPotentialRRData: false, hasLaunchHourData: false,
    hasAvgDisplacementData: false, hasDisplacementSizeData: false, hasFvgSizeData: false,
    hasConfidenceData: false, hasMindStateData: false,
    dateRangeLabel: '',
  };
}
