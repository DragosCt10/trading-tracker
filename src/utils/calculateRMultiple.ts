import { Trade } from "@/types/trade";

/**
 * Returns the total R-multiple for all trades.
 */
export function calculateRRStats(trades: Trade[]): number {
  const totalR = trades.reduce((sum, trade) => {
    const rr =
      typeof trade.risk_reward_ratio === "number" && !isNaN(trade.risk_reward_ratio)
        ? trade.risk_reward_ratio
        : 0;

    if (trade.break_even) return sum;
    if (trade.trade_outcome === "Win") return sum + rr;
    if (trade.trade_outcome === "Lose") return sum - 1;

    return sum; // fallback
  }, 0);

  return totalR;
}
