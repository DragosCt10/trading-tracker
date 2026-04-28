// src/utils/calculateMacroStats.ts
import { Trade } from '@/types/trade';
import { MacroStats } from '@/types/dashboard';
import type { AccountType } from '@/types/account-settings';
import { calculateTradeQualityIndex } from '@/utils/analyticsCalculations';
import { calculateRRStats } from './calculateRMultiple';
import { calcSharpe } from '@/utils/helpers/mathHelpers';
import { DEFAULT_RISK_PCT, DEFAULT_RR } from '@/constants/tradingDefaults';

/**
 * Calculate profitFactor, consistency (excl-BE & incl-BE), Sharpe, and TQI.
 *
 * Branches on `accountType`:
 *   - `'standard'` (default): re-derive P&L from `risk_per_trade × risk_reward_ratio × balance`
 *     (preserved legacy behavior).
 *   - `'futures'`: read the snapshotted `calculated_profit` set at write time by
 *     tradePnlCalculator. The stored value is already signed (+ for win / BE+partials,
 *     − for lose, 0 for BE without partials), so we use it directly. E5 guard: if
 *     a value is non-finite (corrupt row), log + treat as 0 instead of crashing.
 */
export function calculateMacroStats(
  trades: Trade[],
  accountBalance: number,
  accountType: AccountType = 'standard'
): MacroStats {
  const isFutures = accountType === 'futures';

  let grossProfit = 0;
  let grossLoss = 0;

  const dailyNonBEPnl: Record<string, number> = {};
  const dailyAllPnl:   Record<string, number> = {};
  const returnsWithBE: number[] = [];

  for (const t of trades) {
    const day = t.trade_date.slice(0, 10);
    const isRealTrade = !t.break_even || (t.break_even && t.partials_taken);

    if (isFutures) {
      // Futures: read stored signed P&L. NaN guard per plan E5.
      const stored = Number(t.calculated_profit);
      const pnl = Number.isFinite(stored) ? stored : 0;
      if (!Number.isFinite(stored) && process.env.NODE_ENV !== 'production') {
        console.warn(
          '[calculateMacroStats] non-finite calculated_profit on futures trade — treating as 0',
          { tradeId: t.id, market: t.market },
        );
      }

      // profitFactor (only non-BE or BE with partials, contributes when nonzero).
      if (isRealTrade) {
        if (pnl > 0) grossProfit += pnl;
        else if (pnl < 0) grossLoss += Math.abs(pnl);
      }

      // daily PnL excl-BE (real trades only).
      if (isRealTrade) {
        dailyNonBEPnl[day] = (dailyNonBEPnl[day] || 0) + pnl;
      }

      // daily PnL incl-BE (BE without partials contributes 0).
      const pnlWithBE = isRealTrade ? pnl : 0;
      dailyAllPnl[day] = (dailyAllPnl[day] || 0) + pnlWithBE;
      returnsWithBE.push(pnlWithBE);
    } else {
      // Standard path — preserved exactly.
      const pct = t.risk_per_trade ?? DEFAULT_RISK_PCT;
      const riskAmt = accountBalance * (pct / 100);
      const rr = t.risk_reward_ratio ?? DEFAULT_RR;

      // — profitFactor (only non‐BE or BE with partials)
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
