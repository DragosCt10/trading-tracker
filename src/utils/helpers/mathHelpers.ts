/**
 * Shared math primitives.
 * These are pure functions with no side effects — safe to import anywhere.
 */

/**
 * Population standard deviation (divides by n).
 * Used for R-multiple stability in TQI calculations.
 */
export function stdDev(values: number[]): number {
  const n = values.length;
  if (!n) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => {
    const diff = v - mean;
    return sum + diff * diff;
  }, 0) / n;
  return Math.sqrt(variance);
}

/**
 * Sample-based Sharpe ratio (divides variance by n-1).
 * Returns mean / stdDev of the returns array, or 0 when < 2 data points.
 */
export function calcSharpe(returns: number[]): number {
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
