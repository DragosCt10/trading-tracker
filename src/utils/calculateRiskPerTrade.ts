import { Trade } from '@/types/trade';
import { RiskAnalysis, RiskStats } from '@/types/dashboard';

/**
 * Resolve effective outcome for a trade, matching NewTradeModal:
 * - Trade Outcome Win/Lose → use directly.
 * - Trade Outcome BE → use be_final_result (Win/Lose) when set; legacy: trade_outcome may still be Win/Lose.
 */
function resolveOutcome(trade: Trade): 'Win' | 'Lose' | 'BE' | null {
  if (trade.trade_outcome === 'BE' || trade.break_even) {
    if (trade.be_final_result === 'Win' || trade.be_final_result === 'Lose') {
      return trade.be_final_result;
    }
    if (trade.trade_outcome === 'Win' || trade.trade_outcome === 'Lose') {
      return trade.trade_outcome as 'Win' | 'Lose';
    }
    return 'BE';
  }
  if (trade.trade_outcome === 'Win' || trade.trade_outcome === 'Lose') {
    return trade.trade_outcome as 'Win' | 'Lose';
  }
  return null;
}

/**
 * Convert a risk percentage value to a key compatible with parseRiskKey in RiskPerTrade.tsx.
 * e.g. 1 → "risk1", 0.5 → "risk05", 0.25 → "risk025", 1.5 → "risk15"
 */
function riskValueToKey(risk: number): string {
  if (Number.isInteger(risk)) {
    return `risk${risk}`;
  }
  const tenths = Math.round(risk * 10);
  if (Math.abs(tenths / 10 - risk) < 0.0001) {
    return `risk${String(tenths).padStart(2, '0')}`;
  }
  const hundredths = Math.round(risk * 100);
  return `risk${String(hundredths).padStart(3, '0')}`;
}

const emptyStats = (): RiskStats => ({
  total: 0, wins: 0, losses: 0, breakEven: 0, beWins: 0, beLosses: 0, winrate: 0, winrateWithBE: 0,
});

export function calculateRiskPerTradeStats(trades: Trade[]): RiskAnalysis {
  const result: RiskAnalysis = {};

  trades.forEach(trade => {
    const risk = trade.risk_per_trade;
    if (risk == null || Number.isNaN(risk)) return;

    const outcome = resolveOutcome(trade);
    if (outcome === null) return;

    const key = riskValueToKey(risk);
    if (!result[key]) result[key] = emptyStats();

    result[key].total++;

    if (outcome === 'BE') {
      result[key].breakEven++;
    } else if (outcome === 'Win') {
      if (trade.break_even || trade.trade_outcome === 'BE') {
        result[key].breakEven++;
        result[key].beWins++;
      } else {
        result[key].wins++;
      }
    } else if (outcome === 'Lose') {
      if (trade.break_even || trade.trade_outcome === 'BE') {
        result[key].breakEven++;
        result[key].beLosses++;
      } else {
        result[key].losses++;
      }
    }
  });

  // Win rate excluding BE; win rate with BE = wins / (wins + losses + breakEven)
  Object.keys(result).forEach(key => {
    const stats = result[key];
    const decisive = stats.wins + stats.losses;
    stats.winrate = decisive > 0 ? (stats.wins / decisive) * 100 : 0;
    const withBE = stats.wins + stats.losses + stats.breakEven;
    stats.winrateWithBE = withBE > 0 ? (stats.wins / withBE) * 100 : 0;
  });

  return result;
}
