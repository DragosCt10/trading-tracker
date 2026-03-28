'use server';

import { type SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { ensureDefaultAccount } from '@/lib/server/accounts';

export async function revokeOtherSessions(supabase: SupabaseClient): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) console.error('[auth] revokeOtherSessions error:', error);
  } catch (err) {
    console.error('[auth] Failed to revoke other sessions:', err);
  }
}

export type AuthResult = { error?: string };

export async function loginAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  await revokeOtherSessions(supabase);
  await ensureDefaultAccount();
  return {};
}

export async function signupAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirectTo') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  if (!redirectTo) {
    return { error: 'Redirect URL is required' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) return { error: error.message };
  await ensureDefaultAccount();
  return {};
}

export async function resetPasswordAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const redirectTo = formData.get('redirectTo') as string;

  if (!email) {
    return { error: 'Email is required' };
  }

  if (!redirectTo) {
    return { error: 'Redirect URL is required' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) return { error: error.message };
  return {};
}

export async function updatePasswordAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const password = formData.get('password') as string;

  if (!password || password.length < 12) {
    return { error: 'Password must be at least 12 characters' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  await revokeOtherSessions(supabase);
  return {};
}

export async function updateEmailAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) return { error: error.message };
  return {};
}
