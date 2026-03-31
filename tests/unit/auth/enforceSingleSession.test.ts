/**
 * Unit tests for POST /api/auth/enforce-single-session.
 * Covers: authenticated user, no session.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mocks ────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  })),
}));

// Import after mocks
import { POST } from '@/app/api/auth/enforce-single-session/route';

// ── tests ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/enforce-single-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('returns 200 and calls signOut({ scope: "others" }) when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'others' });
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'No session' });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
