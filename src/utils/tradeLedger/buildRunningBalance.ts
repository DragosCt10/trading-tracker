import type { Trade } from '@/types/trade';

export interface LedgerRow {
  trade: Trade;
  runningBalance: number;
  delta: number;
}

export interface LedgerTotals {
  openingBalance: number;
  realizedPnL: number;
  closingBalance: number;
  tradeCount: number;
}

export interface BuildRunningBalanceResult {
  rows: LedgerRow[];
  totals: LedgerTotals;
}

/**
 * Walks closed/executed trades chronologically and produces one ledger row per
 * trade with its running balance. Single source of truth so the PDF ledger
 * rows and the AccountSummary closing figure can never drift.
 *
 * Mirrors the sort used by analyticsCalculations.calculateMaxDrawdown — stable
 * on trade_date, then id.
 */
export function buildRunningBalance(
  trades: Trade[],
  openingBalance: number,
): BuildRunningBalanceResult {
  const executed = trades.filter((t) => t.executed !== false);
  const ordered = executed.slice().sort((a, b) => {
    const da = a.trade_date ?? '';
    const db = b.trade_date ?? '';
    if (da !== db) return da < db ? -1 : 1;
    const ta = a.trade_time ?? '';
    const tb = b.trade_time ?? '';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });

  let balance = openingBalance;
  let realized = 0;
  const rows: LedgerRow[] = [];

  for (const trade of ordered) {
    const delta =
      typeof trade.calculated_profit === 'number'
        ? trade.calculated_profit
        : 0;
    balance += delta;
    realized += delta;
    rows.push({ trade, runningBalance: balance, delta });
  }

  return {
    rows,
    totals: {
      openingBalance,
      realizedPnL: realized,
      closingBalance: balance,
      tradeCount: rows.length,
    },
  };
}
