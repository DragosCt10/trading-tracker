import { Trade } from "@/types/trade";

export function calculateRRStats(trades: Trade[]): number {
  return trades.reduce((sum, trade) => {
    const rr =
      typeof trade.risk_reward_ratio === "number" && !isNaN(trade.risk_reward_ratio)
        ? trade.risk_reward_ratio
        : 0;

    if (trade.break_even) return sum;          // +0R
    if (trade.trade_outcome === "Win") return sum + rr;  // +Rplanned
    if (trade.trade_outcome === "Lose") return sum - 1;  // -1R always

    return sum;
  }, 0);
}
