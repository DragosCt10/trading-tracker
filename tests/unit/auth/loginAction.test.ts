/**
 * Unit tests for loginAction.
 * Covers: success path, wrong password, missing fields.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mocks ────────────────────────────────────────────────────────────────

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
import { ensureDefaultAccount } from '@/lib/server/accounts';

// ── helpers ───────────────────────────────────────────────────────────────

function makeFormData(email: string, password: string): FormData {
  const fd = new FormData();
  fd.set('email', email);
  fd.set('password', password);
  return fd;
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('loginAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('returns {} on success and calls revokeOtherSessions + ensureDefaultAccount', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const result = await loginAction(null, makeFormData('user@example.com', 'secret'));

    expect(result).toEqual({});
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret',
    });
    // revokeOtherSessions calls signOut({ scope: 'others' })
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'others' });
    expect(ensureDefaultAccount).toHaveBeenCalledOnce();
  });

  it('returns error on wrong password and does NOT call revokeOtherSessions', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } });

    const result = await loginAction(null, makeFormData('user@example.com', 'wrong'));

    expect(result).toEqual({ error: 'Invalid credentials' });
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(ensureDefaultAccount).not.toHaveBeenCalled();
  });

  it('returns validation error when email is missing', async () => {
    const result = await loginAction(null, makeFormData('', 'secret'));

    expect(result).toEqual({ error: 'Email and password are required' });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('returns validation error when password is missing', async () => {
    const result = await loginAction(null, makeFormData('user@example.com', ''));

    expect(result).toEqual({ error: 'Email and password are required' });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});
