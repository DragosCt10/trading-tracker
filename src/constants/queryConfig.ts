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
