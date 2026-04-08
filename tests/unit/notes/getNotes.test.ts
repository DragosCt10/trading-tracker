/**
 * Tests for getNotes server action.
 *
 * Covers: auth guard (throws), unfiltered fetch, strategy filtering,
 * "no strategy" client-side filter, strategy batch fetch, trade summary
 * resolution, invalid trade mode skipping, and error/empty-data paths.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/server/session', () => ({ getCachedUserSession: vi.fn() }));
vi.mock('@/lib/server/trades', () => ({ getFullTradesByRefs: vi.fn() }));

import { createMockSupabaseClient } from '../_shared/supabaseMock';
import {
  MOCK_USER_ID,
  MOCK_OTHER_USER_ID,
  MOCK_USER,
  MOCK_STRATEGY_ID,
  makeNoteRow,
  makeStrategy,
  makeTradeRef,
  makeTradeSummary,
} from './_fixtures';
import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import { getNotes } from '@/lib/server/notes';

describe('getNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedUserSession).mockResolvedValue({ user: MOCK_USER } as any);
  });

  // ── 1. Auth: no session ──────────────────────────────────────────────
  it('throws Unauthorized when no user session', async () => {
    vi.mocked(getCachedUserSession).mockResolvedValue({ user: null } as any);

    await expect(getNotes(MOCK_USER_ID)).rejects.toThrow('Unauthorized');
  });

  // ── 2. Auth: user ID mismatch ────────────────────────────────────────
  it('throws Unauthorized when user.id does not match', async () => {
    vi.mocked(getCachedUserSession).mockResolvedValue({
      user: { id: MOCK_OTHER_USER_ID, email: 'other@example.com' },
    } as any);

    await expect(getNotes(MOCK_USER_ID)).rejects.toThrow('Unauthorized');
  });

  // ── 3. Returns all notes when no filter ──────────────────────────────
  it('returns all notes when no filter', async () => {
    const notesData = [
      makeNoteRow({ id: 'n1', strategy: null, strategy_ids: [], trade_refs: [] }),
      makeNoteRow({ id: 'n2', strategy: null, strategy_ids: [], trade_refs: [] }),
    ];

    const mockClient = createMockSupabaseClient({
      notes: { selectData: notesData },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('n1');
    expect(result[1].id).toBe('n2');
  });

  // ── 4. Applies .or() filter for specific strategy ID ─────────────────
  it('returns notes when filtering by a specific strategy ID', async () => {
    const notesData = [
      makeNoteRow({
        id: 'n1',
        strategy_id: MOCK_STRATEGY_ID,
        strategy_ids: [MOCK_STRATEGY_ID],
        strategy: makeStrategy(),
        trade_refs: [],
      }),
    ];

    const mockClient = createMockSupabaseClient({
      notes: { selectData: notesData },
      strategies: { selectData: [makeStrategy()] },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID, { strategyId: MOCK_STRATEGY_ID });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n1');
  });

  // ── 5. Filters notes with no strategy when strategyId is null ────────
  it('filters notes with no strategy when strategyId is null', async () => {
    const notesData = [
      // Note A: has strategy_id set -> filtered OUT
      makeNoteRow({ id: 'nA', strategy_id: 'strat-1', strategy_ids: [], trade_refs: [] }),
      // Note B: has strategy_ids set -> filtered OUT
      makeNoteRow({ id: 'nB', strategy_id: null, strategy_ids: ['strat-2'], trade_refs: [] }),
      // Note C: both null/empty -> kept
      makeNoteRow({ id: 'nC', strategy_id: null, strategy_ids: [], trade_refs: [] }),
    ];

    const mockClient = createMockSupabaseClient({
      notes: { selectData: notesData },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID, { strategyId: null });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('nC');
  });

  // ── 6. Excludes notes with non-null strategy_id when filter is null ──
  it('excludes notes with non-null strategy_id when filter is null', async () => {
    const notesData = [
      makeNoteRow({ id: 'nX', strategy_id: 'strat-99', strategy_ids: [], trade_refs: [] }),
      makeNoteRow({ id: 'nY', strategy_id: null, strategy_ids: [], trade_refs: [] }),
    ];

    const mockClient = createMockSupabaseClient({
      notes: { selectData: notesData },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID, { strategyId: null });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('nY');
  });

  // ── 7. Excludes notes with non-empty strategy_ids when filter is null ─
  it('excludes notes with non-empty strategy_ids when filter is null', async () => {
    const notesData = [
      makeNoteRow({ id: 'nP', strategy_id: null, strategy_ids: ['strat-5', 'strat-6'], trade_refs: [] }),
      makeNoteRow({ id: 'nQ', strategy_id: null, strategy_ids: [], trade_refs: [] }),
    ];

    const mockClient = createMockSupabaseClient({
      notes: { selectData: notesData },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID, { strategyId: null });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('nQ');
  });

  // ── 8. Fetches unique strategy_ids and maps to strategy objects ───────
  it('fetches unique strategy_ids and maps to strategy objects', async () => {
    const strat1 = makeStrategy({ id: 's1', name: 'Strategy One', slug: 'strategy-one' });
    const strat2 = makeStrategy({ id: 's2', name: 'Strategy Two', slug: 'strategy-two' });

    const notesData = [
      makeNoteRow({
        id: 'n1',
        strategy_id: null,
        strategy_ids: ['s1', 's2'],
        strategy: null,
        trade_refs: [],
      }),
    ];

    const mockClient = createMockSupabaseClient({
      notes: { selectData: notesData },
      strategies: { selectData: [strat1, strat2] },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].strategies).toEqual([strat1, strat2]);
  });

  // ── 9. Fetches trade summaries grouped by mode ───────────────────────
  it('fetches trade summaries grouped by mode', async () => {
    const liveRef = makeTradeRef({ id: 'trade-live-1', mode: 'live' });
    const demoRef = makeTradeRef({ id: 'trade-demo-1', mode: 'demo' });

    const notesData = [
      makeNoteRow({
        id: 'n1',
        strategy_ids: [],
        strategy: null,
        trade_refs: [liveRef, demoRef],
      }),
    ];

    const liveSummary = makeTradeSummary({ id: 'trade-live-1' });
    const demoSummary = makeTradeSummary({ id: 'trade-demo-1', market: 'BTCUSD' });

    const mockClient = createMockSupabaseClient({
      notes: { selectData: notesData },
      live_trades: { selectData: [liveSummary] },
      demo_trades: { selectData: [demoSummary] },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].linkedTradesFull).toBeDefined();
    expect(result[0].linkedTradesFull).toHaveLength(2);

    const tradeIds = result[0].linkedTradesFull!.map((t) => t.id);
    expect(tradeIds).toContain('trade-live-1');
    expect(tradeIds).toContain('trade-demo-1');
  });

  // ── 10. Skips trade_refs with invalid mode silently ──────────────────
  it('skips trade_refs with invalid mode silently', async () => {
    const validRef = makeTradeRef({ id: 'trade-ok', mode: 'live' });
    // Invalid mode ref — not in VALID_TRADE_MODES set, skipped by `continue`
    const invalidRef = { id: 'trade-bad', mode: 'invalid_mode' };

    const notesData = [
      makeNoteRow({
        id: 'n1',
        strategy_ids: [],
        strategy: null,
        trade_refs: [validRef, invalidRef],
      }),
    ];

    const validSummary = makeTradeSummary({ id: 'trade-ok' });

    const mockClient = createMockSupabaseClient({
      notes: { selectData: notesData },
      live_trades: { selectData: [validSummary] },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID);

    expect(result).toHaveLength(1);
    // Only the valid ref should be resolved; invalid mode skipped
    expect(result[0].linkedTradesFull).toBeDefined();
    expect(result[0].linkedTradesFull).toHaveLength(1);
    expect(result[0].linkedTradesFull![0].id).toBe('trade-ok');
  });

  // ── 11. Returns empty array when Supabase returns error ──────────────
  it('returns empty array when Supabase returns error', async () => {
    const mockClient = createMockSupabaseClient({
      notes: { selectError: { message: 'DB connection failed', code: 'ERROR' } },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID);

    expect(result).toEqual([]);
  });

  // ── 12. Returns empty array when exception is thrown inside try/catch ─
  it('returns empty array when exception is thrown', async () => {
    // createClient succeeds, but .from() throws inside the try block
    const mockClient = createMockSupabaseClient({});
    mockClient.from.mockImplementation(() => {
      throw new Error('Unexpected failure');
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID);

    expect(result).toEqual([]);
  });

  // ── 13. Returns empty array when data is null ─────────────────────────
  it('returns empty array when data is null', async () => {
    const mockClient = createMockSupabaseClient({
      notes: { selectData: null },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as any);

    const result = await getNotes(MOCK_USER_ID);

    expect(result).toEqual([]);
  });
});
