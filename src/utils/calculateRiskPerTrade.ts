import { Trade } from '@/types/trade';

interface RiskStats {
  total: number;
  wins: number;
  losses: number;
  breakEven: number;
  beWins: number;
  beLosses: number;
  winrate: number; // winrate as a percentage (0-100), excluding BE
  winrateWithBE: number; // winrate as a percentage (0-100), including BE as wins
}

interface RiskAnalysis {
  risk03: RiskStats;
  risk05: RiskStats;
  risk07: RiskStats;
}

export function calculateRiskPerTradeStats(trades: Trade[]): RiskAnalysis {
  const result: RiskAnalysis = {
    risk03: { total: 0, wins: 0, losses: 0, breakEven: 0, beWins: 0, beLosses: 0, winrate: 0, winrateWithBE: 0 },
    risk05: { total: 0, wins: 0, losses: 0, breakEven: 0, beWins: 0, beLosses: 0, winrate: 0, winrateWithBE: 0 },
    risk07: { total: 0, wins: 0, losses: 0, breakEven: 0, beWins: 0, beLosses: 0, winrate: 0, winrateWithBE: 0 }
  };

  trades.forEach(trade => {
    const risk = trade.risk_per_trade;

    // Helper function to update stats for a risk category
    const updateRiskStats = (riskCategory: keyof RiskAnalysis) => {
      result[riskCategory].total++;

      if (trade.break_even) {
        result[riskCategory].breakEven++;
        // Determine if break even is a BE Win or BE Loss
        if (trade.trade_outcome === 'Win') {
          result[riskCategory].beWins++;
        } else if (trade.trade_outcome === 'Lose') {
          result[riskCategory].beLosses++;
        }
      } else if (trade.trade_outcome === 'Win') {
        result[riskCategory].wins++;
      } else if (trade.trade_outcome === 'Lose') {
        result[riskCategory].losses++;
      }
    };

    // Categorize trades based on risk percentage
    if (risk === 0.3) {
      updateRiskStats('risk03');
    } else if (risk === 0.5) {
      updateRiskStats('risk05');
    } else if (risk === 0.7) {
      updateRiskStats('risk07');
    }
  });

  // Calculate winrate for each risk category
  (['risk03', 'risk05', 'risk07'] as (keyof RiskAnalysis)[]).forEach(riskKey => {
    const stats = result[riskKey];
    const denominator = stats.total - stats.breakEven;
    stats.winrate = denominator > 0 ? (stats.wins / denominator) * 100 : 0;
    // Winrate with BE: (wins + breakEven) / total
    stats.winrateWithBE = stats.total > 0 ? ((stats.wins + stats.breakEven) / stats.total) * 100 : 0;
  });

  return result;
}
