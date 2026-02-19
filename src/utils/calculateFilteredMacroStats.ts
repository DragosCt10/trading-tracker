import { Trade } from '@/types/trade';
import { calculateProfitFactor } from '@/components/dashboard/analytics/ProfitFactorChart';
import { calculateConsistencyScore } from '@/components/dashboard/analytics/ConsistencyScoreChart';
import { calculateSharpeRatio } from '@/components/dashboard/analytics/SharpeRatioChart';

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
  selectedMarket,
  tradesToUse,
  statsToUse,
  monthlyStatsToUse,
  nonExecutedTrades,
  nonExecutedTotalTradesCount,
  yearlyPartialTradesCount,
  yearlyPartialsBECount,
  macroStats,
}: CalculateFilteredMacroStatsParams): MacroStats {
  // In yearly mode with no filters, use hook stats but ensure consistent structure
  // Execution filter doesn't apply in yearly mode, so only check market filter
  if (viewMode === 'yearly' && selectedMarket === 'all') {
    return {
      ...macroStats,
      nonExecutedTotalTradesCount: nonExecutedTotalTradesCount || 0,
      yearlyPartialTradesCount: yearlyPartialTradesCount || 0,
      yearlyPartialsBECount: yearlyPartialsBECount || 0,
    };
  }

  // In date range mode or when filters are applied, compute from current filtered data
  // Compute profit factor from statsToUse
  // Profit factor = Total Gross Profit / Total Gross Loss
  // For non-executed trades, we calculate based on profit amounts, not win/loss counts
  const totalWins = statsToUse.totalWins;
  const totalLosses = statsToUse.totalLosses;
  
  const profitFactor = calculateProfitFactor(tradesToUse, totalWins, totalLosses);

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
