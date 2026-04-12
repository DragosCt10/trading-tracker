/**
 * Returns `path` iff it is a safe relative path to redirect a user to after
 * authentication. Returns `null` otherwise. Used client-side to prevent
 * open-redirect attacks via `?redirectTo=...` query params.
 *
 * Rejects:
 * - null / empty
 * - anything not starting with `/`
 * - protocol-relative URLs (`//evil.com/...`)
 * - paths containing `:` (catches `javascript:`, `data:`, etc.)
 * - the landing page `/` and all auth routes (prevents post-login loops)
 */
export function safeRedirectPath(path: string | null): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes(':')) {
    return null;
  }
  if (
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/update-password') ||
    path.startsWith('/auth')
  ) {
    return null;
  }
  return path;
}
