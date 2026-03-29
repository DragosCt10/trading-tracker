'use server';

import { type SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { ensureDefaultAccount } from '@/lib/server/accounts';
import { isPasswordStrong } from '@/utils/passwordValidation';

export async function revokeOtherSessions(supabase: SupabaseClient): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) console.error('[auth] revokeOtherSessions error:', error);
  } catch (err) {
    console.error('[auth] Failed to revoke other sessions:', err);
  }
}

export type AuthResult = { error?: string };

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

/** Validate that redirectTo is a relative path on the same origin. */
function isValidRedirectTo(redirectTo: string): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return redirectTo.startsWith(appUrl + '/');
}

export async function loginAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[auth] loginAction error:', error.message);
    return { error: sanitizeAuthError(error) };
  }
  await revokeOtherSessions(supabase);
  await ensureDefaultAccount();
  return {};
}

export async function signupAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirectTo') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  if (!redirectTo) {
    return { error: 'Redirect URL is required' };
  }

  if (!isValidRedirectTo(redirectTo)) {
    return { error: 'Invalid redirect URL' };
  }

  if (!isPasswordStrong(password)) {
    return { error: 'Password does not meet strength requirements' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    console.error('[auth] signupAction error:', error.message);
    return { error: sanitizeAuthError(error) };
  }
  await ensureDefaultAccount();
  return {};
}

export async function resetPasswordAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = (formData.get('email') as string).trim();
  const redirectTo = formData.get('redirectTo') as string;

  if (!email) {
    return { error: 'Email is required' };
  }

  if (!redirectTo) {
    return { error: 'Redirect URL is required' };
  }

  if (!isValidRedirectTo(redirectTo)) {
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
  const password = formData.get('password') as string;

  if (!password || !isPasswordStrong(password)) {
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
  const email = (formData.get('email') as string).trim();

  if (!email) {
    return { error: 'Email is required' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    console.error('[auth] updateEmailAction error:', error.message);
    return { error: sanitizeAuthError(error) };
  }
  return {};
}
