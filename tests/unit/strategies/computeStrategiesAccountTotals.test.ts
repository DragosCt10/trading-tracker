/**
 * Pure-function tests for computeStrategiesAccountTotals.
 * No mocking required — deterministic inputs → outputs.
 *
 * Covers the trade-weighted aggregate displayed above the Stats Boards grid
 * in src/app/(app)/stats/StrategiesClient.tsx.
 */
import { describe, it, expect } from 'vitest';
import { computeStrategiesAccountTotals } from '@/utils/strategiesAccountTotals';
import type { StrategiesOverviewResult } from '@/lib/server/strategiesOverview';

function row(
  totalTrades: number,
  winRate: number,
  overrides: Partial<StrategiesOverviewResult[string]> = {}
): StrategiesOverviewResult[string] {
  return {
    totalTrades,
    winRate,
    avgRR: 0,
    totalRR: 0,
    totalProfit: 0,
    equityCurve: [],
    ...overrides,
  };
}

describe('computeStrategiesAccountTotals', () => {
  it('returns zero totals and null win rate when strategies array is empty', () => {
    expect(computeStrategiesAccountTotals([], {})).toEqual({
      totalTrades: 0,
      winRatePct: null,
    });
  });

  it('returns zero totals and null win rate when overview is undefined', () => {
    expect(
      computeStrategiesAccountTotals([{ id: 'a' }], undefined)
    ).toEqual({ totalTrades: 0, winRatePct: null });
  });

  it('returns zero totals and null win rate when overview is null', () => {
    expect(computeStrategiesAccountTotals([{ id: 'a' }], null)).toEqual({
      totalTrades: 0,
      winRatePct: null,
    });
  });

  it('returns null win rate when every strategy has zero trades', () => {
    const overview: StrategiesOverviewResult = {
      a: row(0, 0),
      b: row(0, 0),
    };
    expect(
      computeStrategiesAccountTotals([{ id: 'a' }, { id: 'b' }], overview)
    ).toEqual({ totalTrades: 0, winRatePct: null });
  });

  it('sums total trades across all strategies', () => {
    const overview: StrategiesOverviewResult = {
      a: row(10, 50),
      b: row(20, 60),
      c: row(5, 80),
    };
    const result = computeStrategiesAccountTotals(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      overview
    );
    expect(result.totalTrades).toBe(35);
  });

  it('computes trade-weighted win rate correctly', () => {
    // 10 trades @ 50% wins = 5 wins
    // 20 trades @ 60% wins = 12 wins
    // Total: 17 wins / 30 trades = 56.666...%
    const overview: StrategiesOverviewResult = {
      a: row(10, 50),
      b: row(20, 60),
    };
    const result = computeStrategiesAccountTotals(
      [{ id: 'a' }, { id: 'b' }],
      overview
    );
    expect(result.totalTrades).toBe(30);
    expect(result.winRatePct).toBeCloseTo(56.6667, 3);
  });

  it('ignores strategies with no overview entry', () => {
    const overview: StrategiesOverviewResult = {
      a: row(10, 50),
      // 'b' is deliberately absent — new strategy with no trades yet
    };
    const result = computeStrategiesAccountTotals(
      [{ id: 'a' }, { id: 'b' }],
      overview
    );
    expect(result.totalTrades).toBe(10);
    expect(result.winRatePct).toBeCloseTo(50, 3);
  });

  it('includes strategies with zero trades in the total but not the weight', () => {
    // 10 trades @ 40% = 4 wins. Strategy b contributes 0.
    const overview: StrategiesOverviewResult = {
      a: row(10, 40),
      b: row(0, 0),
    };
    const result = computeStrategiesAccountTotals(
      [{ id: 'a' }, { id: 'b' }],
      overview
    );
    expect(result.totalTrades).toBe(10);
    expect(result.winRatePct).toBeCloseTo(40, 3);
  });

  it('handles 100% win rate', () => {
    const overview: StrategiesOverviewResult = {
      a: row(5, 100),
    };
    const result = computeStrategiesAccountTotals([{ id: 'a' }], overview);
    expect(result.winRatePct).toBeCloseTo(100, 3);
  });

  it('handles 0% win rate when trades exist', () => {
    const overview: StrategiesOverviewResult = {
      a: row(7, 0),
    };
    const result = computeStrategiesAccountTotals([{ id: 'a' }], overview);
    expect(result.totalTrades).toBe(7);
    expect(result.winRatePct).toBeCloseTo(0, 3);
  });

  it('does not mutate the input strategies array or overview object', () => {
    const strategies = [{ id: 'a' }, { id: 'b' }];
    const overview: StrategiesOverviewResult = {
      a: row(10, 50),
      b: row(20, 60),
    };
    const strategiesSnapshot = JSON.stringify(strategies);
    const overviewSnapshot = JSON.stringify(overview);
    computeStrategiesAccountTotals(strategies, overview);
    expect(JSON.stringify(strategies)).toBe(strategiesSnapshot);
    expect(JSON.stringify(overview)).toBe(overviewSnapshot);
  });
});
