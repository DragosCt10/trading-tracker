/**
 * Tests for createNote server action.
 *
 * Covers: auth guard, required field validation, length validation,
 * strategy_id / strategy_ids / trade_refs validation, backward-compat
 * strategy fallback logic, and successful insert with mapped Note return.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/server/session', () => ({ getCachedUserSession: vi.fn() }));
vi.mock('@/lib/server/trades', () => ({ getFullTradesByRefs: vi.fn() }));

import { createMockSupabaseClient, type MockSupabaseClient } from '../_shared/supabaseMock';
import {
  MOCK_USER_ID,
  MOCK_OTHER_USER_ID,
  MOCK_USER,
  MOCK_STRATEGY_ID,
  MOCK_STRATEGY_IDS,
  makeNoteInput,
  makeNoteRow,
  makeStrategy,
} from './_fixtures';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import { createNote } from '@/lib/server/notes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a mock client that passes auth, all validations, and a successful insert. */
function makeDefaultClient(overrides?: Record<string, any>): MockSupabaseClient {
  return createMockSupabaseClient({
    notes: {
      insertData: makeNoteRow({ strategy: makeStrategy() }),
    },
    strategies: {
      singleData: { id: MOCK_STRATEGY_ID },
      selectData: [
        { id: MOCK_STRATEGY_IDS[0], name: 'Strategy 1', slug: 'strategy-1' },
        { id: MOCK_STRATEGY_IDS[1], name: 'Strategy 2', slug: 'strategy-2' },
      ],
    },
    live_trades: {
      selectData: [{ id: 'trade-1' }],
    },
    demo_trades: {
      selectData: [{ id: 'trade-2' }],
    },
    backtesting_trades: {
      selectData: [{ id: 'trade-3' }],
    },
    ...overrides,
  });
}

describe('createNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedUserSession).mockResolvedValue({ user: MOCK_USER } as any);
  });

  // ── 1. Auth: no session ──────────────────────────────────────────────
  it('returns Unauthorized when no user session', async () => {
    vi.mocked(getCachedUserSession).mockResolvedValue({ user: null } as any);

    const result = await createNote(MOCK_USER_ID, makeNoteInput());

    expect(result).toEqual({ data: null, error: { message: 'Unauthorized' } });
  });

  // ── 2. Auth: mismatched user ─────────────────────────────────────────
  it('returns Unauthorized when user.id does not match', async () => {
    vi.mocked(getCachedUserSession).mockResolvedValue({
      user: { id: MOCK_OTHER_USER_ID, email: 'other@example.com' },
    } as any);

    const result = await createNote(MOCK_USER_ID, makeNoteInput());

    expect(result).toEqual({ data: null, error: { message: 'Unauthorized' } });
  });

  // ── 3. Validation: empty title ───────────────────────────────────────
  it('returns error when title is empty', async () => {
    const client = makeDefaultClient();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(MOCK_USER_ID, makeNoteInput({ title: '' }));

    expect(result).toEqual({ data: null, error: { message: 'Title is required' } });
  });

  // ── 4. Validation: whitespace-only content ───────────────────────────
  it('returns error when content is empty', async () => {
    const client = makeDefaultClient();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(MOCK_USER_ID, makeNoteInput({ content: '   ' }));

    expect(result).toEqual({ data: null, error: { message: 'Content is required' } });
  });

  // ── 5. Validation: title exceeds 200 chars ──────────────────────────
  it('returns error when title exceeds 200 chars', async () => {
    const client = makeDefaultClient();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(
      MOCK_USER_ID,
      makeNoteInput({ title: 'a'.repeat(201) }),
    );

    expect(result).toEqual({
      data: null,
      error: { message: 'Title must be 200 characters or less' },
    });
  });

  // ── 6. Validation: title at exactly 200 chars passes ────────────────
  it('allows title at exactly 200 chars', async () => {
    const client = makeDefaultClient();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(
      MOCK_USER_ID,
      makeNoteInput({ title: 'a'.repeat(200) }),
    );

    expect(result.data).not.toBeNull();
    expect(result.error).toBeNull();
  });

  // ── 7. Validation: content exceeds 50,000 chars ─────────────────────
  it('returns error when content exceeds 50,000 chars', async () => {
    const client = makeDefaultClient();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(
      MOCK_USER_ID,
      makeNoteInput({ content: 'x'.repeat(50_001) }),
    );

    expect(result).toEqual({
      data: null,
      error: { message: 'Content must be 50,000 characters or less' },
    });
  });

  // ── 8. Validation: content at exactly 50,000 chars passes ───────────
  it('allows content at exactly 50,000 chars', async () => {
    const client = makeDefaultClient();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(
      MOCK_USER_ID,
      makeNoteInput({ content: 'x'.repeat(50_000) }),
    );

    expect(result.data).not.toBeNull();
    expect(result.error).toBeNull();
  });

  // ── 9. Strategy_id validation: not found / access denied ────────────
  it('returns error when strategy_id does not belong to user', async () => {
    const client = createMockSupabaseClient({
      strategies: {
        singleData: null,
        singleError: { code: 'PGRST116', message: 'not found' },
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(
      MOCK_USER_ID,
      makeNoteInput({ strategy_id: 'nonexistent-strategy' }),
    );

    expect(result).toEqual({
      data: null,
      error: { message: 'Strategy not found or access denied' },
    });
  });

  // ── 10. Strategy_ids validation: count mismatch ─────────────────────
  it('returns error when strategy_ids count does not match', async () => {
    const client = createMockSupabaseClient({
      strategies: {
        // strategy_id check passes (input has no strategy_id, only strategy_ids)
        singleData: null,
        // strategy_ids check: only 1 of 2 found
        selectData: [{ id: MOCK_STRATEGY_IDS[0] }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(
      MOCK_USER_ID,
      makeNoteInput({ strategy_ids: MOCK_STRATEGY_IDS }),
    );

    expect(result).toEqual({
      data: null,
      error: { message: 'One or more strategies not found or access denied' },
    });
  });

  // ── 11. Strategy_ids validation: DB query error ─────────────────────
  it('returns error when strategy_ids DB query errors', async () => {
    const client = createMockSupabaseClient({
      strategies: {
        singleData: null,
        selectData: null,
        selectError: { message: 'DB connection error', code: 'ERROR' },
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(
      MOCK_USER_ID,
      makeNoteInput({ strategy_ids: MOCK_STRATEGY_IDS }),
    );

    expect(result).toEqual({
      data: null,
      error: { message: 'One or more strategies not found or access denied' },
    });
  });

  // ── 12. Trade_refs validation: invalid trades ───────────────────────
  it('returns error when trade_refs contain invalid trades', async () => {
    const client = createMockSupabaseClient({
      live_trades: {
        // Requested 2 IDs but only 1 returned → count mismatch
        selectData: [{ id: 'trade-1' }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(
      MOCK_USER_ID,
      makeNoteInput({
        trade_refs: [
          { id: 'trade-1', mode: 'live' },
          { id: 'trade-nonexistent', mode: 'live' },
        ],
      }),
    );

    expect(result).toEqual({
      data: null,
      error: { message: 'One or more trades not found or access denied (live)' },
    });
  });

  // ── 13. Trade_refs validation: valid trades pass ────────────────────
  it('passes when trade_refs are valid', async () => {
    const client = makeDefaultClient();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(
      MOCK_USER_ID,
      makeNoteInput({
        trade_refs: [{ id: 'trade-1', mode: 'live' }],
      }),
    );

    expect(result.data).not.toBeNull();
    expect(result.error).toBeNull();
  });

  // ── 14. Backward compat: strategy_ids[0] → finalStrategyId ─────────
  it('uses strategy_ids[0] as finalStrategyId when strategy_ids provided', async () => {
    const client = makeDefaultClient();
    vi.mocked(createClient).mockResolvedValue(client as any);

    await createNote(
      MOCK_USER_ID,
      makeNoteInput({
        strategy_id: null,
        strategy_ids: MOCK_STRATEGY_IDS,
      }),
    );

    expect(client._insertSpy).toHaveBeenCalledTimes(1);
    const insertedRow = client._insertSpy.mock.calls[0][0];
    expect(insertedRow.strategy_id).toBe(MOCK_STRATEGY_IDS[0]);
    expect(insertedRow.strategy_ids).toEqual(MOCK_STRATEGY_IDS);
  });

  // ── 15. Backward compat: strategy_id wrapped into strategy_ids ──────
  it('wraps strategy_id into strategy_ids when no strategy_ids', async () => {
    const client = makeDefaultClient();
    vi.mocked(createClient).mockResolvedValue(client as any);

    await createNote(
      MOCK_USER_ID,
      makeNoteInput({
        strategy_id: MOCK_STRATEGY_ID,
        strategy_ids: [],
      }),
    );

    expect(client._insertSpy).toHaveBeenCalledTimes(1);
    const insertedRow = client._insertSpy.mock.calls[0][0];
    expect(insertedRow.strategy_id).toBe(MOCK_STRATEGY_ID);
    expect(insertedRow.strategy_ids).toEqual([MOCK_STRATEGY_ID]);
  });

  // ── 16. Backward compat: both null when neither provided ────────────
  it('sets both to null when neither provided', async () => {
    const client = makeDefaultClient();
    vi.mocked(createClient).mockResolvedValue(client as any);

    await createNote(
      MOCK_USER_ID,
      makeNoteInput({
        strategy_id: null,
        strategy_ids: [],
      }),
    );

    expect(client._insertSpy).toHaveBeenCalledTimes(1);
    const insertedRow = client._insertSpy.mock.calls[0][0];
    expect(insertedRow.strategy_id).toBeNull();
    expect(insertedRow.strategy_ids).toBeNull();
  });

  // ── 17. Full happy path: insert + mapped Note return ────────────────
  it('inserts note and returns mapped Note on success', async () => {
    const strategyData = makeStrategy();
    const noteRow = makeNoteRow({
      title: 'Happy Path Note',
      content: 'Full happy path content',
      strategy_id: MOCK_STRATEGY_ID,
      strategy_ids: [MOCK_STRATEGY_ID],
      is_pinned: true,
      tags: ['test'],
      trade_refs: [{ id: 'trade-1', mode: 'live' }],
      strategy: strategyData,
    });

    const client = createMockSupabaseClient({
      notes: {
        insertData: noteRow,
      },
      strategies: {
        singleData: { id: MOCK_STRATEGY_ID },
        selectData: [{ id: MOCK_STRATEGY_ID, name: 'Test Strategy', slug: 'test-strategy' }],
      },
      live_trades: {
        selectData: [{ id: 'trade-1' }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await createNote(
      MOCK_USER_ID,
      makeNoteInput({
        title: 'Happy Path Note',
        content: 'Full happy path content',
        strategy_id: MOCK_STRATEGY_ID,
        strategy_ids: [MOCK_STRATEGY_ID],
        is_pinned: true,
        tags: ['test'],
        trade_refs: [{ id: 'trade-1', mode: 'live' }],
      }),
    );

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();

    const note = result.data!;
    expect(note.id).toBe(noteRow.id);
    expect(note.user_id).toBe(MOCK_USER_ID);
    expect(note.title).toBe('Happy Path Note');
    expect(note.content).toBe('Full happy path content');
    expect(note.strategy_id).toBe(MOCK_STRATEGY_ID);
    expect(note.is_pinned).toBe(true);
    expect(note.tags).toEqual(['test']);
    expect(note.trade_refs).toEqual([{ id: 'trade-1', mode: 'live' }]);
    expect(note.strategy).toEqual(strategyData);
    expect(note.created_at).toBe(noteRow.created_at);
    expect(note.updated_at).toBe(noteRow.updated_at);
  });
});
