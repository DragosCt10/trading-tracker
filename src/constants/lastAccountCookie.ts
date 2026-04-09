/**
 * Cookie keys for "last selected account" preference (mode + index only, no ids).
 * Scoped by userId so a different user signing in on the same device does not
 * inherit the previous user's selection. The legacy bare keys are preserved
 * here so migration can clear them; no new writes go to the bare keys.
 */

/** @deprecated Legacy bare cookie name — only cleared, never written. */
export const LAST_ACCOUNT_MODE_COOKIE_LEGACY = 'tt_last_mode';
/** @deprecated Legacy bare cookie name — only cleared, never written. */
export const LAST_ACCOUNT_INDEX_COOKIE_LEGACY = 'tt_last_index';

export const LAST_ACCOUNT_COOKIE_MAX_AGE_DAYS = 365;

/** Returns the userId-scoped cookie name for the last selected mode. */
export function lastAccountModeCookieName(userId: string): string {
  return `tt_last_mode_${userId}`;
}

/** Returns the userId-scoped cookie name for the last selected account index. */
export function lastAccountIndexCookieName(userId: string): string {
  return `tt_last_index_${userId}`;
}
