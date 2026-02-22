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
