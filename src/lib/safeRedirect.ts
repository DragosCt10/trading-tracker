/** Only allow relative paths to prevent open redirects. Blocks `//evil.com` and `javascript:`. */
export function safeRedirectTo(pathname: string): string | null {
  if (!pathname || !pathname.startsWith('/')) return null;
  if (pathname.startsWith('//') || pathname.includes(':')) return null;
  return pathname;
}
