import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ensureDefaultAccount } from '@/lib/server/accounts';
import { safeRedirectTo } from '@/lib/safeRedirect';

/**
 * Token-hash based auth confirmation — bypasses PKCE entirely.
 * Used by the Supabase email template for password recovery (and optionally signup).
 *
 * Expected query params:
 *   token_hash - the hashed OTP token from the email
 *   type       - "recovery" | "signup" | "email"
 *   next       - where to redirect after verification (e.g. /update-password)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'recovery' | 'signup' | 'email';
  const next = safeRedirectTo(searchParams.get('next') ?? '') ?? '/stats';

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/login?error=Missing+verification+parameters', origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    console.error('[auth] confirm verifyOtp error:', error.message);
    const url = new URL('/login', origin);
    url.searchParams.set('error', error.message);
    return NextResponse.redirect(url);
  }

  const isRecovery = type === 'recovery';
  if (!isRecovery) {
    await ensureDefaultAccount();
  }

  const isLocal = process.env.NODE_ENV === 'development';
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const base = isLocal || !forwardedProto
    ? origin
    : origin.replace(/^https?:/, `${forwardedProto}:`);

  return NextResponse.redirect(`${base}${next}`);
}
