// src/utils/calculateMacroStats.ts
import { Trade } from '@/types/trade';
import { MacroStats } from '@/types/dashboard';
import { calculateTradeQualityIndex } from './calculateTradeQualityIndex';
import { calculateRRStats } from './calculateRMultiple';

/** Simple sample‐based Sharpe ratio. */
function calcSharpe(returns: number[]): number {
  const n = returns.length;
  if (n < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance =
    returns
      .map(r => (r - mean) ** 2)
      .reduce((a, b) => a + b, 0) /
    (n - 1);
  return variance > 0 ? mean / Math.sqrt(variance) : 0;
}

/**
 * Calculate profitFactor, consistency (excl-BE & incl-BE), Sharpe, and TQI.
 */
export function calculateMacroStats(
  trades: Trade[],
  accountBalance: number
): MacroStats {
  let grossProfit = 0;
  let grossLoss = 0;

  const dailyNonBEPnl: Record<string, number> = {};
  const dailyAllPnl:   Record<string, number> = {};
  const returnsWithBE: number[] = [];

  for (const t of trades) {
    const day = t.trade_date.slice(0, 10);
    const pct = t.risk_per_trade ?? 0.5;
    const riskAmt = accountBalance * (pct / 100);
    const rr = t.risk_reward_ratio ?? 2;

    // — profitFactor (only non‐BE or BE with partials)
    const isRealTrade = !t.break_even || (t.break_even && t.partials_taken);
    if (isRealTrade) {
      if (!t.break_even) {
        if (t.trade_outcome === 'Win') grossProfit += riskAmt * rr;
        else                          grossLoss   += riskAmt;
      } else if (t.break_even && t.partials_taken) {
        // Always treat BE with partials as a win
        grossProfit += riskAmt * rr;
      }
    }

    // — daily PnL excl-BE (non-BE or BE with partials)
    if (!t.break_even || (t.break_even && t.partials_taken)) {
      const pnl = t.trade_outcome === 'Win' ? riskAmt * rr : -riskAmt;
      dailyNonBEPnl[day] = (dailyNonBEPnl[day] || 0) + pnl;
    }

    // — daily PnL incl-BE (BE without partials = 0)
    const pnlWithBE =
      isRealTrade
        ? (t.trade_outcome === 'Win' ? riskAmt * rr : -riskAmt)
        : 0;
    dailyAllPnl[day] = (dailyAllPnl[day] || 0) + pnlWithBE;

    // — build returns array for Sharpe (BE without partials = 0)
    returnsWithBE.push(pnlWithBE);
  }

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

  // consistency excl-BE (per trade, BE with partials always win)
  const realTrades = trades.filter(t => !t.break_even || (t.break_even && t.partials_taken));
  const profitableTrades = realTrades.filter(t =>
    (!t.break_even && t.trade_outcome === 'Win') ||
    (t.break_even && t.partials_taken)
  );
  const consistencyScore = realTrades.length > 0 ? (profitableTrades.length / realTrades.length) * 100 : 0;

  // consistency incl-BE
  const daysAll  = Object.keys(dailyAllPnl).length;
  const posAll   = Object.values(dailyAllPnl).filter(x => x > 0).length;
  const consistencyScoreWithBE = daysAll > 0 ? (posAll / daysAll) * 100 : 0;

  // Sharpe
  const sharpeWithBE = calcSharpe(returnsWithBE);

  // Trade Quality Index
  const tradeQualityIndex = calculateTradeQualityIndex(trades);
  const multipleR = calculateRRStats(trades)

  return {
    profitFactor,
    consistencyScore,
    consistencyScoreWithBE,
    sharpeWithBE,
    tradeQualityIndex,
    multipleR
  };
}
