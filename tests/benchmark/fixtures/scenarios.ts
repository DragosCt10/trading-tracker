/**
 * Named dataset factories for benchmarks.
 *
 * IMPORTANT: These are functions, not constants. Call them OUTSIDE bench()
 * callbacks to avoid measuring data-generation time, not calculation time.
 *
 * Usage:
 *   describe('calculateMacroStats', () => {
 *     let trades: Trade[];
 *     beforeEach(() => { trades = getLarge(); });
 *     afterEach(() => { (trades as unknown) = null; });
 *     bench('30k trades', () => calculateMacroStats(trades, 50_000));
 *   });
 */

import { generateTrades } from './tradeFactory';

/** 1,000 trades — baseline, below the ≤5k cache-first cliff */
export const getSmall    = () => generateTrades(1_000);

/** 4,999 trades — just below the ≤5k cache-first optimization threshold */
export const getAtCliff  = () => generateTrades(4_999);

/** 5,001 trades — just above the ≤5k threshold (forces RPC path) */
export const getAboveCliff = () => generateTrades(5_001);

/** 10,000 trades — medium scale */
export const getLarge    = () => generateTrades(10_000);

/** 30,000 trades — primary stress target (real-world power user scale) */
export const getXLarge   = () => generateTrades(30_000);

/** 100,000 trades — absolute ceiling / stress test (no hard threshold) */
export const getStress   = () => generateTrades(100_000);

/**
 * 30,000 trades with 20+ markets and 50+ unique setup types.
 * Stresses calculateCategoryStats O(n×m) where m = number of unique categories.
 */
export const getDiverse  = () => generateTrades(30_000, { diverse: true });
