/**
 * Single source of truth for paths that don't require an authenticated user.
 *
 * Consumed by both `src/proxy.ts` (route-handler bypass) and
 * `src/utils/supabase/middleware.ts` (redirect-to-login fallback). Keeping
 * the list in one place prevents the two files from drifting and silently
 * redirecting anonymous traffic that should be public.
 *
 * Match semantics: a request matches a public path if its pathname equals the
 * entry exactly OR starts with `${entry}/`. So `/share` matches `/share` and
 * `/share/strategy/abc`, but NOT `/sharepoint`.
 */
export const PUBLIC_PATHS = [
  '/',
  '/share',
  '/pricing',
  '/terms-of-service',
  '/privacy-policy',
  '/refund-policy',
  '/contact',
  '/help',
  '/affiliates',
  '/unsubscribe',
  '/feed',
  '/backtesting',
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
