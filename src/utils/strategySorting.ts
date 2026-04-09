import type { StrategiesOverviewResult } from '@/lib/server/strategiesOverview';
import type { Strategy } from '@/types/strategy';

export type SortByOption = 'default' | 'winRate' | 'totalRR' | 'totalTrades';

export const SORT_BY_OPTIONS: ReadonlyArray<{ value: SortByOption; label: string }> = [
  { value: 'default', label: 'Default order' },
  { value: 'winRate', label: 'Win rate (high → low)' },
  { value: 'totalRR', label: 'RR total (high → low)' },
  { value: 'totalTrades', label: 'Total trades (high → low)' },
];

/**
 * Returns the metric used to sort a strategy. Strategies with no overview
 * entry sink to the bottom via NEGATIVE_INFINITY.
 */
export function getStrategySortMetric(
  overview: StrategiesOverviewResult[string] | undefined,
  sortBy: Exclude<SortByOption, 'default'>
): number {
  if (!overview) return Number.NEGATIVE_INFINITY;
  if (sortBy === 'winRate') return overview.winRate;
  if (sortBy === 'totalRR') return overview.totalRR;
  return overview.totalTrades;
}

/**
 * Sort strategies by the selected metric (descending). In `default` mode
 * the input array is returned unchanged — do not create a new reference,
 * so downstream memos see stable identity.
 */
export function sortStrategies(
  strategies: ReadonlyArray<Strategy>,
  sortBy: SortByOption,
  overview: StrategiesOverviewResult | undefined
): ReadonlyArray<Strategy> {
  if (sortBy === 'default') return strategies;
  const metric = sortBy;
  return [...strategies].sort((a, b) => {
    const valueA = getStrategySortMetric(overview?.[a.id], metric);
    const valueB = getStrategySortMetric(overview?.[b.id], metric);
    return valueB - valueA;
  });
}
