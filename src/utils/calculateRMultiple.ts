import { Trade } from "@/types/trade";

/** Minimal shape needed for RR calculation (shared by client Trade and server row) */
export interface RRStatsTrade {
  break_even: boolean | null;
  trade_outcome: string;
  risk_reward_ratio?: number | null;
}

export function calculateRRStats(trades: RRStatsTrade[]): number {
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

/** Same shape as server StrategyStatsRow — used for strategy list cards from cached trades */
export interface StrategyStatsRow {
  totalTrades: number;
  winRate: number;
  avgRR: number;
  totalRR: number;
}

/**
 * Compute strategy stats from a list of trades (executed-only for consistency with server).
 * Use this when you already have trades in memory (e.g. from all-strategy-trades cache).
 */
export function computeStrategyStatsRowFromTrades(trades: Trade[]): StrategyStatsRow {
  const executed = trades.filter((t) => t.executed !== false);
  let nonBEWins = 0;
  let nonBELosses = 0;
  const validRRs: number[] = [];

  executed.forEach((trade) => {
    if (!trade.break_even) {
      if (trade.trade_outcome === "Win") nonBEWins++;
      else if (trade.trade_outcome === "Lose") nonBELosses++;
    }
    if (trade.risk_reward_ratio != null && trade.risk_reward_ratio > 0) {
      validRRs.push(trade.risk_reward_ratio);
    }
  });

  const totalTrades = executed.length;
  const denomExBE = nonBEWins + nonBELosses;
  const winRate = denomExBE > 0 ? (nonBEWins / denomExBE) * 100 : 0;
  const avgRR = validRRs.length > 0 ? validRRs.reduce((a, b) => a + b, 0) / validRRs.length : 0;
  const totalRR = calculateRRStats(executed);

  return { totalTrades, winRate, avgRR, totalRR };
}
