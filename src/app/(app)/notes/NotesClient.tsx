'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Note } from '@/types/note';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Plus, Pin } from 'lucide-react';
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

const ITEMS_PER_PAGE = 12;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { strategies } = useStrategies({ userId });

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

  // Pagination
  const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE);
  const paginatedCurrentPage = Math.min(currentPage, totalPages === 0 ? 1 : totalPages);
  const startIdx = (paginatedCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedNotes = filteredNotes.slice(startIdx, endIdx);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStrategy, searchQuery]);

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
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Notes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your trading notes and insights
          </p>
        </div>
        <Button
          onClick={() => setIsNewNoteModalOpen(true)}
          className="bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
            <SelectTrigger>
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

      {/* Skeleton only when we have no data yet */}
      {(notesLoading || notesFetching) && notesList.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={`skeleton-${index}`} className="overflow-hidden">
              <CardContent className="p-4">
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
        </div>
      )}

      {/* Notes Cards Grid */}
      {((!notesLoading && !notesFetching) || notesList.length > 0) && (
        <>
          {paginatedNotes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No notes found matching your search.' : 'No notes yet. Create your first note!'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {paginatedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onClick={() => openModal(note)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    Showing <span className="font-medium">{startIdx + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(endIdx, filteredNotes.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredNotes.length}</span> notes
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={paginatedCurrentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={paginatedCurrentPage === totalPages || totalPages === 0}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

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
