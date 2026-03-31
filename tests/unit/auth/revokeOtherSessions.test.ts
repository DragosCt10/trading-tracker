/**
 * Unit tests for revokeOtherSessions helper.
 * Verifies signOut scope and error handling without touching Supabase.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mock helpers -------------------------------------------------------

function makeSupabase(signOutImpl: () => Promise<{ error: { message: string } | null }>) {
  return { auth: { signOut: vi.fn(signOutImpl) } };
}

// --- import after mocks are in place ------------------------------------

// We import the function directly (no module-level mocking needed — it's pure)
import { revokeOtherSessions } from '@/lib/server/auth';

// ── happy path ──────────────────────────────────────────────────────────

describe('revokeOtherSessions', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calls signOut with scope "others"', async () => {
    const supabase = makeSupabase(async () => ({ error: null }));
    await revokeOtherSessions(supabase as any);
    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
  });

  it('does not throw when signOut returns { error }', async () => {
    const supabase = makeSupabase(async () => ({ error: { message: 'network error' } }));
    await expect(revokeOtherSessions(supabase as any)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('does not throw when signOut throws', async () => {
    const supabase = makeSupabase(async () => { throw new Error('timeout'); });
    await expect(revokeOtherSessions(supabase as any)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
