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

  // Classical definition:
  // - Profit factor = grossProfit / grossLoss when there are losses
  // - If there is profit and no loss, the theoretical value is infinite
  if (grossLoss > 0) {
    return grossProfit / grossLoss;
  }

  if (grossProfit > 0) {
    return Number.POSITIVE_INFINITY;
  }

  // Fallbacks when profit values are missing but win/loss counts exist
  if (totalLosses > 0) {
    return totalWins / totalLosses;
  }

  if (totalWins > 0) {
    return Number.POSITIVE_INFINITY;
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
 * Max drawdown (in %) over the equity curve from non-BE trades.
 * Running balance from accountBalance + cumulative profit; drawdown at each step = (peak - balance) / peak * 100.
 */
export function calculateMaxDrawdown(trades: Trade[], accountBalance: number): number {
  const nonBETrades = trades
    .filter((t) => !t.break_even)
    .slice()
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  let balance = accountBalance;
  let peak = balance;
  let maxDrawdown = 0;

  for (const t of nonBETrades) {
    const profit = typeof t.calculated_profit === 'number' ? t.calculated_profit : 0;
    balance += profit;
    if (balance > peak) peak = balance;
    const drawdown = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

/**
 * Average drawdown (in %) over the equity curve from non-BE trades.
 * At each step, drawdown from current peak; returns the mean of those drawdowns.
 */
export function calculateAverageDrawdown(trades: Trade[], accountBalance: number): number {
  const nonBETrades = trades
    .filter((t) => !t.break_even)
    .slice()
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  if (nonBETrades.length === 0) return 0;

  let balance = accountBalance;
  let peak = balance;
  let sumDrawdown = 0;
  let count = 0;

  for (const t of nonBETrades) {
    const profit = typeof t.calculated_profit === 'number' ? t.calculated_profit : 0;
    balance += profit;
    if (balance > peak) peak = balance;
    const drawdown = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
    sumDrawdown += drawdown;
    count += 1;
  }

  return count > 0 ? sumDrawdown / count : 0;
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
