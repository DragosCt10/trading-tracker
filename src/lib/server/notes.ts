'use server';

import { createClient } from '@/utils/supabase/server';
import { Note } from '@/types/note';
import type { Database } from '@/types/supabase';

export type NoteRow = Database['public']['Tables']['notes']['Row'];

/**
 * Maps Supabase note data to Note type
 */
function mapSupabaseNoteToNote(note: NoteRow, strategy?: { id: string; name: string; slug: string } | null): Note {
  return {
    id: note.id,
    user_id: note.user_id,
    strategy_id: note.strategy_id,
    title: note.title,
    content: note.content,
    created_at: note.created_at,
    updated_at: note.updated_at,
    is_pinned: note.is_pinned ?? false,
    tags: note.tags ?? [],
    strategy: strategy || undefined,
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

    return (data || []).map((note: any) => {
      const strategy = note.strategy ? {
        id: note.strategy.id,
        name: note.strategy.name,
        slug: note.strategy.slug,
      } : null;
      return mapSupabaseNoteToNote(note, strategy);
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

    return mapSupabaseNoteToNote(data, strategy);
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

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      strategy_id: note.strategy_id || null,
      title: note.title.trim(),
      content: note.content,
      is_pinned: note.is_pinned ?? false,
      tags: note.tags ?? [],
    })
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

  return { data: mapSupabaseNoteToNote(data, strategy), error: null };
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

  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title.trim();
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.strategy_id !== undefined) updateData.strategy_id = updates.strategy_id || null;
  if (updates.is_pinned !== undefined) updateData.is_pinned = updates.is_pinned;
  if (updates.tags !== undefined) updateData.tags = updates.tags;

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

  return { data: mapSupabaseNoteToNote(data, strategy), error: null };
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
