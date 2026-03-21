import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { safeRedirectTo } from '@/lib/safeRedirect';

/** Paths that do not require an authenticated user (auth pages). */
const AUTH_PATHS = ['/login', '/signup', '/reset-password', '/update-password', '/api/auth'];

/** Public, read-only paths that should never force login (e.g. shared analytics). */
const PUBLIC_PATHS = ['/', '/share', '/feed'];

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Apply security headers to a response. */
function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers);
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()');
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url);

  if (isAuthPath(pathname) || isPublicPath(pathname)) {
    const { response } = await updateSession(request);
    // updateSession may redirect to /login if it doesn't recognize this auth path —
    // override that redirect so the route handler always runs for auth/public pages.
    const finalResponse =
      response.status >= 300 && response.status < 400
        ? NextResponse.next({ request })
        : response;
    return applySecurityHeaders(finalResponse);
  }

  // Protected pages: use the user already fetched by updateSession — no second getUser() call.
  const { response, user } = await updateSession(request);

  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    const safePath = safeRedirectTo(pathname);
    // Only add redirectTo for non-root paths so we don't get /login?redirectTo=%2F
    if (safePath && safePath !== '/') redirectUrl.searchParams.set('redirectTo', safePath);
    return applySecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  return applySecurityHeaders(response);
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
