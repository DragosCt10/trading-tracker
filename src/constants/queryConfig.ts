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

/**
 * Trade lists and dashboard stats — stale after 10 minutes, evicted after 15 minutes.
 * With refetchOnMount: false (global default), stale data is not auto-refetched on mount,
 * so the 15-minute gcTime keeps results available for fast back-navigation.
 * Trade mutations explicitly invalidate affected query keys so stats stay fresh.
 */
export const TRADES_DATA = {
  staleTime: 10 * MINUTE,
  gcTime: 15 * MINUTE,
} as const;
