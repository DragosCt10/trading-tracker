// src/utils/calculateProfit.ts

import { Trade } from '@/types/trade';

export interface ProfitStats {
  /** Sum of PnL for all non-BE trades (static sizing). */
  totalProfit: number;
  /** Average PnL per non-BE trade (static sizing). */
  averageProfit: number;
  /** Total profit as a percentage of the starting balance. */
  averagePnLPercentage: number;
  /** Maximum drawdown (in %) over the trade sequence, excl. BE trades (dynamic sizing). */
  maxDrawdown: number;
}

/**
 * @param trades           Array of trades (will filter out BE for all stats).
 * @param accountBalance   Starting account balance.
 *
 * - **totalProfit**, **averageProfit**, **averagePnLPercentage** use a *static* risk amount (pct of starting balance).
 * - **maxDrawdown** uses the original code's *dynamic* risk amount (pct of running balance) + initial peak=0 logic.
 */
export function calculateProfit(
  trades: Trade[],
  accountBalance: number
): ProfitStats {
  let totalProfit = 0;
  let nonBECount  = 0;

  // For drawdown:
  let runningBalance = accountBalance;
  let peak = 0;
  let maxDrawdown = 0;

  // Take only non-BE trades for drawdown calculation
  const sortedForDrawdown = trades
    .filter(t => !t.break_even)
    .slice()
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  // For profit calculation, include BE trades if they have partials
  const sortedForProfit = trades
    .filter(t => !t.break_even || (t.break_even && t.partials_taken))
    .slice()
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  // Calculate drawdown using only non-BE trades
  for (const t of sortedForDrawdown) {
    const pct = t.risk_per_trade ?? 0.5;
    const rr  = t.risk_reward_ratio ?? 2;

    // --- DYNAMIC‐BALANCE drawdown
    const dynamicAmt = runningBalance * (pct / 100);
    const pnl = t.trade_outcome === 'Win'
      ? dynamicAmt * rr
      : -dynamicAmt;
    runningBalance += pnl;

    if (runningBalance > peak) {
      peak = runningBalance;
    }
    const drawdown = peak > 0
      ? ((peak - runningBalance) / peak) * 100
      : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Calculate profit including BE trades with partials
  for (const t of sortedForProfit) {
    const pct = t.risk_per_trade ?? 0.5;
    const rr = t.risk_reward_ratio ?? 2;
    
    // Calculate profit based on risk_per_trade and account balance
    const riskAmount = accountBalance * (pct / 100);
    const profit = t.trade_outcome === 'Win'
      ? riskAmount * rr
      : -riskAmount;
      
    totalProfit += profit;
    if (!t.break_even) {
      nonBECount++;
    }
  }

  const averageProfit = nonBECount > 0 ? totalProfit / nonBECount : 0;
  const averagePnLPercentage = accountBalance > 0
    ? (totalProfit / accountBalance) * 100
    : 0;

  return {
    totalProfit,
    averageProfit,
    averagePnLPercentage,
    maxDrawdown,
  };
}
