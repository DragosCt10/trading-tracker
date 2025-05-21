// src/utils/calculateMacroStats.ts
import { Trade } from '@/types/trade';
import { MacroStats } from '@/types/dashboard';

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
 * Calculate profitFactor, consistency (excl-BE & incl-BE), and Sharpe.
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

    // — profitFactor (only non‐BE)
    if (!t.break_even) {
      if (t.trade_outcome === 'Win') grossProfit += riskAmt * rr;
      else                          grossLoss   += riskAmt;
    }

    // — daily PnL excl-BE
    if (!t.break_even) {
      const pnl = t.trade_outcome === 'Win' ? riskAmt * rr : -riskAmt;
      dailyNonBEPnl[day] = (dailyNonBEPnl[day] || 0) + pnl;
    }

    // — daily PnL incl-BE (BE contributes 0)
    const pnlWithBE =
      t.break_even
        ? 0
        : t.trade_outcome === 'Win'
          ? riskAmt * rr
          : -riskAmt;
    dailyAllPnl[day] = (dailyAllPnl[day] || 0) + pnlWithBE;

    // — build returns array for Sharpe (BE=0)
    returnsWithBE.push(pnlWithBE);
  }

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

  // consistency excl-BE
  const daysNE   = Object.keys(dailyNonBEPnl).length;
  const posNE    = Object.values(dailyNonBEPnl).filter(x => x > 0).length;
  const consistencyScore = daysNE > 0 ? (posNE / daysNE) * 100 : 0;

  // consistency incl-BE
  const daysAll  = Object.keys(dailyAllPnl).length;
  const posAll   = Object.values(dailyAllPnl).filter(x => x > 0).length;
  const consistencyScoreWithBE = daysAll > 0 ? (posAll / daysAll) * 100 : 0;

  // Sharpe
  const sharpeWithBE = calcSharpe(returnsWithBE);

  return {
    profitFactor,
    consistencyScore,
    consistencyScoreWithBE,
    sharpeWithBE,
  };
}
