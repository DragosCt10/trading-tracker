import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { createClient } from '@/utils/supabase/server';

/** Only allow relative path for redirectTo to prevent open redirects. */
function safeRedirectTo(pathname: string): string | null {
  if (!pathname || !pathname.startsWith('/')) return null;
  if (pathname.startsWith('//') || pathname.includes(':')) return null;
  return pathname;
}

/** Apply security headers to a response. */
function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers);
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  const url = new URL(request.url);

  if (url.pathname === '/trades/new') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = new URL('/login', request.url);
      const safePath = safeRedirectTo(url.pathname);
      if (safePath) redirectUrl.searchParams.set('redirectTo', safePath);
      return applySecurityHeaders(NextResponse.redirect(redirectUrl));
    }
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
     */
    '/((?!_next/static|_next/image|favicon.ico|update-password|signup|reset-password|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
