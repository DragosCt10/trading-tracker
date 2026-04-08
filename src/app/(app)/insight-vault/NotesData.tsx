import { Suspense } from 'react';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getNotes } from '@/lib/server/notes';
import NotesClient from './NotesClient';
import { NotesSkeleton } from './NotesSkeleton';
import { queryKeys } from '@/lib/queryKeys';
import { DEFAULT_STRATEGY_FILTER } from '@/constants/insightVault';
import type { User } from '@supabase/supabase-js';
import type { Note } from '@/types/note';

async function NotesDataFetcher({ user }: { user: User }) {
  const queryClient = new QueryClient();

  try {
    const initialNotes = await getNotes(user.id);
    // Hydrate ['notes', userId, 'all'] so the client cache is fresh on mount — no double-fetch.
    queryClient.setQueryData<Note[]>(queryKeys.notes(user.id, DEFAULT_STRATEGY_FILTER), initialNotes);
  } catch (error) {
    console.error('Error fetching initial notes:', error);
    // Cache stays empty; client useQuery will fetch after mount.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotesClient initialUserId={user.id} />
    </HydrationBoundary>
  );
}

interface NotesDataProps {
  user: User;
}

export default function NotesData({ user }: NotesDataProps) {
  return (
    <Suspense fallback={<NotesSkeleton />}>
      <NotesDataFetcher user={user} />
    </Suspense>
  );
}
