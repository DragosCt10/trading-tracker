import { Trade } from '@/types/trade';
import { calculateStreaksFromTrades } from '@/utils/calculateStreaks';
import { calculatePartialTradesStats } from '@/utils/calculatePartialTradesStats';

export interface ComputeStrategyStatsParams {
  tradesToUse: Trade[];
  accountBalance: number;
  /** When 'nonExecuted', use all trades for profit calc; otherwise use executed only. */
  selectedExecution?: 'all' | 'executed' | 'nonExecuted' | null;
  viewMode?: 'yearly' | 'dateRange';
  selectedMarket?: string;
  /** From hook; used for tradeQualityIndex/multipleR when not filtered. */
  statsFromHook?: { tradeQualityIndex?: number; multipleR?: number };
}

export interface StrategyStatsResult {
  totalTrades: number;
  wins: number;
  losses: number;
  beWins: number;
  beLosses: number;
  totalWins: number;
  totalLosses: number;
  totalProfit: number;
  averageProfit: number;
  winRate: number;
  winRateWithBE: number;
  currentStreak: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
  averageDaysBetweenTrades: number;
  maxDrawdown: number;
  averageDrawdown: number;
  averagePnLPercentage: number;
  partialsTaken: number;
  partialsWins: number;
  partialsLosses: number;
  partialBETrades: number;
  partialWinningTrades: number;
  partialLosingTrades: number;
  tradeQualityIndex: number;
  multipleR: number;
}

/**
 * Exact same calculation as StrategyClient's filteredStats useMemo.
 * Used by StrategyClient and ShareStrategyClient for Consistency & drawdown and Performance ratios.
 */
export function computeStrategyStatsFromTrades({
  tradesToUse,
  accountBalance,
  selectedExecution = null,
  viewMode = 'dateRange',
  selectedMarket = 'all',
  statsFromHook = {},
}: ComputeStrategyStatsParams): StrategyStatsResult {
  const tradesForProfitCalculations =
    selectedExecution === 'nonExecuted'
      ? tradesToUse
      : tradesToUse.filter((t) => t.executed === true);

  const nonBETrades = tradesForProfitCalculations.filter((t) => !t.break_even);
  const beTrades = tradesForProfitCalculations.filter((t) => t.break_even);

  const wins = nonBETrades.filter((t) => t.trade_outcome === 'Win').length;
  const losses = nonBETrades.filter((t) => t.trade_outcome === 'Lose').length;
  const beWins = beTrades.filter((t) => t.trade_outcome === 'Win').length;
  const beLosses = beTrades.filter((t) => t.trade_outcome === 'Lose').length;

  const totalTrades = tradesToUse.length;
  const totalWins = wins + beWins;
  const totalLosses = losses + beLosses;

  const totalProfit = tradesForProfitCalculations.reduce(
    (sum, t) => sum + (t.calculated_profit || 0),
    0
  );
  const tradesForProfitCount = tradesForProfitCalculations.length;
  const averageProfit =
    tradesForProfitCount > 0 ? totalProfit / tradesForProfitCount : 0;

  const nonBETotal = wins + losses;
  const winRate = nonBETotal > 0 ? (wins / nonBETotal) * 100 : 0;
  const winRateWithBE =
    totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

  const { currentStreak, maxWinningStreak, maxLosingStreak } =
    calculateStreaksFromTrades(tradesForProfitCalculations, {
      excludeBreakEven: false,
      sortByTime: false,
      countNonOutcomeAsLoss: false,
    });

  const sortedTrades = [...tradesForProfitCalculations].sort(
    (a, b) =>
      new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  let averageDaysBetweenTrades = 0;
  if (sortedTrades.length > 1) {
    const daysBetween: number[] = [];
    for (let i = 1; i < sortedTrades.length; i++) {
      const prevDate = new Date(sortedTrades[i - 1].trade_date);
      const currDate = new Date(sortedTrades[i].trade_date);
      const diffTime = Math.abs(
        currDate.getTime() - prevDate.getTime()
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysBetween.push(diffDays);
    }
    averageDaysBetweenTrades =
      daysBetween.length > 0
        ? daysBetween.reduce((sum, days) => sum + days, 0) / daysBetween.length
        : 0;
  }

  let maxDrawdown = 0;
  const currentBalance = accountBalance;

  const initialBalance = Math.max(0, currentBalance - totalProfit);
  let peak = initialBalance;
  let runningBalance = initialBalance;
  const drawdowns: number[] = [];

  sortedTrades.forEach((trade) => {
    runningBalance += trade.calculated_profit || 0;
    if (runningBalance > peak) {
      peak = runningBalance;
    }
    if (peak > 0) {
      const drawdown = ((peak - runningBalance) / peak) * 100;
      if (drawdown > 0.0001) {
        drawdowns.push(drawdown);
      }
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  });

  const averageDrawdown =
    drawdowns.length > 0
      ? drawdowns.reduce((sum, dd) => sum + dd, 0) / drawdowns.length
      : maxDrawdown > 0
        ? maxDrawdown
        : 0;

  const balanceForPnL = accountBalance || 1;
  const averagePnLPercentage =
    balanceForPnL > 0 ? (totalProfit / balanceForPnL) * 100 : 0;

  const partialStatsFromTrades = calculatePartialTradesStats(tradesToUse);
  const totalPartials = partialStatsFromTrades.totalPartialTradesCount;
  const partialsWins = partialStatsFromTrades.partialWinningTrades;
  const partialsLosses = partialStatsFromTrades.partialLosingTrades;
  const partialBETrades = partialStatsFromTrades.totalPartialsBECount;

  const executedTradesWithOutcomes = wins + losses + beWins + beLosses;
  const isFiltered =
    viewMode === 'dateRange' ||
    selectedMarket !== 'all' ||
    selectedExecution === 'nonExecuted' ||
    selectedExecution === 'all';
  const tradeQualityIndex =
    isFiltered && executedTradesWithOutcomes === 0
      ? 0
      : (statsFromHook.tradeQualityIndex ?? 0);
  const multipleR =
    isFiltered && executedTradesWithOutcomes === 0
      ? 0
      : (statsFromHook.multipleR ?? 0);

  return {
    totalTrades,
    wins,
    losses,
    beWins,
    beLosses,
    totalWins,
    totalLosses,
    totalProfit,
    averageProfit,
    winRate,
    winRateWithBE,
    currentStreak,
    maxWinningStreak,
    maxLosingStreak,
    averageDaysBetweenTrades,
    maxDrawdown,
    averageDrawdown,
    averagePnLPercentage,
    partialsTaken: totalPartials,
    partialsWins,
    partialsLosses,
    partialBETrades,
    partialWinningTrades: partialsWins,
    partialLosingTrades: partialsLosses,
    tradeQualityIndex,
    multipleR,
  };
}
