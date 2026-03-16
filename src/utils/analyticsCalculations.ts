import { Trade } from '@/types/trade';
import { stdDev } from '@/utils/helpers/mathHelpers';

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
function sortTradesChronologicallyStable(trades: Trade[]): Trade[] {
  return trades
    .slice()
    .sort((a, b) => {
      const tA = new Date(a.trade_date).getTime();
      const tB = new Date(b.trade_date).getTime();
      if (tA !== tB) return tA - tB;
      return String(a.id ?? '').localeCompare(String(b.id ?? ''));
    });
}

export function calculateMaxDrawdown(trades: Trade[], accountBalance: number): number {
  const nonBETrades = sortTradesChronologicallyStable(
    trades.filter((t) => !t.break_even),
  );

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
  const nonBETrades = sortTradesChronologicallyStable(
    trades.filter((t) => !t.break_even),
  );

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

/**
 * Average win/loss size and win-to-loss ratio from realized P&L.
 * Filters by trade_outcome ('Win' / 'Lose'). BE trades excluded.
 */
export function calculateAvgWinLoss(trades: Trade[]): {
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
} {
  const winners = trades.filter(t => t.trade_outcome === 'Win');
  const losers  = trades.filter(t => t.trade_outcome === 'Lose');
  const avgWin  = winners.reduce((s, t) => s + (t.calculated_profit ?? 0), 0) / (winners.length || 1);
  const avgLoss = Math.abs(losers.reduce((s, t) => s + (t.calculated_profit ?? 0), 0) / (losers.length || 1));
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  return { avgWin, avgLoss, winLossRatio };
}

/**
 * Expectancy per trade in currency: (WR × AvgWin) − (LR × AvgLoss).
 * Returns expectancy value plus a 0–100 normalized score:
 *   0  = worst case (-avgLoss), 50 = breakeven, 100 = best case (+avgWin).
 */
export function calculateExpectancy(trades: Trade[]): {
  expectancy: number;
  normalized: number;
  avgWin: number;
  avgLoss: number;
} {
  const { avgWin, avgLoss } = calculateAvgWinLoss(trades);
  const winners  = trades.filter(t => t.trade_outcome === 'Win').length;
  const losers   = trades.filter(t => t.trade_outcome === 'Lose').length;
  const total    = winners + losers;
  const winRate  = total > 0 ? winners / total : 0;
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
  const maxVal   = Math.max(avgWin, avgLoss, 1);
  const normalized = Math.min(100, Math.max(0, ((expectancy + maxVal) / (2 * maxVal)) * 100));
  return { expectancy, normalized, avgWin, avgLoss };
}


/**
 * Trade Quality Index (TQI)
 *
 * TQI = WinRate * RRStability
 * WinRate   = wins / totalTrades (BE counted in total, but not as wins)
 * RRStability = 1 / (1 + StdDev(R))
 *
 * R-values per trade:
 *  - Win (non-BE):   +risk_reward_ratio
 *  - Lose (non-BE):  -1R
 *  - Break-even:     0R
 *
 * Returns a number in [0, 1]. Multiply by 100 if you want a percentage.
 */
export function calculateTradeQualityIndex(trades: Trade[]): number {
  if (!trades.length) return 0;

  const rValues: number[] = [];
  let wins = 0;
  let total = 0;

  trades.forEach((t) => {
    const rr =
      typeof t.risk_reward_ratio === 'number' && !isNaN(t.risk_reward_ratio)
        ? t.risk_reward_ratio
        : 0;

    let r: number | undefined;

    if (t.break_even) {
      r = 0;
      total += 1;
    } else if (t.trade_outcome === 'Win') {
      r = rr;
      wins += 1;
      total += 1;
    } else if (t.trade_outcome === 'Lose') {
      r = -1;
      total += 1;
    } else {
      return;
    }

    rValues.push(r);
  });

  if (!total || !rValues.length) return 0;

  const winRate = wins / total;
  const rrStdDev = stdDev(rValues);
  const rrStability = 1 / (1 + rrStdDev);

  const tqi = winRate * rrStability;
  return tqi;
}

/**
 * Recovery Factor & Drawdown Count helper.
 *
 * - Recovery Factor = Total P&L% / Max Drawdown%
 * - Drawdown Count  = stats-provided drawdownCount, defaulting to 0
 */
export function computeRecoveryFactorAndDrawdownCount(stats: {
  averagePnLPercentage?: number | null;
  maxDrawdown?: number | null;
  drawdownCount?: number | null;
}): { recoveryFactor: number; drawdownCount: number } {
  const pnlPct = stats.averagePnLPercentage ?? 0;
  const maxDD = stats.maxDrawdown ?? 0;
  const recoveryFactor = maxDD > 0 ? pnlPct / maxDD : 0;

  const drawdownCount = stats.drawdownCount ?? 0;

  return { recoveryFactor, drawdownCount };
}
