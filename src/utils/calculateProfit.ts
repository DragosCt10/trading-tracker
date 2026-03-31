// src/utils/calculateProfit.ts

import { Trade } from '@/types/trade';
import { calculateMaxDrawdown, calculateAverageDrawdown } from '@/utils/analyticsCalculations';

export interface ProfitStats {
  /** Sum of calculated_profit for all non-BE trades. */
  totalProfit: number;
  /** Average calculated_profit per non-BE trade. */
  averageProfit: number;
  /** Total profit as a percentage of the starting balance. */
  averagePnLPercentage: number;
  /** Maximum drawdown (in %) over the trade sequence, excl. BE trades (dynamic sizing). */
  maxDrawdown: number;
  /** Average drawdown (in %) over the equity curve, excl. BE trades. */
  averageDrawdown: number;
}

/**
 * @param trades           Array of trades.
 * @param accountBalance   Starting account balance.
 *
 * - **totalProfit** is the sum of calculated_profit values (absolute currency) for all non-BE trades (ignores partials_taken and all BE trades).
 * - **averageProfit**, **averagePnLPercentage**, and **maxDrawdown** are based on non-BE trades.
 */
export function calculateProfit(
  trades: Trade[],
  accountBalance: number
): ProfitStats {
  // Filter non-BE trades only (ignoring all BE and partial trades).
  // No sort needed here — profit sum is order-independent.
  // (calculateMaxDrawdown / calculateAverageDrawdown sort internally via sortTradesChronologicallyStable.)
  const nonBETrades = trades.filter(t => !t.break_even);

  // Sum calculated_profit for all non-BE trades (stored as absolute currency amounts)
  let totalProfit = 0;
  let nonBECount = nonBETrades.length;
  for (const t of nonBETrades) {
    totalProfit += typeof t.calculated_profit === 'number' ? t.calculated_profit : 0;
  }

  const averageProfit = nonBECount > 0 ? totalProfit / nonBECount : 0;
  const averagePnLPercentage = accountBalance > 0
    ? (totalProfit / accountBalance) * 100
    : 0;

  const maxDrawdown = calculateMaxDrawdown(trades, accountBalance);
  const averageDrawdown = calculateAverageDrawdown(trades, accountBalance);

  return {
    totalProfit,
    averageProfit,
    averagePnLPercentage,
    maxDrawdown,
    averageDrawdown,
  };
}
