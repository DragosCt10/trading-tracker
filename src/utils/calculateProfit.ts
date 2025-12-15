// src/utils/calculateProfit.ts

import { Trade } from '@/types/trade';

export interface ProfitStats {
  /** Sum of calculated_profit for all non-BE trades. */
  totalProfit: number;
  /** Average calculated_profit per non-BE trade. */
  averageProfit: number;
  /** Total profit as a percentage of the starting balance. */
  averagePnLPercentage: number;
  /** Maximum drawdown (in %) over the trade sequence, excl. BE trades (dynamic sizing). */
  maxDrawdown: number;
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
  // Filter non-BE trades only (ignoring all BE and partial trades)
  const nonBETrades = trades
    .filter(t => !t.break_even)
    .slice()
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

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

  // Max drawdown calculation: Track running equity using absolute P/L, find largest relative peak-to-trough drop
  let balanceHistory: number[] = [accountBalance];
  let balance = accountBalance;
  for (const t of nonBETrades) {
    const profit = typeof t.calculated_profit === 'number' ? t.calculated_profit : 0;
    balance += profit;
    balanceHistory.push(balance);
  }

  let peak = balanceHistory[0];
  let maxDrawdown = 0;
  for (let i = 1; i < balanceHistory.length; i++) {
    if (balanceHistory[i] > peak) {
      peak = balanceHistory[i];
    }
    const drawdown = peak > 0 ? ((peak - balanceHistory[i]) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return {
    totalProfit,
    averageProfit,
    averagePnLPercentage,
    maxDrawdown,
  };
}
