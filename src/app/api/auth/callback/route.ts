import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ensureDefaultAccount } from '@/lib/server/accounts';

/** Tiny HTML page that posts a message to the opener and closes itself. */
function popupResponse(type: 'GOOGLE_AUTH_SUCCESS' | 'GOOGLE_AUTH_ERROR', errorMessage?: string) {
  // Unicode-escape < and > so the JSON can't break out of the <script> tag
  const payload = JSON.stringify(errorMessage ? { type, errorMessage } : { type })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
  return new NextResponse(
    `<!DOCTYPE html><html><body><script>
      try { window.opener.postMessage(${payload}, window.location.origin); } catch(_) {}
      window.close();
    </script></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const isPopup = searchParams.get('popup') === '1';

  // OAuth provider returned an error (e.g. user cancelled)
  if (error) {
    const message = errorDescription ?? error;
    if (isPopup) return popupResponse('GOOGLE_AUTH_ERROR', message);
    const url = new URL('/login', origin);
    url.searchParams.set('error', message);
    return NextResponse.redirect(url);
  }

  // Validate next — must be a relative path to prevent open redirects
  let next = searchParams.get('next') ?? '/strategies';
  if (!next.startsWith('/')) next = '/strategies';

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      await ensureDefaultAccount();

      if (isPopup) return popupResponse('GOOGLE_AUTH_SUCCESS');

      // Standard full-page redirect flow
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocal = process.env.NODE_ENV === 'development';
      const base = isLocal ? origin : forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${base}${next}`);
    }

    if (isPopup) return popupResponse('GOOGLE_AUTH_ERROR', exchangeError.message);
    const url = new URL('/login', origin);
    url.searchParams.set('error', exchangeError.message);
    return NextResponse.redirect(url);
  }

  if (isPopup) return popupResponse('GOOGLE_AUTH_ERROR', 'Missing OAuth code');
  return NextResponse.redirect(new URL('/login?error=Missing+OAuth+code', origin));
}
