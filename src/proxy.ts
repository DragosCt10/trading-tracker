import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { safeRedirectTo } from '@/lib/safeRedirect';
import { checkShareRateLimit } from '@/lib/shareRateLimit';

/** Paths that do not require an authenticated user (auth pages). */
const AUTH_PATHS = ['/login', '/signup', '/reset-password', '/update-password', '/api/auth'];

/** Public, read-only paths that should never force login (e.g. shared analytics). */
const PUBLIC_PATHS = ['/', '/share', '/pricing', '/terms-of-service', '/privacy-policy', '/refund-policy', '/contact', '/help', '/affiliates'];

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Build Content-Security-Policy with a per-request nonce.
 *
 * script-src uses nonce + strict-dynamic instead of unsafe-inline:
 * - Modern browsers: only scripts carrying the nonce (or dynamically loaded by them) execute.
 *   unsafe-inline is effectively ignored when a nonce is present.
 * - Older browsers: fall back to the domain allowlist.
 * unsafe-eval is still required for GTM's internal tag compiler.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: https://www.googletagmanager.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
    "font-src 'self'",
    "frame-src https://www.googletagmanager.com",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Mutates response headers to add all security headers including nonce-based CSP. */
function setSecurityHeaders(response: NextResponse, nonce: string): void {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
}

/**
 * Build the final NextResponse that:
 * 1. Forwards x-nonce in request headers so server components can read it via headers().
 * 2. Copies Supabase session cookies to preserve auth state (per Supabase middleware docs).
 * 3. Applies all security headers including the nonce-based CSP.
 */
function buildFinalResponse(
  supabaseResponse: NextResponse,
  request: NextRequest,
  nonce: string
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Copy Supabase session cookies — must not be lost or the session breaks.
  supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));

  setSecurityHeaders(response, nonce);
  return response;
}

/** Extract the share token from a /share/strategy/:token or /share/trade/:token path. Returns null for other paths. */
function extractShareToken(pathname: string): string | null {
  const match = pathname.match(/^\/share\/(?:strategy|trade)\/([^/]+)/);
  return match ? match[1] : null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url);

  // Generate a cryptographically random nonce per request.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // --- Share page guard: rate limiting + noindex header ---
  const shareToken = extractShareToken(pathname);
  if (shareToken) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1';

    const { allowed, retryAfter } = await checkShareRateLimit(ip, shareToken);
    if (!allowed) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter ?? 60),
          'Content-Type': 'text/plain',
        },
      });
    }
  }

  if (isAuthPath(pathname) || isPublicPath(pathname)) {
    const { response } = await updateSession(request);
    // updateSession may redirect to /login if it doesn't recognise this auth path —
    // override that redirect so the route handler always runs for auth/public pages.
    const isRedirect = response.status >= 300 && response.status < 400;
    const base = isRedirect ? NextResponse.next() : response;
    const final = buildFinalResponse(base, request, nonce);
    // Defence-in-depth: X-Robots-Tag for bots that ignore <meta robots> (Slack, Discord).
    if (shareToken) final.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return final;
  }

  // Protected pages: use the user already fetched by updateSession — no second getUser() call.
  const { response, user } = await updateSession(request);

  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    const safePath = safeRedirectTo(pathname);
    // Only add redirectTo for non-root paths so we don't get /login?redirectTo=%2F
    if (safePath && safePath !== '/') redirectUrl.searchParams.set('redirectTo', safePath);
    // Stale auth cookies mean the session was revoked (or expired) — show the banner.
    const authCookies = request.cookies.getAll().filter((c) => c.name.startsWith('sb-'));
    if (authCookies.length > 0) redirectUrl.searchParams.set('reason', 'session_replaced');
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Clear stale auth cookies so the login page Supabase client starts fresh.
    for (const cookie of authCookies) {
      redirectResponse.cookies.delete(cookie.name);
    }
    setSecurityHeaders(redirectResponse, nonce);
    return redirectResponse;
  }

  return buildFinalResponse(response, request, nonce);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - update-password (password update page)
     * - reset-password (password reset page)
     * - api (API routes do their own auth; avoids duplicate Supabase auth calls)
     */
    '/((?!_next/static|_next/image|favicon.ico|update-password|signup|reset-password|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
