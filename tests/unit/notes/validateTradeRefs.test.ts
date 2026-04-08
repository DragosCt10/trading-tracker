/**
 * Tests for validateTradeRefs — batch trade reference validation.
 *
 * The function takes a supabase client, userId, and refs array directly,
 * but importing it from notes.ts triggers module-level imports that must
 * be mocked even though validateTradeRefs itself does not use them.
 */
import { describe, it, expect, vi } from 'vitest';
import { createMockSupabaseClient } from '../_shared/supabaseMock';
import { validateTradeRefs } from '@/lib/server/notes';
import { makeTradeRef, MOCK_USER_ID } from './_fixtures';

// Module-level imports inside notes.ts that must be stubbed
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/server/session', () => ({ getCachedUserSession: vi.fn() }));
vi.mock('@/lib/server/trades', () => ({ getFullTradesByRefs: vi.fn() }));

describe('validateTradeRefs', () => {
  it('returns null when refs is empty array', async () => {
    const client = createMockSupabaseClient({});
    const result = await validateTradeRefs(client as any, MOCK_USER_ID, []);
    expect(result).toBeNull();
  });

  it('returns null when refs is null/undefined', async () => {
    const client = createMockSupabaseClient({});
    const result = await validateTradeRefs(client as any, MOCK_USER_ID, null as any);
    expect(result).toBeNull();
  });

  it('throws Error for invalid trade mode', async () => {
    const client = createMockSupabaseClient({});
    const badRef = makeTradeRef({ mode: 'invalid' as any });

    await expect(
      validateTradeRefs(client as any, MOCK_USER_ID, [badRef]),
    ).rejects.toThrow('Invalid trade mode: invalid');
  });

  it('groups refs by mode and queries each mode table', async () => {
    const liveRef = makeTradeRef({ id: 'trade-1', mode: 'live' });
    const demoRef = makeTradeRef({ id: 'trade-2', mode: 'demo' });

    const client = createMockSupabaseClient({
      live_trades: { selectData: [{ id: 'trade-1' }] },
      demo_trades: { selectData: [{ id: 'trade-2' }] },
    });

    const result = await validateTradeRefs(client as any, MOCK_USER_ID, [liveRef, demoRef]);
    expect(result).toBeNull();

    // Verify both tables were queried
    expect(client.from).toHaveBeenCalledWith('live_trades');
    expect(client.from).toHaveBeenCalledWith('demo_trades');
  });

  it('returns null when all refs are found', async () => {
    const refs = [
      makeTradeRef({ id: 'trade-a' }),
      makeTradeRef({ id: 'trade-b' }),
    ];

    const client = createMockSupabaseClient({
      live_trades: { selectData: [{ id: 'trade-a' }, { id: 'trade-b' }] },
    });

    const result = await validateTradeRefs(client as any, MOCK_USER_ID, refs);
    expect(result).toBeNull();
  });

  it('returns error string when count does not match', async () => {
    const refs = [
      makeTradeRef({ id: 'trade-a' }),
      makeTradeRef({ id: 'trade-b' }),
    ];

    // Only one row returned for two requested IDs
    const client = createMockSupabaseClient({
      live_trades: { selectData: [{ id: 'trade-a' }] },
    });

    const result = await validateTradeRefs(client as any, MOCK_USER_ID, refs);
    expect(result).toBe('One or more trades not found or access denied (live)');
  });

  it('returns error string when DB query returns error', async () => {
    const refs = [makeTradeRef({ id: 'trade-x' })];

    const client = createMockSupabaseClient({
      live_trades: { selectError: { message: 'DB connection failed' } },
    });

    const result = await validateTradeRefs(client as any, MOCK_USER_ID, refs);
    expect(result).toBe('One or more trades not found or access denied (live)');
  });
});
