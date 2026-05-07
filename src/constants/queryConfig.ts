/**
 * Named React Query cache presets.
 * Use these instead of inline staleTime / gcTime numbers so cache
 * behaviour is consistent across the app and easy to tune in one place.
 */

const MINUTE = 60_000;

/** Accounts, strategies — never stale; user controls refresh manually. */
export const STATIC_DATA = {
  staleTime: Infinity,
  gcTime: Infinity,
} as const;

/** User profile / settings — refresh after 5 minutes. */
export const USER_DATA = {
  staleTime: 5 * MINUTE,
  gcTime: 30 * MINUTE,
} as const;

/** Trade lists — refresh after 10 minutes, evict after 15 minutes. */
export const TRADES_DATA = {
  staleTime: 10 * MINUTE,
  gcTime: 15 * MINUTE,
} as const;

/** Strategy aggregate stats — always refetch (data changes after every trade). */
export const STRATEGY_STATS = {
  staleTime: 0,
  gcTime: 5 * MINUTE,
} as const;

/** Subscription / tier — refresh every 5 min, evict after 10 min. */
export const SUBSCRIPTION_DATA = {
  staleTime: 5 * MINUTE,
  gcTime: 10 * MINUTE,
} as const;

/** Social feed posts — short cache for fresh feel. */
export const FEED_DATA = {
  staleTime: 1 * MINUTE,
  gcTime: 5 * MINUTE,
} as const;

/** Social profiles — refresh every 5 min, evict after 15 min. */
export const SOCIAL_PROFILE_DATA = {
  staleTime: 5 * MINUTE,
  gcTime: 15 * MINUTE,
} as const;

/**
 * Historical OHLC bars (backtest chart). Closed-day bars are immutable, so
 * we keep them fresh forever in the client cache and let the server route's
 * `unstable_cache` handle the today/yesterday cutoff. gc after 30 min so
 * symbol-hopping users don't bloat memory indefinitely.
 */
export const MARKET_DATA = {
  staleTime: Infinity,
  gcTime: 30 * MINUTE,
} as const;
