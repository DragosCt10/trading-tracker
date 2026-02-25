'use server';

/**
 * Notes can be linked to strategies (strategy_ids) and to specific trades (trade_refs).
 * DB: ensure `notes` has column `trade_refs` (jsonb), e.g.:
 *   ALTER TABLE notes ADD COLUMN IF NOT EXISTS trade_refs jsonb DEFAULT '[]'::jsonb;
 */
import { createClient } from '@/utils/supabase/server';
import { Note, TradeRef } from '@/types/note';
import type { Database } from '@/types/supabase';
import { getTradeSummariesByRefs } from '@/lib/server/trades';

export type NoteRow = Database['public']['Tables']['notes']['Row'];

/**
 * Maps Supabase note data to Note type
 */
function mapSupabaseNoteToNote(
  note: NoteRow,
  strategy?: { id: string; name: string; slug: string } | null,
  strategies?: Array<{ id: string; name: string; slug: string }>,
  trades?: Array<{ id: string; mode: string; trade_date: string; market: string; direction: string; trade_outcome: string; strategy_name?: string }>
): Note {
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
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  try {
    let query = supabase
      .from('notes')
      .select(`
        *,
        strategy:strategies(id, name, slug)
      `)
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    // Filter by strategy if provided
    if (options?.strategyId !== undefined) {
      if (options.strategyId === null) {
        // Get notes without strategy
        query = query.is('strategy_id', null);
      } else {
        query = query.eq('strategy_id', options.strategyId);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }

    // Fetch strategies for all notes that have strategy_ids
    const allStrategyIds = new Set<string>();
    (data || []).forEach((note: any) => {
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

    return (data || []).map((note: any) => {
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

      return mapSupabaseNoteToNote(note, strategy, strategies, undefined);
    });
  } catch (error) {
    console.error('Error in getNotes:', error);
    return [];
  }
}

/**
 * Gets a single note by ID for a user.
 */
export async function getNoteById(noteId: string, userId: string): Promise<Note | null> {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

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

  // Resolve linked trades for display
  let trades: Array<{ id: string; mode: string; trade_date: string; market: string; direction: string; trade_outcome: string; strategy_name?: string }> | undefined;
  const refs = (data as any).trade_refs;
  if (Array.isArray(refs) && refs.length > 0) {
    const resolved = await getTradeSummariesByRefs(userId, refs);
    trades = resolved.map((t) => ({
      id: t.id,
      mode: t.mode,
      trade_date: t.trade_date,
      market: t.market,
      direction: t.direction,
      trade_outcome: t.trade_outcome,
      strategy_name: t.strategy_name ?? undefined,
    }));
  }

  return mapSupabaseNoteToNote(data, strategy, strategies, trades);
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
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    return { data: null, error: { message: 'Unauthorized' } };
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

  // Validate trade_refs: each (id, mode) must exist and belong to user
  if (note.trade_refs && note.trade_refs.length > 0) {
    for (const ref of note.trade_refs) {
      const tableName = `${ref.mode}_trades`;
      const { data: trade, error: tradeError } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', ref.id)
        .eq('user_id', userId)
        .single();
      if (tradeError || !trade) {
        return { data: null, error: { message: `Trade not found or access denied (${ref.mode})` } };
      }
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

  return { data: mapSupabaseNoteToNote(data, strategy, strategies), error: null };
}

/**
 * Updates an existing note. Only the owner can update.
 */
export async function updateNote(
  noteId: string,
  userId: string,
  updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ data: Note | null; error: { message: string } | null }> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    return { data: null, error: { message: 'Unauthorized' } };
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

  // Validate trade_refs if provided
  if (updates.trade_refs !== undefined && updates.trade_refs.length > 0) {
    for (const ref of updates.trade_refs) {
      const tableName = `${ref.mode}_trades`;
      const { data: trade, error: tradeError } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', ref.id)
        .eq('user_id', userId)
        .single();
      if (tradeError || !trade) {
        return { data: null, error: { message: `Trade not found or access denied (${ref.mode})` } };
      }
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

  return { data: mapSupabaseNoteToNote(data, strategy, strategies), error: null };
}

/**
 * Deletes a note. Only the owner can delete.
 */
export async function deleteNote(
  noteId: string,
  userId: string
): Promise<{ error: { message: string } | null }> {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) {
    return { error: { message: 'Unauthorized' } };
  }

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
