'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Note } from '@/types/note';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import NoteDetailsModal from '@/components/notes/NoteDetailsModal';
import NewNoteModal from '@/components/notes/NewNoteModal';
import { NoteCard } from '@/components/notes/NoteCard';
import { getNotes } from '@/lib/server/notes';
import { useStrategies } from '@/hooks/useStrategies';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const ITEMS_PER_LOAD = 12;

interface NotesClientProps {
  initialUserId: string;
  initialNotes: Note[];
}

export default function NotesClient({
  initialUserId,
  initialNotes,
}: NotesClientProps) {
  const { data: userDetails } = useUserDetails();
  const queryClient = useQueryClient();
  const userId = userDetails?.user?.id ?? initialUserId;
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_LOAD);
  const [mounted, setMounted] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const { strategies } = useStrategies({ userId });

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notes with React Query
  const {
    data: notes,
    isLoading: notesLoading,
    isFetching: notesFetching,
  } = useQuery<Note[]>({
    queryKey: ['notes', userId, selectedStrategy],
    queryFn: async () => {
      if (!userId) return [];
      return getNotes(userId, {
        strategyId: selectedStrategy === 'all' ? undefined : selectedStrategy === 'none' ? null : selectedStrategy,
      });
    },
    initialData: selectedStrategy === 'all' ? initialNotes : undefined,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const notesList = notes ?? (selectedStrategy === 'all' ? initialNotes : []);

  // Filter by search query (client-side)
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notesList;
    const query = searchQuery.toLowerCase();
    return notesList.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
    );
  }, [notesList, searchQuery]);

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_LOAD);
  }, [selectedStrategy, searchQuery]);

  // Get displayed notes (for infinite scroll)
  const displayedNotes = useMemo(() => {
    return filteredNotes.slice(0, displayedCount);
  }, [filteredNotes, displayedCount]);

  const hasMore = displayedCount < filteredNotes.length;

  // Intersection Observer for infinite scroll (only on client)
  useEffect(() => {
    if (!mounted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !notesLoading && !notesFetching) {
          setDisplayedCount((prev) => Math.min(prev + ITEMS_PER_LOAD, filteredNotes.length));
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [mounted, hasMore, notesLoading, notesFetching, filteredNotes.length]);

  const openModal = (note: Note) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedNote(null);
    setIsModalOpen(false);
  };

  const handleNoteCreated = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
    setIsNewNoteModalOpen(false);
  };

  const handleNoteUpdated = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
    setIsModalOpen(false);
  };

  const handleNoteDeleted = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-700/50 shadow-sm">
              <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Notes
            </h1>
          </div>
          <Button
            onClick={() => setIsNewNoteModalOpen(true)}
            className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0"
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
              <Plus className="h-4 w-4" />
              <span>New Note</span>
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 ml-[52px]">
          Your trading notes and insights. Organize your thoughts, strategies, and learnings.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md h-12 rounded-full bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border-slate-200/60 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
            <SelectTrigger className="h-12 rounded-full bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border-slate-200/60 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300">
              <SelectValue placeholder="Filter by strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notes</SelectItem>
              <SelectItem value="none">No Strategy</SelectItem>
              {strategies.map((strategy) => (
                <SelectItem key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!mounted || notesLoading ? (
          // Skeleton loader
          <>
            {Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={`skeleton-${index}`}
                className="relative overflow-hidden border-slate-200/60 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 shadow-none backdrop-blur-sm"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : displayedNotes.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50 text-slate-400 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400">
              {searchQuery ? 'No notes found matching your search.' : 'No notes yet. Create your first note!'}
            </p>
          </div>
        ) : (
          <>
            {displayedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => openModal(note)}
              />
            ))}
            
            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={observerTarget} className="col-span-full flex justify-center py-4">
                {notesFetching ? (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading more notes...</span>
                  </div>
                ) : (
                  <div className="h-4" /> // Spacer for intersection observer
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Note Details Modal */}
      {selectedNote && (
        <NoteDetailsModal
          note={selectedNote}
          isOpen={isModalOpen}
          onClose={closeModal}
          onNoteUpdated={handleNoteUpdated}
          onNoteDeleted={handleNoteDeleted}
        />
      )}

      {/* New Note Modal */}
      <NewNoteModal
        isOpen={isNewNoteModalOpen}
        onClose={() => setIsNewNoteModalOpen(false)}
        onNoteCreated={handleNoteCreated}
      />
    </div>
  );
}
