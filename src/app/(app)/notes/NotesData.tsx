import { Suspense } from 'react';
import { getNotes } from '@/lib/server/notes';
import NotesClient from './NotesClient';
import { NotesSkeleton } from './NotesSkeleton';
import type { User } from '@supabase/supabase-js';

async function NotesDataFetcher({ user }: { user: User }) {
  // Fetch initial notes server-side
  let initialNotes = [];

  try {
    initialNotes = await getNotes(user.id);
  } catch (error) {
    console.error('Error fetching initial notes:', error);
    // Return empty array on error - client will handle loading states
  }

  return (
    <NotesClient
      initialUserId={user.id}
      initialNotes={initialNotes}
    />
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
