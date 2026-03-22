import type { StrategiesOverviewResult } from '@/lib/server/strategiesOverview';

export interface StrategiesAccountTotals {
  /** Sum of trades across all Stats Boards in scope. */
  totalTrades: number;
  /**
   * Trade-weighted average win rate (0–100), or null when there are no trades.
   * Matches overall wins ÷ total trades when each board’s win rate is applied to its trade count.
   */
  winRatePct: number | null;
}

/**
 * Aggregate total trades and weighted win rate from per–Stats Board overview rows
 * (same data as `StrategyCard` / `getStrategiesOverview`).
 */
export function computeStrategiesAccountTotals(
  strategies: ReadonlyArray<{ id: string }>,
  strategiesOverview: StrategiesOverviewResult | undefined | null
): StrategiesAccountTotals {
  if (!strategies.length || !strategiesOverview) {
    return { totalTrades: 0, winRatePct: null };
  }

  let totalTrades = 0;
  let weightedWinSum = 0;

  for (const s of strategies) {
    const o = strategiesOverview[s.id];
    if (!o) continue;
    totalTrades += o.totalTrades;
    if (o.totalTrades > 0) {
      weightedWinSum += (o.winRate / 100) * o.totalTrades;
    }
  }

  const winRatePct =
    totalTrades > 0 ? (weightedWinSum / totalTrades) * 100 : null;

  return { totalTrades, winRatePct };
}
