/** High cap so users can save as many markets as they want; prevents unbounded growth. */
const MAX_SAVED_MARKETS = 500;

/**
 * Merges a selected market into the user's saved_markets list (user_settings).
 * Adds to the front (most recent first), case-insensitive deduplication.
 * Capped at MAX_SAVED_MARKETS.
 */
export function mergeMarketIntoSaved(
  market: string,
  savedMarkets: string[]
): string[] {
  const trimmed = market.trim();
  if (!trimmed) return savedMarkets;

  const upper = trimmed.toUpperCase();
  const without = savedMarkets.filter(
    (m) => m.trim().toUpperCase() !== upper
  );
  const merged = [trimmed, ...without].slice(0, MAX_SAVED_MARKETS);
  return merged;
}
