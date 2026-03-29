import {
  LAST_ACCOUNT_MODE_COOKIE,
  LAST_ACCOUNT_INDEX_COOKIE,
  LAST_ACCOUNT_COOKIE_MAX_AGE_DAYS,
} from '@/constants/lastAccountCookie';
import type { TradingMode } from '@/types/trade';

/**
 * Sets the last-account preference cookie (mode + index only).
 * Call from client after user changes account so refresh restores the same selection.
 */
export function setLastAccountPreference(mode: TradingMode, index: number): void {
  if (typeof document === 'undefined') return;
  const maxAge = LAST_ACCOUNT_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  const opts = `path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${LAST_ACCOUNT_MODE_COOKIE}=${encodeURIComponent(mode)}; ${opts}`;
  document.cookie = `${LAST_ACCOUNT_INDEX_COOKIE}=${index}; ${opts}`;
}

/**
 * Clears the last-account preference cookies (mode + index) on sign out so a new
 * user/account on this browser doesn't inherit the previous selection.
 */
export function clearLastAccountPreference(): void {
  if (typeof document === 'undefined') return;
  const opts = 'path=/; max-age=0; SameSite=Lax';
  document.cookie = `${LAST_ACCOUNT_MODE_COOKIE}=; ${opts}`;
  document.cookie = `${LAST_ACCOUNT_INDEX_COOKIE}=; ${opts}`;
}
