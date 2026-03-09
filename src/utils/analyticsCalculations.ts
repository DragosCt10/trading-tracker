import { Trade } from '@/types/trade';

interface MonthlyStats {
  [month: string]: { profit: number };
}

export function calculateProfitFactor(
  trades: Trade[],
  totalWins: number,
  totalLosses: number
): number {
  const grossProfit = trades
    .filter(t => (t.calculated_profit || 0) > 0)
    .reduce((sum, t) => sum + (t.calculated_profit || 0), 0);
  const grossLoss = Math.abs(trades
    .filter(t => (t.calculated_profit || 0) < 0)
    .reduce((sum, t) => sum + (t.calculated_profit || 0), 0));

  if (grossLoss > 0) {
    return grossProfit / grossLoss;
  } else if (grossProfit > 0) {
    return Math.min(grossProfit, 100);
  } else if (totalLosses > 0) {
    return totalWins / totalLosses;
  } else if (totalWins > 0) {
    return Math.min(totalWins * 2, 100);
  }
  return 0;
}

export function calculateConsistencyScore(monthlyStats: MonthlyStats): number {
  const profitableMonths = Object.keys(monthlyStats).filter(
    month => (monthlyStats[month]?.profit || 0) > 0
  ).length;
  const totalMonths = Object.keys(monthlyStats).length;
  return totalMonths > 0 ? (profitableMonths / totalMonths) * 100 : 0;
}

export function calculateSharpeRatio(
  averagePnLPercentage: number,
  maxDrawdown: number
): number {
  const volatility = maxDrawdown || 1;
  return volatility > 0 ? averagePnLPercentage / volatility : 0;
}

/**
 * Calculates average P&L % over starting balance, mirroring
 * the logic used in PNLPercentageStatCard.
 *
 * - If all trades are non-executed, use them as-is.
 * - Otherwise, restrict to executed trades only.
 * - P&L % = totalProfit / accountBalance * 100.
 */
export function calculateAveragePnLPercentage(
  trades: Trade[],
  accountBalance: number | null | undefined
): number {
  if (!trades.length) return 0;

  const allTradesAreNonExecuted = trades.length > 0 && trades.every((t) => t.executed === false);
  const tradesForProfit = allTradesAreNonExecuted ? trades : trades.filter((t) => t.executed === true);

  const totalProfit = tradesForProfit.reduce(
    (sum, t) => sum + (t.calculated_profit || 0),
    0
  );
  const balance = accountBalance || 1;

  return balance > 0 ? (totalProfit / balance) * 100 : 0;
}
