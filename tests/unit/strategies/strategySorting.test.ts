/**
 * Pure-function tests for strategy sorting helpers used by
 * src/app/(app)/stats/StrategiesClient.tsx.
 */
import { describe, it, expect } from 'vitest';
import {
  getStrategySortMetric,
  sortStrategies,
  SORT_BY_OPTIONS,
} from '@/utils/strategySorting';
import type { Strategy } from '@/types/strategy';
import type { StrategiesOverviewResult } from '@/lib/server/strategiesOverview';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStrategy(id: string, overrides: Partial<Strategy> = {}): Strategy {
  return {
    id,
    user_id: 'u1',
    account_id: 'a1',
    name: `Strategy ${id}`,
    slug: id,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    is_active: true,
    extra_cards: [],
    saved_setup_types: [],
    saved_liquidity_types: [],
    saved_tags: [],
    ...overrides,
  };
}

function makeOverviewRow(overrides: {
  totalTrades?: number;
  winRate?: number;
  totalRR?: number;
}): StrategiesOverviewResult[string] {
  return {
    totalTrades: overrides.totalTrades ?? 0,
    winRate: overrides.winRate ?? 0,
    avgRR: 0,
    totalRR: overrides.totalRR ?? 0,
    totalProfit: 0,
    equityCurve: [],
  };
}

// ── getStrategySortMetric ────────────────────────────────────────────────────

describe('getStrategySortMetric', () => {
  it('returns NEGATIVE_INFINITY when overview is undefined', () => {
    expect(getStrategySortMetric(undefined, 'winRate')).toBe(
      Number.NEGATIVE_INFINITY
    );
    expect(getStrategySortMetric(undefined, 'totalRR')).toBe(
      Number.NEGATIVE_INFINITY
    );
    expect(getStrategySortMetric(undefined, 'totalTrades')).toBe(
      Number.NEGATIVE_INFINITY
    );
  });

  it('returns winRate for sortBy=winRate', () => {
    const row = makeOverviewRow({ winRate: 67.5, totalRR: 12, totalTrades: 5 });
    expect(getStrategySortMetric(row, 'winRate')).toBe(67.5);
  });

  it('returns totalRR for sortBy=totalRR', () => {
    const row = makeOverviewRow({ winRate: 67.5, totalRR: 12, totalTrades: 5 });
    expect(getStrategySortMetric(row, 'totalRR')).toBe(12);
  });

  it('returns totalTrades for sortBy=totalTrades', () => {
    const row = makeOverviewRow({ winRate: 67.5, totalRR: 12, totalTrades: 5 });
    expect(getStrategySortMetric(row, 'totalTrades')).toBe(5);
  });
});

// ── sortStrategies ───────────────────────────────────────────────────────────

describe('sortStrategies', () => {
  const strategies = [
    makeStrategy('a'),
    makeStrategy('b'),
    makeStrategy('c'),
  ];
  const overview: StrategiesOverviewResult = {
    a: makeOverviewRow({ totalTrades: 10, winRate: 50, totalRR: 5 }),
    b: makeOverviewRow({ totalTrades: 30, winRate: 70, totalRR: 20 }),
    c: makeOverviewRow({ totalTrades: 5, winRate: 60, totalRR: 15 }),
  };

  it('returns the same reference in default mode (no clone)', () => {
    expect(sortStrategies(strategies, 'default', overview)).toBe(strategies);
  });

  it('sorts by winRate descending', () => {
    const sorted = sortStrategies(strategies, 'winRate', overview);
    expect(sorted.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by totalRR descending', () => {
    const sorted = sortStrategies(strategies, 'totalRR', overview);
    expect(sorted.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by totalTrades descending', () => {
    const sorted = sortStrategies(strategies, 'totalTrades', overview);
    expect(sorted.map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('sinks strategies without an overview entry to the bottom', () => {
    const withNewboard = [
      makeStrategy('a'),
      makeStrategy('newboard'), // no overview row
      makeStrategy('b'),
    ];
    const sorted = sortStrategies(withNewboard, 'winRate', overview);
    expect(sorted.map((s) => s.id)).toEqual(['b', 'a', 'newboard']);
  });

  it('handles undefined overview (before first fetch resolves)', () => {
    const sorted = sortStrategies(strategies, 'winRate', undefined);
    // Every strategy resolves to NEGATIVE_INFINITY — order is unchanged/stable
    expect(sorted).toHaveLength(3);
    expect(new Set(sorted.map((s) => s.id))).toEqual(
      new Set(['a', 'b', 'c'])
    );
  });

  it('does not mutate the input array when sorting', () => {
    const snapshot = strategies.map((s) => s.id);
    sortStrategies(strategies, 'totalTrades', overview);
    expect(strategies.map((s) => s.id)).toEqual(snapshot);
  });
});

// ── SORT_BY_OPTIONS ──────────────────────────────────────────────────────────

describe('SORT_BY_OPTIONS', () => {
  it('exposes all 4 sort modes with stable ordering', () => {
    expect(SORT_BY_OPTIONS.map((o) => o.value)).toEqual([
      'default',
      'winRate',
      'totalRR',
      'totalTrades',
    ]);
  });

  it('every option has a human-readable label', () => {
    for (const option of SORT_BY_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
    }
  });
});
