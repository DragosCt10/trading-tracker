import {
  LAST_ACCOUNT_COOKIE_MAX_AGE_DAYS,
  LAST_ACCOUNT_MODE_COOKIE_LEGACY,
  LAST_ACCOUNT_INDEX_COOKIE_LEGACY,
  lastAccountModeCookieName,
  lastAccountIndexCookieName,
} from '@/constants/lastAccountCookie';
import type { TradingMode } from '@/types/trade';

const COOKIE_OPTS = () => {
  const maxAge = LAST_ACCOUNT_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  return `path=/; max-age=${maxAge}; SameSite=Lax`;
};
const EXPIRE_OPTS = 'path=/; max-age=0; SameSite=Lax';

/**
 * Sets the last-account preference cookie (mode + index only) for the given
 * user. Cookies are scoped by userId so a different user signing in on the
 * same device does not inherit the previous selection.
 *
 * Also clears any legacy bare-name cookies on first write so stale values
 * from pre-userId-scoping can't leak through the server-side fallback path.
 */
export function setLastAccountPreference(
  userId: string,
  mode: TradingMode,
  index: number
): void {
  if (typeof document === 'undefined') return;
  const opts = COOKIE_OPTS();
  document.cookie = `${lastAccountModeCookieName(userId)}=${encodeURIComponent(mode)}; ${opts}`;
  document.cookie = `${lastAccountIndexCookieName(userId)}=${index}; ${opts}`;
  // Defensive: clear legacy bare cookies so the server-side reader never
  // falls back to them. One-time no-op on modern browsers where the legacy
  // cookies were never set.
  document.cookie = `${LAST_ACCOUNT_MODE_COOKIE_LEGACY}=; ${EXPIRE_OPTS}`;
  document.cookie = `${LAST_ACCOUNT_INDEX_COOKIE_LEGACY}=; ${EXPIRE_OPTS}`;
}

/**
 * Clears the last-account preference cookies for the given user (on sign
 * out) plus the legacy bare cookies. Call from the sign-out handler so a new
 * user/account on this browser doesn't inherit the previous selection.
 */
export function clearLastAccountPreference(userId: string | undefined): void {
  if (typeof document === 'undefined') return;
  if (userId) {
    document.cookie = `${lastAccountModeCookieName(userId)}=; ${EXPIRE_OPTS}`;
    document.cookie = `${lastAccountIndexCookieName(userId)}=; ${EXPIRE_OPTS}`;
  }
  document.cookie = `${LAST_ACCOUNT_MODE_COOKIE_LEGACY}=; ${EXPIRE_OPTS}`;
  document.cookie = `${LAST_ACCOUNT_INDEX_COOKIE_LEGACY}=; ${EXPIRE_OPTS}`;
}
