/**
 * Tests for updateNote server action.
 *
 * Covers: auth guard, empty/length validation, ownership check,
 * strategy/strategy_ids/trade_refs validation, strategy-syncing logic,
 * and partial update payloads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/server/session', () => ({ getCachedUserSession: vi.fn() }));
vi.mock('@/lib/server/trades', () => ({ getFullTradesByRefs: vi.fn() }));

import { createMockSupabaseClient } from '../_shared/supabaseMock';
import {
  MOCK_USER_ID,
  MOCK_OTHER_USER_ID,
  MOCK_NOTE_ID,
  MOCK_USER,
  MOCK_STRATEGY_ID,
  makeNoteRow,
  makeStrategy,
} from './_fixtures';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import { updateNote } from '@/lib/server/notes';

describe('updateNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getCachedUserSession).mockResolvedValue({ user: MOCK_USER } as any);

    const client = createMockSupabaseClient({
      notes: {
        singleData: { id: MOCK_NOTE_ID },
        updateData: makeNoteRow({ strategy: makeStrategy() }),
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);
  });

  // ── Auth guard ─────────────────────────────────────────────────────────

  it('returns Unauthorized when no user session', async () => {
    vi.mocked(getCachedUserSession).mockResolvedValue({ user: null } as any);

    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, { title: 'New' });

    expect(result).toEqual({ data: null, error: { message: 'Unauthorized' } });
  });

  it('returns Unauthorized when user.id does not match', async () => {
    vi.mocked(getCachedUserSession).mockResolvedValue({
      user: { id: MOCK_OTHER_USER_ID, email: 'other@example.com' },
    } as any);

    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, { title: 'New' });

    expect(result).toEqual({ data: null, error: { message: 'Unauthorized' } });
  });

  // ── Ownership check ────────────────────────────────────────────────────

  it('returns Note not found when note does not belong to user', async () => {
    const client = createMockSupabaseClient({
      notes: {
        singleData: null,
        updateData: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, { title: 'New' });

    expect(result).toEqual({ data: null, error: { message: 'Note not found' } });
  });

  // ── Length validation ──────────────────────────────────────────────────

  it('returns error when title exceeds 200 chars', async () => {
    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      title: 'a'.repeat(201),
    });

    expect(result).toEqual({
      data: null,
      error: { message: 'Title must be 200 characters or less' },
    });
  });

  it('returns error when content exceeds 50,000 chars', async () => {
    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      content: 'x'.repeat(50_001),
    });

    expect(result).toEqual({
      data: null,
      error: { message: 'Content must be 50,000 characters or less' },
    });
  });

  // ── Skips validation when field not in updates ─────────────────────────

  it('skips title validation when title not in updates', async () => {
    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      content: 'new content',
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
  });

  it('skips content validation when content not in updates', async () => {
    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      title: 'new title',
    });

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
  });

  // ── Empty field validation ─────────────────────────────────────────────

  it('returns error when title is empty string', async () => {
    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      title: '',
    });

    expect(result).toEqual({
      data: null,
      error: { message: 'Title cannot be empty' },
    });
  });

  it('returns error when content is whitespace only', async () => {
    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      content: '   ',
    });

    expect(result).toEqual({
      data: null,
      error: { message: 'Content cannot be empty' },
    });
  });

  // ── Strategy validation ────────────────────────────────────────────────

  it('returns error when strategy_id does not belong to user', async () => {
    const client = createMockSupabaseClient({
      notes: {
        singleData: { id: MOCK_NOTE_ID },
        updateData: null,
      },
      strategies: {
        singleData: null,
        singleError: { message: 'Not found', code: 'PGRST116' },
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      strategy_id: 'non-existent-strategy',
    });

    expect(result).toEqual({
      data: null,
      error: { message: 'Strategy not found or access denied' },
    });
  });

  it('returns error when strategy_ids contain invalid IDs', async () => {
    const client = createMockSupabaseClient({
      notes: {
        singleData: { id: MOCK_NOTE_ID },
        updateData: null,
      },
      strategies: {
        // Only 1 strategy found when 2 were requested
        selectData: [{ id: 'strategy-1' }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      strategy_ids: ['strategy-1', 'strategy-missing'],
    });

    expect(result).toEqual({
      data: null,
      error: { message: 'One or more strategies not found or access denied' },
    });
  });

  it('returns error when trade_refs reference invalid trades', async () => {
    const client = createMockSupabaseClient({
      notes: {
        singleData: { id: MOCK_NOTE_ID },
        updateData: null,
      },
      live_trades: {
        // Only 1 trade found when 2 were requested
        selectData: [{ id: 'trade-1' }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      trade_refs: [
        { id: 'trade-1', mode: 'live' as any },
        { id: 'trade-missing', mode: 'live' as any },
      ],
    });

    expect(result).toEqual({
      data: null,
      error: { message: 'One or more trades not found or access denied (live)' },
    });
  });

  // ── Strategy syncing logic ─────────────────────────────────────────────

  it('sets both strategy_ids and strategy_id when strategy_ids non-empty', async () => {
    const updatedRow = makeNoteRow({
      strategy_ids: ['s1', 's2'],
      strategy_id: 's1',
      strategy: makeStrategy({ id: 's1' }),
    });
    const client = createMockSupabaseClient({
      notes: {
        singleData: { id: MOCK_NOTE_ID },
        updateData: updatedRow,
      },
      strategies: {
        // strategy_ids validation: return both strategies
        selectData: [{ id: 's1' }, { id: 's2' }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      strategy_ids: ['s1', 's2'],
    });

    expect(result.error).toBeNull();
    expect(client._updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy_ids: ['s1', 's2'],
        strategy_id: 's1',
      }),
    );
  });

  it('clears both to null when strategy_ids is empty array', async () => {
    const updatedRow = makeNoteRow({
      strategy_ids: null,
      strategy_id: null,
      strategy: null,
    });
    const client = createMockSupabaseClient({
      notes: {
        singleData: { id: MOCK_NOTE_ID },
        updateData: updatedRow,
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      strategy_ids: [],
    });

    expect(result.error).toBeNull();
    expect(client._updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy_ids: null,
        strategy_id: null,
      }),
    );
  });

  it('wraps strategy_id into strategy_ids when only strategy_id provided', async () => {
    const updatedRow = makeNoteRow({
      strategy_id: MOCK_STRATEGY_ID,
      strategy_ids: [MOCK_STRATEGY_ID],
      strategy: makeStrategy(),
    });
    const client = createMockSupabaseClient({
      notes: {
        singleData: { id: MOCK_NOTE_ID },
        updateData: updatedRow,
      },
      strategies: {
        singleData: { id: MOCK_STRATEGY_ID },
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      strategy_id: MOCK_STRATEGY_ID,
    });

    expect(result.error).toBeNull();
    expect(client._updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy_id: MOCK_STRATEGY_ID,
        strategy_ids: [MOCK_STRATEGY_ID],
      }),
    );
  });

  it('clears both to null when strategy_id is falsy', async () => {
    const updatedRow = makeNoteRow({
      strategy_id: null,
      strategy_ids: null,
      strategy: null,
    });
    const client = createMockSupabaseClient({
      notes: {
        singleData: { id: MOCK_NOTE_ID },
        updateData: updatedRow,
      },
    });
    vi.mocked(createClient).mockResolvedValue(client as any);

    // Use null (not '') — empty string still triggers strategy_id validation
    // at the DB level; null skips it and enters the syncing branch directly.
    const result = await updateNote(MOCK_NOTE_ID, MOCK_USER_ID, {
      strategy_id: null,
    });

    expect(result.error).toBeNull();
    expect(client._updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy_id: null,
        strategy_ids: null,
      }),
    );
  });
});
