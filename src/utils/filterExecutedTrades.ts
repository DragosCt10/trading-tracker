import { Trade } from '@/types/trade';

/**
 * Filters out trades that have not been executed (executed: false)
 */
export function filterExecutedTrades(trades: Trade[]): Trade[] {
  return trades.filter(trade => trade.executed !== false);
}
