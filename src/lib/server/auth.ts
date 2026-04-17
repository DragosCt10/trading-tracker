'use server';

import { type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { ensureDefaultAccount } from '@/lib/server/accounts';
import { persistNewsletterForUser } from '@/lib/server/settings';
import { isPasswordStrong } from '@/utils/passwordValidation';

// Schemas at the server-action trust boundary. Explicit per-action shapes
// are simpler and more type-safe than a single picked schema under Zod 4.
const EmailField = z.string().trim().email('Please enter a valid email address');
const PasswordField = z.string().min(1, 'Password is required');
const RedirectToField = z.string().url('Invalid redirect URL');

const LoginSchema = z.object({ email: EmailField, password: PasswordField });
const SignupSchema = z.object({ email: EmailField, password: PasswordField, redirectTo: RedirectToField, newsletterSubscribed: z.string().optional() });
const ResetPasswordSchema = z.object({ email: EmailField, redirectTo: RedirectToField });
const UpdatePasswordSchema = z.object({ password: PasswordField });
const UpdateEmailSchema = z.object({ email: EmailField });

function firstZodError(result: { success: false; error: z.ZodError }): string {
  return result.error.issues[0]?.message ?? 'Invalid form submission';
}

export async function revokeOtherSessions(supabase: SupabaseClient): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) console.error('[auth] revokeOtherSessions error:', error);
  } catch (err) {
    console.error('[auth] Failed to revoke other sessions:', err);
  }
}

export type AuthResult = { error?: string; requiresEmailConfirmation?: boolean };

/** Map Supabase auth error messages to user-safe messages. */
function sanitizeAuthError(error: { message: string }): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return 'Invalid email or password';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Unable to create account. Please try a different email or sign in.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many requests. Please try again later.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (msg.includes('password')) {
    return 'Password does not meet requirements.';
  }
  return 'Something went wrong. Please try again.';
}

/** Resolve the trusted app origin: env var first, then request headers as fallback. */
async function getAppOrigin(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    try { return new URL(envUrl).origin; } catch { /* malformed env var */ }
  }
  const h = await headers();
  // x-forwarded-proto may contain multiple values (e.g. "https, https") when
  // behind chained proxies — take only the first.
  const proto = (h.get('x-forwarded-proto') ?? 'https').split(',')[0].trim();
  const host = h.get('host');
  if (host) return `${proto}://${host}`;
  return 'http://localhost:3000';
}

/** Strip www. prefix from a URL origin for comparison (www vs non-www are the same site). */
function normalizeOrigin(origin: string): string {
  return origin.replace('://www.', '://');
}

/** Validate that redirectTo points at this app's origin (not a foreign host). */
async function isValidRedirectTo(redirectTo: string): Promise<boolean> {
  try {
    const redirectOrigin = normalizeOrigin(new URL(redirectTo).origin);
    const appOrigin = normalizeOrigin(await getAppOrigin());
    return redirectOrigin === appOrigin;
  } catch {
    return false;
  }
}

export async function loginAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstZodError(parsed) };
  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[auth] loginAction error:', error.message);
    return { error: sanitizeAuthError(error) };
  }
  await revokeOtherSessions(supabase);
  // ensureDefaultAccount is best-effort — a failure here must not report
  // the login as failed. The user is already authenticated; the next request
  // can retry account creation.
  try {
    await ensureDefaultAccount();
  } catch (err) {
    console.error('[auth] ensureDefaultAccount (post-login) failed:', err);
  }
  return {};
}

export async function signupAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstZodError(parsed) };
  const { email, password, redirectTo, newsletterSubscribed } = parsed.data;
  const wantsNewsletter = newsletterSubscribed !== 'false';

  if (!await isValidRedirectTo(redirectTo)) {
    return { error: 'Invalid redirect URL' };
  }

  if (!isPasswordStrong(password)) {
    return { error: 'Password does not meet strength requirements' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    console.error('[auth] signupAction error:', error.message);
    return { error: sanitizeAuthError(error) };
  }

  // Persist newsletter preference best-effort (admin client — no session needed).
  try {
    if (data.user?.id) persistNewsletterForUser(data.user.id, wantsNewsletter);
  } catch (err) {
    console.error('[auth] persistNewsletterForUser (post-signup) failed:', err);
  }

  // session is null when email confirmation is required; ensureDefaultAccount
  // will be called in the auth callback after the user confirms their email.
  if (!data.session) {
    return { requiresEmailConfirmation: true };
  }

  try {
    await ensureDefaultAccount();
  } catch (err) {
    console.error('[auth] ensureDefaultAccount (post-signup) failed:', err);
  }
  return {};
}

export async function resetPasswordAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const parsed = ResetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstZodError(parsed) };
  const { email, redirectTo } = parsed.data;

  if (!await isValidRedirectTo(redirectTo)) {
    return { error: 'Invalid redirect URL' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error('[auth] resetPasswordAction error:', error.message);
    return { error: sanitizeAuthError(error) };
  }
  return {};
}

export async function updatePasswordAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const parsed = UpdatePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstZodError(parsed) };
  const { password } = parsed.data;

  if (!isPasswordStrong(password)) {
    return { error: 'Password does not meet strength requirements' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error('[auth] updatePasswordAction error:', error.message);
    return { error: sanitizeAuthError(error) };
  }
  await revokeOtherSessions(supabase);
  return {};
}

export async function updateEmailAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const parsed = UpdateEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstZodError(parsed) };
  const { email } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    console.error('[auth] updateEmailAction error:', error.message);
    return { error: sanitizeAuthError(error) };
  }
  return {};
}
