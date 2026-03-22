/**
 * Shared date formatting utilities for social feed components.
 * All functions use `timeZone: 'UTC'` to stay deterministic across
 * server/client renders and avoid hydration mismatches.
 */

/** "Jan 5" — for feed posts, comments, and notifications */
export function formatFeedDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** "Jan 5, 2025" — for trade entry dates (includes year) */
export function formatTradeEntryDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
