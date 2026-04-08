/**
 * Tests for mapSupabaseNoteToNote — the internal mapping helper.
 * Tests the function directly (exported for testing).
 */
import { describe, it, expect } from 'vitest';
import { mapSupabaseNoteToNote } from '@/lib/server/notes';
import { makeNoteRow, makeStrategy, MOCK_USER_ID, MOCK_NOTE_ID } from './_fixtures';

describe('mapSupabaseNoteToNote', () => {
  it('maps all required NoteRow fields correctly', async () => {
    const row = makeNoteRow();
    const result = await mapSupabaseNoteToNote(row as any);

    expect(result.id).toBe(MOCK_NOTE_ID);
    expect(result.user_id).toBe(MOCK_USER_ID);
    expect(result.title).toBe('Test Note');
    expect(result.content).toBe('Some markdown content');
    expect(result.created_at).toBe('2026-01-15T10:00:00Z');
    expect(result.updated_at).toBe('2026-01-15T10:00:00Z');
  });

  it('sets is_pinned to false when null', async () => {
    const row = makeNoteRow({ is_pinned: null });
    const result = await mapSupabaseNoteToNote(row as any);
    expect(result.is_pinned).toBe(false);
  });

  it('sets tags to empty array when null', async () => {
    const row = makeNoteRow({ tags: null });
    const result = await mapSupabaseNoteToNote(row as any);
    expect(result.tags).toEqual([]);
  });

  it('sets trade_refs to undefined when not an array', async () => {
    const row = makeNoteRow({ trade_refs: 'invalid' });
    const result = await mapSupabaseNoteToNote(row as any);
    expect(result.trade_refs).toBeUndefined();
  });

  it('includes strategy when provided', async () => {
    const row = makeNoteRow();
    const strategy = makeStrategy();
    const result = await mapSupabaseNoteToNote(row as any, strategy);
    expect(result.strategy).toEqual(strategy);
  });

  it('sets strategy to undefined when null', async () => {
    const row = makeNoteRow();
    const result = await mapSupabaseNoteToNote(row as any, null);
    expect(result.strategy).toBeUndefined();
  });

  it('includes strategies array when provided', async () => {
    const row = makeNoteRow();
    const strategies = [makeStrategy(), makeStrategy({ id: 'strat-2', name: 'Strat 2', slug: 'strat-2' })];
    const result = await mapSupabaseNoteToNote(row as any, null, strategies);
    expect(result.strategies).toEqual(strategies);
  });

  it('includes linkedTradesFull when provided', async () => {
    const row = makeNoteRow();
    const trades = [{ id: 't1', market: 'EURUSD' }] as any;
    const result = await mapSupabaseNoteToNote(row as any, null, undefined, undefined, trades);
    expect(result.linkedTradesFull).toEqual(trades);
  });
});
