/**
 * Pure function — identical logic to the useMemo in NewTradeModal.
 * Safe to call in a tight loop for any number of trades.
 */
export function calculateTradePnl(
  trade: {
    trade_outcome: string;
    risk_per_trade: number;
    risk_reward_ratio: number;
    break_even: boolean;
  },
  accountBalance: number
): { pnl_percentage: number; calculated_profit: number } {
  if (!accountBalance || trade.break_even) {
    return { pnl_percentage: 0, calculated_profit: 0 };
  }

  const risk = Number(trade.risk_per_trade) || 0;
  const rr = Number(trade.risk_reward_ratio) || 0;
  const pnlPct = trade.trade_outcome === 'Lose' ? -risk : risk * rr;

  return {
    pnl_percentage: pnlPct,
    calculated_profit: (pnlPct / 100) * accountBalance,
  };
}
