import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ensureDefaultAccount } from '@/lib/server/accounts';
import { safeRedirectTo } from '@/lib/safeRedirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // OAuth provider returned an error (e.g. user cancelled)
  if (error) {
    const url = new URL('/login', origin);
    url.searchParams.set('error', errorDescription ?? error);
    return NextResponse.redirect(url);
  }

  // Validate next — must be a safe relative path to prevent open redirects
  const next = safeRedirectTo(searchParams.get('next') ?? '') ?? '/stats';

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      await ensureDefaultAccount();
      const isLocal = process.env.NODE_ENV === 'development';
      const forwardedProto = request.headers.get('x-forwarded-proto');
      // Use origin (correct host) but upgrade protocol to https when behind a proxy
      const base = isLocal || !forwardedProto
        ? origin
        : origin.replace(/^https?:/, `${forwardedProto}:`);
      return NextResponse.redirect(`${base}${next}`);
    }

    const url = new URL('/login', origin);
    url.searchParams.set('error', exchangeError.message);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL('/login?error=Missing+OAuth+code', origin));
}
