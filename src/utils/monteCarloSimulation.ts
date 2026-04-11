import type { Trade } from '@/types/trade';

/** Minimum fields required from a Trade to run a Monte Carlo simulation. */
export type MonteCarloTradeInput = Pick<Trade, 'break_even' | 'trade_outcome' | 'risk_reward_ratio' | 'calculated_profit'>;

export type MonteCarloPoint = {
  tradeIndex: number;
  // R-multiple cumulative bands
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  // Dollar P&L cumulative bands (sampled from calculated_profit)
  d10: number;
  d25: number;
  d50: number;
  d75: number;
  d90: number;
};

/**
 * Runs a Monte Carlo simulation by sampling with replacement from historical trade outcomes.
 * Returns both R-multiple and dollar P&L percentile bands at each future trade step.
 * R and dollar are sampled from the same trade index per step so they stay correlated.
 *
 * @param trades         Historical trades to sample from
 * @param simulations    Number of random paths to generate (default: 500)
 * @param futureTrades   Number of future trades to simulate (default: 50)
 */
export function runMonteCarloSimulation(
  trades: MonteCarloTradeInput[],
  simulations = 500,
  futureTrades = 50
): MonteCarloPoint[] {
  // Build paired outcome array: { r, dollar }
  const outcomes = trades.map((t) => ({
    r:
      t.break_even || t.trade_outcome === 'BE'
        ? 0
        : t.trade_outcome === 'Win'
          ? (t.risk_reward_ratio ?? 0) > 0 ? t.risk_reward_ratio! : 2
          : -1,
    dollar: t.calculated_profit ?? 0,
  }));

  if (outcomes.length === 0) return [];

  const n = outcomes.length;

  // Build simulation paths for both R and dollar simultaneously
  const rPaths: number[][] = [];
  const dPaths: number[][] = [];

  for (let s = 0; s < simulations; s++) {
    const rPath = new Array<number>(futureTrades);
    const dPath = new Array<number>(futureTrades);
    let rCum = 0;
    let dCum = 0;

    for (let i = 0; i < futureTrades; i++) {
      // Same random index ensures R and dollar are correlated per trade
      const idx = Math.floor(Math.random() * n);
      rCum += outcomes[idx].r;
      dCum += outcomes[idx].dollar;
      rPath[i] = rCum;
      dPath[i] = dCum;
    }

    rPaths.push(rPath);
    dPaths.push(dPath);
  }

  // Compute percentiles at each step
  const percentile = (sorted: number[], pct: number): number => {
    const idx = (pct / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };

  return Array.from({ length: futureTrades }, (_, stepIndex) => {
    const rVals = rPaths.map((p) => p[stepIndex]).sort((a, b) => a - b);
    const dVals = dPaths.map((p) => p[stepIndex]).sort((a, b) => a - b);

    return {
      tradeIndex: stepIndex + 1,
      p10: percentile(rVals, 10),
      p25: percentile(rVals, 25),
      p50: percentile(rVals, 50),
      p75: percentile(rVals, 75),
      p90: percentile(rVals, 90),
      d10: percentile(dVals, 10),
      d25: percentile(dVals, 25),
      d50: percentile(dVals, 50),
      d75: percentile(dVals, 75),
      d90: percentile(dVals, 90),
    };
  });
}
