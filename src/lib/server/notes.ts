'use server';

/**
 * Notes can be linked to strategies (strategy_ids) and to specific trades (trade_refs).
 * DB: ensure `notes` has column `trade_refs` (jsonb), e.g.:
 *   ALTER TABLE notes ADD COLUMN IF NOT EXISTS trade_refs jsonb DEFAULT '[]'::jsonb;
 */
import { createClient } from '@/utils/supabase/server';
import { Note, TradeRef } from '@/types/note';
import type { Database } from '@/types/supabase';
import type { Trade, TradingMode } from '@/types/trade';
import { getFullTradesByRefs } from '@/lib/server/trades';
import { getCachedUserSession } from '@/lib/server/session';

export type NoteRow = Database['public']['Tables']['notes']['Row'];

const VALID_TRADE_MODES = new Set<string>(['live', 'backtesting', 'demo']);

function assertValidTradeMode(mode: string): asserts mode is 'live' | 'backtesting' | 'demo' {
  if (!VALID_TRADE_MODES.has(mode)) {
    throw new Error(`Invalid trade mode: ${mode}`);
  }
}

/** Batch-validate trade refs by mode. Returns error message or null if valid. */
export async function validateTradeRefs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  refs: TradeRef[]
): Promise<string | null> {
  if (!refs || refs.length === 0) return null;

  const byMode = new Map<string, string[]>();
  for (const ref of refs) {
    assertValidTradeMode(ref.mode);
    const ids = byMode.get(ref.mode) ?? [];
    ids.push(ref.id);
    byMode.set(ref.mode, ids);
  }

  for (const [mode, ids] of byMode) {
    const { data, error } = await supabase
      .from(`${mode}_trades`)
      .select('id')
      .eq('user_id', userId)
      .in('id', ids);

    if (error || !data || data.length !== ids.length) {
      return `One or more trades not found or access denied (${mode})`;
    }
  }

  return null;
}

/**
 * Maps Supabase note data to Note type
 */
export async function mapSupabaseNoteToNote(
  note: NoteRow,
  strategy?: { id: string; name: string; slug: string } | null,
  strategies?: Array<{ id: string; name: string; slug: string }>,
  trades?: Array<{ id: string; mode: TradingMode; trade_date: string; market: string; direction: string; trade_outcome: string; strategy_name?: string }>,
  linkedTradesFull?: Trade[]
): Promise<Note> {
  const row = note as any;
  return {
    id: note.id,
    user_id: note.user_id,
    strategy_id: note.strategy_id,
    strategy_ids: row.strategy_ids || undefined,
    title: note.title,
    content: note.content,
    created_at: note.created_at,
    updated_at: note.updated_at,
    is_pinned: note.is_pinned ?? false,
    tags: note.tags ?? [],
    trade_refs: Array.isArray(row.trade_refs) ? row.trade_refs as TradeRef[] : undefined,
    strategy: strategy || undefined,
    strategies: strategies || undefined,
    trades: trades || undefined,
    linkedTradesFull: linkedTradesFull ?? undefined,
  };
}

/**
 * Gets all notes for a user, optionally filtered by strategy.
 * Includes strategy information if strategy_id is present.
 */
export async function getNotes(
  userId: string,
  options?: {
    strategyId?: string | null;
    includeInactive?: boolean;
  }
): Promise<Note[]> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) throw new Error('Unauthorized');

  const supabase = await createClient();
  try {
    let query = supabase
      .from('notes')
      .select(`
        *,
        strategy:strategies(id, name, slug)
      `)
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);

    // Push strategy filter to DB when possible
    if (options?.strategyId !== undefined && options.strategyId !== null) {
      query = query.or(`strategy_id.eq.${options.strategyId},strategy_ids.cs.{${options.strategyId}}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }

    // Client-side filter for the "no strategy" case (needs checking both fields are empty)
    const filteredNotes = (data || []).filter((note: any) => {
      if (options?.strategyId === undefined) return true;
      if (options.strategyId !== null) return true; // already filtered server-side

      const strategyIds = Array.isArray(note.strategy_ids)
        ? note.strategy_ids.filter(Boolean)
        : [];

      // "No strategy" means neither legacy strategy_id nor any value in strategy_ids
      return !note.strategy_id && strategyIds.length === 0;
    });

    // Fetch strategies for all notes that have strategy_ids
    const allStrategyIds = new Set<string>();
    filteredNotes.forEach((note: any) => {
      if (note.strategy_ids && Array.isArray(note.strategy_ids)) {
        note.strategy_ids.forEach((id: string) => allStrategyIds.add(id));
      }
    });

    let strategiesMap = new Map<string, { id: string; name: string; slug: string }>();
    if (allStrategyIds.size > 0) {
      const { data: strategiesData } = await supabase
        .from('strategies')
        .select('id, name, slug')
        .in('id', Array.from(allStrategyIds))
        .eq('user_id', userId);

      if (strategiesData) {
        strategiesData.forEach((s) => {
          strategiesMap.set(s.id, { id: s.id, name: s.name, slug: s.slug });
        });
      }
    }

    // Resolve lightweight trade summaries in one batch per mode (for list tooltip, not full trade data)
    const allRefs: TradeRef[] = [];
    filteredNotes.forEach((note: any) => {
      if (Array.isArray(note.trade_refs) && note.trade_refs.length > 0) {
        note.trade_refs.forEach((r: TradeRef) => allRefs.push(r));
      }
    });
    const refKey = (r: TradeRef) => `${r.id}:${r.mode}`;

    type TradeSummary = Pick<Trade, 'id' | 'mode' | 'trade_date' | 'market' | 'direction' | 'trade_outcome'> & { pnl_percentage?: number };
    let tradesByRef = new Map<string, TradeSummary>();
    if (allRefs.length > 0) {
      const byMode = new Map<string, string[]>();
      for (const ref of allRefs) {
        if (!VALID_TRADE_MODES.has(ref.mode)) continue;
        const ids = byMode.get(ref.mode) ?? [];
        ids.push(ref.id);
        byMode.set(ref.mode, ids);
      }

      for (const [mode, ids] of byMode) {
        const { data } = await supabase
          .from(`${mode}_trades`)
          .select('id, trade_date, market, direction, trade_outcome, pnl_percentage')
          .eq('user_id', userId)
          .in('id', ids);

        if (data) {
          for (const row of data as any[]) {
            tradesByRef.set(`${row.id}:${mode}`, {
              id: row.id,
              mode: mode as TradingMode,
              trade_date: row.trade_date,
              market: row.market,
              direction: row.direction,
              trade_outcome: row.trade_outcome,
              pnl_percentage: row.pnl_percentage,
            });
          }
        }
      }
    }

    return await Promise.all(filteredNotes.map(async (note: any) => {
      const strategy = note.strategy ? {
        id: note.strategy.id,
        name: note.strategy.name,
        slug: note.strategy.slug,
      } : null;

      // Get strategies from strategy_ids array
      const strategies = note.strategy_ids && Array.isArray(note.strategy_ids)
        ? note.strategy_ids
            .map((id: string) => strategiesMap.get(id))
            .filter((s: { id: string; name: string; slug: string } | undefined): s is { id: string; name: string; slug: string } => {
              return s !== undefined;
            })
        : undefined;

      const rawTrades =
        Array.isArray(note.trade_refs) && note.trade_refs.length > 0
          ? note.trade_refs.map((r: TradeRef) => tradesByRef.get(refKey(r)))
          : [];
      const linkedTradesFull = rawTrades.length > 0
        ? (rawTrades.filter((t: TradeSummary | undefined): t is TradeSummary => t != null) as unknown as Trade[])
        : undefined;

      return await mapSupabaseNoteToNote(note, strategy, strategies, undefined, linkedTradesFull);
    }));
  } catch (error) {
    console.error('Error in getNotes:', error);
    return [];
  }
}

/**
 * Gets a single note by ID for a user.
 */
export async function getNoteById(noteId: string, userId: string): Promise<Note | null> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) throw new Error('Unauthorized');

  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        strategy:strategies(id, name, slug)
      `)
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Error fetching note:', error);
      return null;
    }

    const strategy = data.strategy ? {
      id: data.strategy.id,
      name: data.strategy.name,
      slug: data.strategy.slug,
    } : null;

    // Fetch strategies from strategy_ids array if present
    let strategies: Array<{ id: string; name: string; slug: string }> | undefined;
    if (data.strategy_ids && Array.isArray(data.strategy_ids) && data.strategy_ids.length > 0) {
      const { data: strategiesData } = await supabase
        .from('strategies')
        .select('id, name, slug')
        .in('id', data.strategy_ids)
        .eq('user_id', userId);

    if (strategiesData) {
      strategies = strategiesData.map((s: { id: string; name: string; slug: string }) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
      }));
    }
  }

  // Resolve linked trades for display (same full-trade fetch as list; map to summary shape for modal)
  let trades: Array<{ id: string; mode: TradingMode; trade_date: string; market: string; direction: string; trade_outcome: string; strategy_name?: string }> | undefined;
  const refs = (data as any).trade_refs;
  if (Array.isArray(refs) && refs.length > 0) {
    const fullTrades = await getFullTradesByRefs(userId, refs);
    trades = fullTrades.map((t) => ({
      id: t.id ?? '',
      mode: t.mode ?? 'live',
      trade_date: t.trade_date,
      market: t.market,
      direction: t.direction,
      trade_outcome: t.trade_outcome,
      strategy_name: undefined,
    }));
  }

  return await mapSupabaseNoteToNote(data, strategy, strategies, trades);
  } catch (error) {
    console.error('Error in getNoteById:', error);
    return null;
  }
}

/**
 * Creates a new note for the current user.
 */
export async function createNote(
  userId: string,
  note: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<{ data: Note | null; error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

  const supabase = await createClient();

  // Required field validation
  if (!note.title || !note.title.trim()) {
    return { data: null, error: { message: 'Title is required' } };
  }
  if (!note.content || !note.content.trim()) {
    return { data: null, error: { message: 'Content is required' } };
  }

  // Input length validation
  if (note.title.trim().length > 200) {
    return { data: null, error: { message: 'Title must be 200 characters or less' } };
  }
  if (note.content.length > 50_000) {
    return { data: null, error: { message: 'Content must be 50,000 characters or less' } };
  }

  // Validate strategy_id belongs to user if provided
  if (note.strategy_id) {
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .select('id')
      .eq('id', note.strategy_id)
      .eq('user_id', userId)
      .single();

    if (strategyError || !strategy) {
      return { data: null, error: { message: 'Strategy not found or access denied' } };
    }
  }

  // Validate strategy_ids belong to user if provided
  if (note.strategy_ids && note.strategy_ids.length > 0) {
    const { data: strategies, error: strategiesError } = await supabase
      .from('strategies')
      .select('id')
      .in('id', note.strategy_ids)
      .eq('user_id', userId);

    if (strategiesError || !strategies || strategies.length !== note.strategy_ids.length) {
      return { data: null, error: { message: 'One or more strategies not found or access denied' } };
    }
  }

  // Validate trade_refs: batch by mode, one query per mode (max 3)
  if (note.trade_refs && note.trade_refs.length > 0) {
    const tradeRefError = await validateTradeRefs(supabase, userId, note.trade_refs);
    if (tradeRefError) {
      return { data: null, error: { message: tradeRefError } };
    }
  }

  // Use first strategy_id from strategy_ids array for backward compatibility, or use strategy_id
  const finalStrategyId = (note.strategy_ids && note.strategy_ids.length > 0)
    ? note.strategy_ids[0]
    : (note.strategy_id || null);

  const strategyIdsArray = note.strategy_ids && note.strategy_ids.length > 0 
    ? note.strategy_ids 
    : (note.strategy_id ? [note.strategy_id] : null);

  const insertRow: Record<string, unknown> = {
    user_id: userId,
    strategy_id: finalStrategyId,
    strategy_ids: strategyIdsArray,
    title: note.title.trim(),
    content: note.content,
    is_pinned: note.is_pinned ?? false,
    tags: note.tags ?? [],
  };
  if (note.trade_refs && note.trade_refs.length > 0) {
    insertRow.trade_refs = note.trade_refs;
  }
  const { data, error } = await supabase
    .from('notes')
    .insert(insertRow)
    .select(`
      *,
      strategy:strategies(id, name, slug)
    `)
    .single();

  if (error) {
    console.error('Error creating note:', error);
    return { data: null, error: { message: error.message ?? 'Failed to create note' } };
  }

  const strategy = data.strategy ? {
    id: data.strategy.id,
    name: data.strategy.name,
    slug: data.strategy.slug,
  } : null;

  // Fetch strategies from strategy_ids array if present
  let strategies: Array<{ id: string; name: string; slug: string }> | undefined;
  if (data.strategy_ids && Array.isArray(data.strategy_ids) && data.strategy_ids.length > 0) {
    const { data: strategiesData } = await supabase
      .from('strategies')
      .select('id, name, slug')
      .in('id', data.strategy_ids)
      .eq('user_id', userId);

    if (strategiesData) {
      strategies = strategiesData.map((s: { id: string; name: string; slug: string }) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
      }));
    }
  }

  return { data: await mapSupabaseNoteToNote(data, strategy, strategies), error: null };
}

/**
 * Updates an existing note. Only the owner can update.
 */
export async function updateNote(
  noteId: string,
  userId: string,
  updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ data: Note | null; error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

  const supabase = await createClient();

  // Required field validation (when provided, must not be empty)
  if (updates.title !== undefined && (!updates.title || !updates.title.trim())) {
    return { data: null, error: { message: 'Title cannot be empty' } };
  }
  if (updates.content !== undefined && (!updates.content || !updates.content.trim())) {
    return { data: null, error: { message: 'Content cannot be empty' } };
  }

  // Input length validation
  if (updates.title !== undefined && updates.title.trim().length > 200) {
    return { data: null, error: { message: 'Title must be 200 characters or less' } };
  }
  if (updates.content !== undefined && updates.content.length > 50_000) {
    return { data: null, error: { message: 'Content must be 50,000 characters or less' } };
  }

  // Verify note belongs to user
  const { data: existing } = await supabase
    .from('notes')
    .select('id')
    .eq('id', noteId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return { data: null, error: { message: 'Note not found' } };
  }

  // Validate strategy_id belongs to user if provided
  if (updates.strategy_id !== undefined && updates.strategy_id !== null) {
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .select('id')
      .eq('id', updates.strategy_id)
      .eq('user_id', userId)
      .single();

    if (strategyError || !strategy) {
      return { data: null, error: { message: 'Strategy not found or access denied' } };
    }
  }

  // Validate strategy_ids belong to user if provided
  if (updates.strategy_ids !== undefined && updates.strategy_ids.length > 0) {
    const { data: strategies, error: strategiesError } = await supabase
      .from('strategies')
      .select('id')
      .in('id', updates.strategy_ids)
      .eq('user_id', userId);

    if (strategiesError || !strategies || strategies.length !== updates.strategy_ids.length) {
      return { data: null, error: { message: 'One or more strategies not found or access denied' } };
    }
  }

  // Validate trade_refs: batch by mode, one query per mode (max 3)
  if (updates.trade_refs !== undefined && updates.trade_refs.length > 0) {
    const tradeRefError = await validateTradeRefs(supabase, userId, updates.trade_refs);
    if (tradeRefError) {
      return { data: null, error: { message: tradeRefError } };
    }
  }

  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title.trim();
  if (updates.content !== undefined) updateData.content = updates.content;
  
  // Handle strategy_ids array
  if (updates.strategy_ids !== undefined) {
    updateData.strategy_ids = updates.strategy_ids.length > 0 ? updates.strategy_ids : null;
    updateData.strategy_id = updates.strategy_ids.length > 0 ? updates.strategy_ids[0] : null;
  } else if (updates.strategy_id !== undefined) {
    updateData.strategy_id = updates.strategy_id || null;
    // If strategy_id is set but strategy_ids is not, update strategy_ids to match
    if (updates.strategy_id) {
      updateData.strategy_ids = [updates.strategy_id];
    } else {
      updateData.strategy_ids = null;
    }
  }
  
  if (updates.is_pinned !== undefined) updateData.is_pinned = updates.is_pinned;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.trade_refs !== undefined) updateData.trade_refs = updates.trade_refs.length > 0 ? updates.trade_refs : null;

  const { data, error } = await supabase
    .from('notes')
    .update(updateData)
    .eq('id', noteId)
    .eq('user_id', userId)
    .select(`
      *,
      strategy:strategies(id, name, slug)
    `)
    .single();

  if (error) {
    console.error('Error updating note:', error);
    return { data: null, error: { message: error.message ?? 'Failed to update note' } };
  }

  const strategy = data.strategy ? {
    id: data.strategy.id,
    name: data.strategy.name,
    slug: data.strategy.slug,
  } : null;

  // Fetch strategies from strategy_ids array if present
  let strategies: Array<{ id: string; name: string; slug: string }> | undefined;
  if (data.strategy_ids && Array.isArray(data.strategy_ids) && data.strategy_ids.length > 0) {
    const { data: strategiesData } = await supabase
      .from('strategies')
      .select('id, name, slug')
      .in('id', data.strategy_ids)
      .eq('user_id', userId);

    if (strategiesData) {
      strategies = strategiesData.map((s: { id: string; name: string; slug: string }) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
      }));
    }
  }

  return { data: await mapSupabaseNoteToNote(data, strategy, strategies), error: null };
}

/**
 * Deletes a note. Only the owner can delete.
 */
export async function deleteNote(
  noteId: string,
  userId: string
): Promise<{ error: { message: string } | null }> {
  const { user } = await getCachedUserSession();
  if (!user || user.id !== userId) {
    return { error: { message: 'Unauthorized' } };
  }

  const supabase = await createClient();
  // Verify note belongs to user
  const { data: existing } = await supabase
    .from('notes')
    .select('id')
    .eq('id', noteId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return { error: { message: 'Note not found' } };
  }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting note:', error);
    return { error: { message: error.message ?? 'Failed to delete note' } };
  }

  return { error: null };
}
