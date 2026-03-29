/**
 * Unit tests for sanitizeAuthError (internal to auth.ts).
 * We test it indirectly via loginAction since it's not exported.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
}));

vi.mock('@/lib/server/accounts', () => ({
  ensureDefaultAccount: vi.fn(async () => {}),
}));

import { loginAction } from '@/lib/server/auth';

function makeFormData(email: string, password: string): FormData {
  const fd = new FormData();
  fd.set('email', email);
  fd.set('password', password);
  return fd;
}

describe('sanitizeAuthError (via loginAction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('maps "Invalid login credentials" to "Invalid email or password"', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const result = await loginAction(null, makeFormData('user@test.com', 'wrong'));
    expect(result).toEqual({ error: 'Invalid email or password' });
  });

  it('maps "User already registered" to generic message', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'User already registered' } });
    const result = await loginAction(null, makeFormData('user@test.com', 'pass'));
    expect(result).toEqual({ error: 'Unable to create account. Please try a different email or sign in.' });
  });

  it('maps rate limit errors', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Rate limit exceeded' } });
    const result = await loginAction(null, makeFormData('user@test.com', 'pass'));
    expect(result).toEqual({ error: 'Too many requests. Please try again later.' });
  });

  it('maps "Email not confirmed" errors', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Email not confirmed' } });
    const result = await loginAction(null, makeFormData('user@test.com', 'pass'));
    expect(result).toEqual({ error: 'Please confirm your email address before signing in.' });
  });

  it('maps password-related errors', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Password should be at least 6 characters' } });
    const result = await loginAction(null, makeFormData('user@test.com', 'pass'));
    expect(result).toEqual({ error: 'Password does not meet requirements.' });
  });

  it('returns generic message for unknown errors', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Some unknown Supabase error' } });
    const result = await loginAction(null, makeFormData('user@test.com', 'pass'));
    expect(result).toEqual({ error: 'Something went wrong. Please try again.' });
  });
});
