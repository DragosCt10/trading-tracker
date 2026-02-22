import { Trade } from '@/types/trade';
import { calculateProfitFactor, calculateConsistencyScore, calculateSharpeRatio } from '@/utils/analyticsCalculations';

interface StatsToUse {
  totalWins: number;
  totalLosses: number;
  averagePnLPercentage?: number;
  maxDrawdown?: number;
  tradeQualityIndex?: number;
  multipleR?: number;
}

interface MonthlyStats {
  [month: string]: { profit: number };
}

interface MacroStats {
  profitFactor?: number;
  consistencyScore?: number;
  consistencyScoreWithBE?: number;
  sharpeWithBE?: number;
  tradeQualityIndex?: number;
  multipleR?: number;
  nonExecutedTotalTradesCount?: number;
  yearlyPartialTradesCount?: number;
  yearlyPartialsBECount?: number;
}

interface CalculateFilteredMacroStatsParams {
  viewMode: 'yearly' | 'dateRange';
  selectedMarket: string;
  tradesToUse: Trade[];
  statsToUse: StatsToUse;
  monthlyStatsToUse: MonthlyStats;
  nonExecutedTrades: Trade[] | null;
  nonExecutedTotalTradesCount: number | undefined;
  yearlyPartialTradesCount: number | undefined;
  yearlyPartialsBECount: number | undefined;
  macroStats: MacroStats;
}

export function calculateFilteredMacroStats({
  viewMode,
  selectedMarket: _selectedMarket,
  tradesToUse,
  statsToUse,
  monthlyStatsToUse,
  nonExecutedTrades,
  nonExecutedTotalTradesCount,
  yearlyPartialTradesCount,
  yearlyPartialsBECount,
  macroStats: _macroStats,
}: CalculateFilteredMacroStatsParams): MacroStats {
  // Always compute from tradesToUse to ensure consistency between yearly and date range modes
  // The hook's macroStats might use different calculation logic or include/exclude non-executed trades differently
  // By always recalculating from tradesToUse, we ensure the same trades produce the same results
  
  // When tradesToUse contains non-executed trades (e.g., when execution filter is "nonExecuted"),
  // use tradesToUse directly for calculations. Otherwise, filter to executed trades only.
  // Check if all trades are non-executed (when execution filter is "nonExecuted")
  const allTradesAreNonExecuted = tradesToUse.length > 0 && tradesToUse.every(t => t.executed === false);
  const tradesForCalculations = allTradesAreNonExecuted 
    ? tradesToUse 
    : tradesToUse.filter(t => t.executed === true);
  
  // Compute profit factor from tradesForCalculations
  // Profit factor = Total Gross Profit / Total Gross Loss
  const totalWins = statsToUse.totalWins;
  const totalLosses = statsToUse.totalLosses;
  
  const profitFactor = calculateProfitFactor(tradesForCalculations, totalWins, totalLosses);

  // Calculate consistency score from monthly stats
  // monthlyStatsToUse includes all trades from tradesToUse (non-executed trades will have 0 profit)
  // Consistency score = percentage of profitable months
  const consistencyScore = calculateConsistencyScore(monthlyStatsToUse);

  // Compute Sharpe ratio (simplified - would need returns array for full calculation)
  // For now, use a simplified version based on profit and drawdown
  const avgReturn = statsToUse.averagePnLPercentage || 0;
  const volatility = statsToUse.maxDrawdown || 1; // Use drawdown as proxy for volatility
  const sharpeWithBE = calculateSharpeRatio(avgReturn, volatility);

  // Compute TQI and RR Multiple from statsToUse
  const tradeQualityIndex = statsToUse.tradeQualityIndex || 0;
  const multipleR = statsToUse.multipleR || 0;

  // In date range mode, compute non-executed trades count from filtered nonExecutedTrades
  // In yearly mode, use hook values
  const nonExecutedCount = viewMode === 'dateRange' 
    ? (nonExecutedTrades?.length || 0)
    : (nonExecutedTotalTradesCount ?? 0);
  
  // Compute partial trades count from filtered trades in date range mode
  const partialTradesCount = viewMode === 'dateRange'
    ? tradesToUse.filter(t => t.partials_taken).length
    : (yearlyPartialTradesCount ?? 0);
  
  const partialsBECount = viewMode === 'dateRange'
    ? tradesToUse.filter(t => t.partials_taken && t.break_even).length
    : (yearlyPartialsBECount ?? 0);

  return {
    profitFactor,
    consistencyScore,
    consistencyScoreWithBE: consistencyScore, // Simplified - same as consistencyScore
    sharpeWithBE,
    tradeQualityIndex,
    multipleR,
    nonExecutedTotalTradesCount: nonExecutedCount,
    yearlyPartialTradesCount: partialTradesCount,
    yearlyPartialsBECount: partialsBECount,
  };
}
