/**
 * Regression tests for setActiveAccount (src/lib/server/accounts.ts).
 *
 * Covers the correctness rewrite from 2026-04-09 (see
 * ~/.claude/plans/compressed-twirling-melody.md). The old implementation used
 * a 2-step clear-then-set UPDATE with two latent bugs:
 *
 *   1. TOCTOU / partial-write: clear succeeds, set fails on an accountId that
 *      doesn't exist → caller ends up with no active account in the mode.
 *   2. Authorization ordering: clear ran BEFORE validating accountId belonged
 *      to the caller, so a forged accountId could wipe the caller's active
 *      flag even when the set step matched zero rows.
 *
 * The rewrite uses a single atomic UPDATE gated by user_id + mode + id in the
 * WHERE clause, backed by a BEFORE UPDATE trigger
 * (`account_settings_exclusive_active_trg`) that clears siblings and a partial
 * unique index that prevents concurrent double-active rows. The trigger
 * enforcement is DB-level and out of scope for unit tests; these tests cover
 * the shape of the queries the server action issues and the 4 critical
 * regression paths that are observable at the unit level.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/server/session');
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));

import { getCachedUserSession } from '@/lib/server/session';
import { createClient } from '@/utils/supabase/server';
import { setActiveAccount } from '@/lib/server/accounts';

const mockedGetSession = vi.mocked(getCachedUserSession);
const mockedCreateClient = vi.mocked(createClient);

/**
 * Mock chain builder for `.update(...).eq(...).eq(...).eq(...).select('*').single()`
 * and `.update(...).eq(...).eq(...)` terminals. Captures every .eq() call so
 * tests can assert on the exact WHERE clause the server issues.
 */
function buildUpdateChain(terminal: { data?: unknown; error?: unknown }) {
  const eqCalls: Array<[string, unknown]> = [];
  const chain: Record<string, unknown> = {};

  chain.eq = vi.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return chain;
  });
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve({ data: terminal.data ?? null, error: terminal.error ?? null }));
  // Some chains terminate without .single() (the accountId=null path awaits the .eq(...) chain directly)
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve({ data: terminal.data ?? null, error: terminal.error ?? null }).then(resolve, reject);

  return { chain, eqCalls };
}

function buildSupabaseMock(updateTerminal: { data?: unknown; error?: unknown }) {
  const { chain: updateChain, eqCalls } = buildUpdateChain(updateTerminal);
  const updateSpy = vi.fn((payload: unknown) => {
    (updateChain as Record<string, unknown>)._lastPayload = payload;
    return updateChain;
  });
  const fromSpy = vi.fn((_table: string) => ({
    update: updateSpy,
  }));
  return {
    supabase: { from: fromSpy },
    updateSpy,
    fromSpy,
    eqCalls,
    updateChain,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('setActiveAccount — authorization', () => {
  it('returns Unauthorized and issues no DB writes when no user session', async () => {
    mockedGetSession.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getCachedUserSession>>);
    // createClient should not be called on the unauthorized path, but we stub it anyway
    // so any accidental call fails loudly.
    const { supabase, updateSpy } = buildSupabaseMock({ data: null, error: null });
    mockedCreateClient.mockResolvedValue(supabase as never);

    const result = await setActiveAccount('live', 'acct-123');

    expect(result).toEqual({ data: null, error: { message: 'Unauthorized' } });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

describe('setActiveAccount — atomic activation', () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({
      user: { id: 'user-abc', email: 't@example.com' },
    } as Awaited<ReturnType<typeof getCachedUserSession>>);
  });

  it('issues ONE UPDATE with is_active=true gated by id + user_id + mode (no preceding clear step)', async () => {
    const row = {
      id: 'acct-123',
      user_id: 'user-abc',
      name: 'Main',
      mode: 'live',
      currency: 'USD',
      account_balance: 10000,
      is_active: true,
      description: null,
    };
    const { supabase, updateSpy, eqCalls } = buildSupabaseMock({ data: row, error: null });
    mockedCreateClient.mockResolvedValue(supabase as never);

    const result = await setActiveAccount('live', 'acct-123');

    // Exactly one .update() call — the old impl made two (clear + set)
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith({ is_active: true });

    // WHERE clause includes id, user_id, AND mode — user_id gates the write
    // so a forged id cannot bypass authorization.
    expect(eqCalls).toEqual([
      ['id', 'acct-123'],
      ['user_id', 'user-abc'],
      ['mode', 'live'],
    ]);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(row);
  });

  it('returns an error when the UPDATE matches zero rows (forged accountId / IDOR)', async () => {
    // When .single() is called on an empty update result, PostgREST returns
    // an error like 'JSON object requested, multiple (or no) rows returned'.
    // Simulate that path: a foreign accountId doesn't belong to the caller,
    // so the WHERE clause matches zero rows and .single() errors.
    const { supabase, updateSpy, eqCalls } = buildSupabaseMock({
      data: null,
      error: { message: 'JSON object requested, multiple (or no) rows returned' },
    });
    mockedCreateClient.mockResolvedValue(supabase as never);

    const result = await setActiveAccount('live', 'some-other-users-account');

    // The UPDATE still runs, but it runs with the caller's user_id in the
    // WHERE clause — so it can only match rows the caller owns. A forged id
    // produces zero rows, which we surface as an error (not a silent wipe).
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(eqCalls).toContainEqual(['user_id', 'user-abc']);
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });
});

describe('setActiveAccount — deactivation (accountId=null)', () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({
      user: { id: 'user-abc', email: 't@example.com' },
    } as Awaited<ReturnType<typeof getCachedUserSession>>);
  });

  it('issues a scoped UPDATE that clears is_active for the caller in the given mode only', async () => {
    const { supabase, updateSpy, eqCalls } = buildSupabaseMock({ data: null, error: null });
    mockedCreateClient.mockResolvedValue(supabase as never);

    const result = await setActiveAccount('demo', null);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith({ is_active: false });
    // WHERE narrowed to user_id + mode — no cross-user leakage, no cross-mode wipe
    expect(eqCalls).toEqual([
      ['user_id', 'user-abc'],
      ['mode', 'demo'],
    ]);
    expect(result).toEqual({ data: null, error: null });
  });

  it('returns the clear error message when the deactivation UPDATE fails', async () => {
    const { supabase } = buildSupabaseMock({ data: null, error: { message: 'rls-deny' } });
    mockedCreateClient.mockResolvedValue(supabase as never);

    const result = await setActiveAccount('live', null);

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'rls-deny' });
  });
});

/**
 * NOT COVERED BY UNIT TESTS (documented gap, not a shipping blocker):
 *
 *   - Trigger enforcement: the `account_settings_exclusive_active_trg`
 *     BEFORE UPDATE trigger clears sibling is_active rows in the same
 *     (user_id, mode) slice when a row transitions to is_active=true. This
 *     is a DB-level invariant enforced by PostgreSQL and is not observable
 *     through the chainable Supabase mock used here. Integration coverage
 *     would require supabase-local or pg-mem (see the test infra spike
 *     decision gate in the plan; the spike was skipped because the existing
 *     mock is sufficient for the 4 regression paths above).
 *
 *   - Partial unique index: `account_active_per_user_mode` prevents two rows
 *     in the same (user_id, mode) slice from being is_active=true
 *     simultaneously. Also DB-level, also out of unit scope. Verified
 *     manually via Prisma Studio during the rollout.
 */
