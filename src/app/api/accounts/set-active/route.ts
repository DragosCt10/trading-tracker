import { NextRequest, NextResponse } from 'next/server';
import { setActiveAccount, getAllAccountsForUser } from '@/lib/server/accounts';
import { getCachedUserSession } from '@/lib/server/session';
import {
  lastAccountModeCookieName,
  lastAccountIndexCookieName,
  LAST_ACCOUNT_COOKIE_MAX_AGE_DAYS,
} from '@/constants/lastAccountCookie';
import type { TradingMode } from '@/types/trade';

const VALID_MODES: TradingMode[] = ['live', 'demo', 'backtesting'];

// Dedicated API route instead of a Server Action so that switching the active
// account doesn't trigger an RSC re-render of the current route. On heavy
// pages (/stats, /strategy/*) the implicit Server-Action RSC refresh was
// adding 3-5s of latency on top of the DB UPDATE. See ActionBar.tsx `applyWith`.
export async function POST(req: NextRequest) {
  let body: { mode?: unknown; accountId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  const { mode, accountId } = body;

  if (typeof mode !== 'string' || !VALID_MODES.includes(mode as TradingMode)) {
    return NextResponse.json({ error: { message: 'Invalid mode' } }, { status: 400 });
  }
  if (accountId !== null && (typeof accountId !== 'string' || accountId.length === 0)) {
    return NextResponse.json({ error: { message: 'Invalid accountId' } }, { status: 400 });
  }

  const { data, error } = await setActiveAccount(
    mode as TradingMode,
    (accountId as string | null) ?? null
  );

  if (error) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ data: null, error }, { status });
  }

  const response = NextResponse.json({ data, error: null });

  // Persist the last-account preference cookies on the response so the next
  // RSC navigation resolves to the just-activated account. Doing this server-
  // side (instead of the client `setLastAccountPreference` write) is robust
  // against:
  //   - empty/stale client account cache (would yield index=-1)
  //   - client-side cookie write losing the race against an early prefetch
  //   - per-mode index drift between client cache order and DB order
  // We re-fetch the account list with `getAllAccountsForUser` (NOT the cached
  // variant — we need fresh data including the just-activated row) and find
  // the row's position in its per-mode slice, matching exactly what
  // `resolveActiveAccountFromCookies` does on the next request.
  if (data) {
    try {
      const { user } = await getCachedUserSession();
      if (user) {
        const allAccounts = await getAllAccountsForUser(user.id);
        const listForMode = allAccounts.filter((a) => a.mode === data.mode);
        const index = listForMode.findIndex((a) => a.id === data.id);
        if (index >= 0) {
          const maxAge = LAST_ACCOUNT_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
          response.cookies.set(lastAccountModeCookieName(user.id), data.mode, {
            path: '/',
            maxAge,
            sameSite: 'lax',
          });
          response.cookies.set(lastAccountIndexCookieName(user.id), String(index), {
            path: '/',
            maxAge,
            sameSite: 'lax',
          });
        }
      }
    } catch (cookieError) {
      // Non-fatal: client-side `setLastAccountPreference` callers still write
      // cookies as a fallback. Log and proceed.
      console.error('Failed to persist last-account cookies on set-active:', cookieError);
    }
  }

  return response;
}
