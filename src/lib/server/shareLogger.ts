/**
 * Structured error logger for the public share surface.
 *
 * Includes `share_id` and `route` so errors can be correlated to a specific
 * share without scanning raw console output. Swap `console.error` for a
 * proper error tracker (Sentry, Axiom, etc.) in one place when ready.
 */
export function logShareError(
  context: { route: string; shareId?: string; token?: string },
  message: string,
  error?: unknown
): void {
  console.error(`[share:${context.route}]`, {
    message,
    ...(context.shareId ? { shareId: context.shareId } : {}),
    ...(context.token ? { token: context.token.slice(0, 8) + '…' } : {}), // partial token only
    error: error instanceof Error ? error.message : error,
  });
}
