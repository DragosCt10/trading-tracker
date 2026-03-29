/**
 * Unit tests for updatePasswordAction.
 * Covers: success path, short password, updateUser failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mocks ────────────────────────────────────────────────────────────────

const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
    },
  })),
}));

vi.mock('@/lib/server/accounts', () => ({
  ensureDefaultAccount: vi.fn(async () => {}),
}));

import { updatePasswordAction } from '@/lib/server/auth';

// ── helpers ───────────────────────────────────────────────────────────────

function makeFormData(password: string): FormData {
  const fd = new FormData();
  fd.set('password', password);
  return fd;
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('updatePasswordAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('returns {} on success and calls revokeOtherSessions', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });

    const result = await updatePasswordAction(null, makeFormData('SuperSecret1!'));

    expect(result).toEqual({});
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'SuperSecret1!' });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'others' });
  });

  it('returns error for weak password and does NOT revoke', async () => {
    const result = await updatePasswordAction(null, makeFormData('short'));

    expect(result).toEqual({ error: 'Password does not meet strength requirements' });
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('returns sanitized error when updateUser fails and does NOT revoke', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Auth error' } });

    const result = await updatePasswordAction(null, makeFormData('SuperSecret1!'));

    expect(result).toEqual({ error: 'Something went wrong. Please try again.' });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
