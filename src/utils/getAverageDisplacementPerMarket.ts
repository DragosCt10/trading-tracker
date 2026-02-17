import { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';
import { Trade } from '@/types/trade';

export function getAverageDisplacementPerMarket(
  filteredTrades: Trade[],
): TradeStatDatum[] {
  // group by market
  const marketMap = new Map<
    string,
    { sum: number; count: number }
  >();

  filteredTrades.forEach((t) => {
    const market = t.market || 'Unknown';
    const d = typeof t.displacement_size === 'number' ? t.displacement_size : 0;

    if (!d || d <= 0) return; // skip zero / invalid

    if (!marketMap.has(market)) {
      marketMap.set(market, { sum: 0, count: 0 });
    }

    const entry = marketMap.get(market)!;
    entry.sum += d;
    entry.count += 1;
  });

  // convert to TradeStatDatum[]
  const result: TradeStatDatum[] = Array.from(marketMap.entries()).map(
    ([market, { sum, count }]) => {
      const avg = count > 0 ? sum / count : 0;
      return {
        category: market,
        totalTrades: count,
        value: Number(avg.toFixed(2)), // this is what TradeStatsBarCard will plot in singleValue mode
      };
    },
  );

  // optional: sort by average descending
  result.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return result;
}
