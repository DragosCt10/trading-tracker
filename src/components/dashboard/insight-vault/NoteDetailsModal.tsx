'use client';

import { useState, useEffect, useRef } from 'react';
import { Note, TradeRef } from '@/types/note';
import { deleteNote, updateNote, getNoteById } from '@/lib/server/notes';
import { useQueryClient, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useStrategies } from '@/hooks/useStrategies';
import { getTradesForNoteLinking } from '@/lib/server/trades';
import { AccountModePopover, type AccountModeSelection } from '@/components/shared/AccountModePopover';
import { AlertCircle, Pencil, Trash2, Pin, X, FileText, Link2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

interface NoteDetailsModalProps {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onNoteUpdated?: () => void;
  onNoteDeleted?: () => void;
}

export default function NoteDetailsModal({
  note,
  isOpen,
  onClose,
  onNoteUpdated,
  onNoteDeleted,
}: NoteDetailsModalProps) {
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;
  const { strategies } = useStrategies({ userId });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const queryClient = useQueryClient();

  const [editedNote, setEditedNote] = useState<Note>({
    ...note,
    strategy_ids: note.strategy_ids || (note.strategy_id ? [note.strategy_id] : []),
    trade_refs: note.trade_refs ?? [],
  });
  const [tradePickerSelection, setTradePickerSelection] = useState<AccountModeSelection>({
    mode: 'live',
    accountId: null,
    account: null,
  });
  const tradeListScrollSentinelRef = useRef<HTMLDivElement>(null);

  // Fetch full note when modal opens to get resolved trades for display
  const { data: fullNote } = useQuery({
    queryKey: ['note', note.id],
    queryFn: () => getNoteById(note.id, userId!),
    enabled: !!userId && isOpen && !!note.id,
    staleTime: 30 * 1000,
  });
  const displayNote = fullNote ?? note;

  // Update editedNote when note or fullNote changes
  useEffect(() => {
    if (displayNote.id !== editedNote.id && !isEditing) {
      setEditedNote({
        ...displayNote,
        strategy_ids: displayNote.strategy_ids || (displayNote.strategy_id ? [displayNote.strategy_id] : []),
        trade_refs: displayNote.trade_refs ?? [],
      });
    }
  }, [displayNote.id, displayNote.strategy_id, displayNote.strategy_ids, displayNote.trade_refs, editedNote.id, isEditing]);

  const {
    data: tradesForLinkingData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['tradesForNoteLinking', userId, tradePickerSelection.mode, tradePickerSelection.accountId, editedNote.strategy_ids],
    queryFn: ({ pageParam }) =>
      getTradesForNoteLinking(userId!, tradePickerSelection.mode, {
        accountId: tradePickerSelection.accountId,
        strategyIds: (editedNote.strategy_ids?.length ?? 0) > 0 ? editedNote.strategy_ids : undefined,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!userId && isOpen && isEditing && !!tradePickerSelection.accountId,
    staleTime: 60 * 1000,
  });

  const tradesForLinking = tradesForLinkingData?.pages.flatMap((p) => p.trades) ?? [];

  // Infinite scroll: load more when sentinel enters viewport
  useEffect(() => {
    if (!tradePickerSelection.accountId || !hasNextPage || isFetchingNextPage) return;
    const el = tradeListScrollSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { root: el.closest('.overflow-y-auto'), rootMargin: '100px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tradePickerSelection.accountId, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isTradeSelected = (id: string, mode: string) =>
    (editedNote.trade_refs ?? []).some((r) => r.id === id && r.mode === mode);
  const toggleTradeRef = (id: string, mode: 'live' | 'backtesting' | 'demo') => {
    setEditedNote((prev) => {
      const refs = prev.trade_refs ?? [];
      const exists = refs.some((r) => r.id === id && r.mode === mode);
      const trade_refs = exists
        ? refs.filter((r) => !(r.id === id && r.mode === mode))
        : [...refs, { id, mode }];
      return { ...prev, trade_refs };
    });
  };

  const handleSave = async () => {
    if (!userId) {
      setError('User not found');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const { data, error: updateError } = await updateNote(editedNote.id, userId, {
        title: editedNote.title,
        content: editedNote.content,
        strategy_id: editedNote.strategy_id,
        strategy_ids: editedNote.strategy_ids,
        trade_refs: editedNote.trade_refs,
        is_pinned: editedNote.is_pinned,
        tags: editedNote.tags,
      });

      if (updateError) throw new Error(updateError.message);
      if (!data) throw new Error('Failed to update insight');

      setIsSaving(false);
      setIsEditing(false);
      if (onNoteUpdated) onNoteUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update insight');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) {
      setError('User not found');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const { error: deleteError } = await deleteNote(editedNote.id, userId);

      if (deleteError) throw new Error(deleteError.message);

      if (onNoteDeleted) onNoteDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete insight');
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-2xl p-0 flex flex-col overflow-hidden">
          {/* Gradient orbs background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
            <div
              className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
              style={{ animationDuration: '8s' }}
            />
            <div
              className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
              style={{ animationDuration: '10s', animationDelay: '2s' }}
            />
          </div>

          {/* Noise texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />

          {/* Top accent line */}
          <div className="themed-accent-line absolute -top-px left-0 right-0 h-0.5 opacity-60" />

          {/* Fixed Header */}
          <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
            <AlertDialogHeader className="space-y-1.5">
              <div className="flex items-center justify-between">
                <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  <div className="p-2 rounded-lg themed-header-icon-box">
                    <FileText className="h-5 w-5" style={{ color: 'var(--tc-primary)' }} />
                  </div>
                  <span>{isEditing ? 'Edit Insight' : 'Insight Details'}</span>
                </AlertDialogTitle>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="cursor-pointer relative h-8 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 text-xs font-medium transition-colors duration-200 gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isDeleting}
                            className="relative cursor-pointer p-2 px-4.5 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 h-8 w-8"
                          >
                            <span className="relative z-10 flex items-center justify-center">
                              {isDeleting ? (
                                <svg
                                  className="h-4 w-4 animate-spin"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </span>
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              <span className="text-slate-600 dark:text-slate-400">Are you sure you want to delete "{editedNote.title}"? This action cannot be undone.</span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex gap-3">
                            <AlertDialogCancel asChild>
                              <Button
                                variant="outline"
                                className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                              >
                                Cancel
                              </Button>
                            </AlertDialogCancel>
                            <AlertDialogAction asChild>
                              <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60"
                              >
                                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                              </Button>
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!isEditing && (
                <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                  View and manage your insight details
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
          </div>

          {/* Scrollable content */}
          <div className="relative overflow-y-auto flex-1 px-6 py-5">

            {error && (
              <div className="mb-4 p-3 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              </div>
            )}

            {isEditing ? (
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Title *
                  </Label>
                  <Input
                    value={editedNote.title}
                    onChange={(e) =>
                      setEditedNote({ ...editedNote, title: e.target.value.slice(0, 25) })
                    }
                    maxLength={25}
                    placeholder="Insight title (max 25 characters)"
                    className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
                  />
                </div>

                {/* Strategies (optional - multiple selection) */}
                <div className="space-y-1.5">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Strategies (Optional)
                  </Label>
                  <div className="border border-slate-200/60 dark:border-slate-600 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:dark:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {strategies.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No strategies available</p>
                    ) : (
                      <div className="space-y-2 pr-1">
                        {strategies.map((strategy) => {
                          const isSelected = editedNote.strategy_ids?.includes(strategy.id) || editedNote.strategy_id === strategy.id;
                          return (
                            <div key={strategy.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-strategy-${strategy.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentIds = editedNote.strategy_ids || (editedNote.strategy_id ? [editedNote.strategy_id] : []);
                                  if (checked) {
                                    setEditedNote({
                                      ...editedNote,
                                      strategy_ids: [...currentIds, strategy.id],
                                      strategy_id: currentIds.length === 0 ? strategy.id : editedNote.strategy_id,
                                    });
                                  } else {
                                    const newIds = currentIds.filter((id) => id !== strategy.id);
                                    setEditedNote({
                                      ...editedNote,
                                      strategy_ids: newIds,
                                      strategy_id: newIds.length === 0 ? null : (newIds.length === 1 ? newIds[0] : editedNote.strategy_id),
                                    });
                                  }
                                }}
                                className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 themed-checkbox data-[state=checked]:!text-white transition-colors duration-150"
                              />
                              <Label
                                htmlFor={`edit-strategy-${strategy.id}`}
                                className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300"
                              >
                                {strategy.name}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {((editedNote.strategy_ids && editedNote.strategy_ids.length > 0) || editedNote.strategy_id) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {((editedNote.strategy_ids?.length || 0) + (editedNote.strategy_id ? 1 : 0))} strateg{((editedNote.strategy_ids?.length || 0) + (editedNote.strategy_id ? 1 : 0)) === 1 ? 'y' : 'ies'} selected
                    </p>
                  )}
                </div>

                {/* Link to trades (optional) */}
                <div className="space-y-1.5">
                  <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" style={{ color: 'var(--tc-primary)' }} />
                      Link to trades (optional)
                    </span>
                  </Label>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Account:</span>
                    <AccountModePopover
                      userId={userId}
                      value={tradePickerSelection}
                      onChange={setTradePickerSelection}
                      placeholder="Select account"
                      triggerClassName="min-w-[160px]"
                    />
                  </div>
                  <div className="border border-slate-200/60 dark:border-slate-600 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:dark:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {!tradePickerSelection.accountId ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Select an account above to see its trades.
                      </p>
                    ) : tradesForLinking.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {(editedNote.strategy_ids?.length ?? 0) === 0
                          ? 'No trades in this account yet.'
                          : 'No trades for selected strategies in this account.'}
                      </p>
                    ) : (
                      <div className="space-y-2 pr-1">
                        {tradesForLinking.map((t) => (
                          <div key={`${t.mode}-${t.id}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-trade-${t.mode}-${t.id}`}
                              checked={isTradeSelected(t.id, t.mode)}
                              onCheckedChange={() => toggleTradeRef(t.id, t.mode)}
                              className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 themed-checkbox data-[state=checked]:!text-white transition-colors duration-150"
                            />
                            <Label
                              htmlFor={`edit-trade-${t.mode}-${t.id}`}
                              className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300 flex-1 truncate"
                            >
                              {t.trade_date} · {t.market} · {t.direction} · {t.trade_outcome}
                            </Label>
                          </div>
                        ))}
                        <div ref={tradeListScrollSentinelRef} className="min-h-4 flex items-center justify-center py-2">
                          {isFetchingNextPage && (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {((editedNote.trade_refs?.length ?? 0) > 0) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {editedNote.trade_refs!.length} trade{editedNote.trade_refs!.length === 1 ? '' : 's'} linked
                    </p>
                  )}
                </div>

                {/* Content Editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Content *
                    </Label>
                    {/* Switch Toggle */}
                    <div className="relative inline-flex items-center bg-slate-100/60 dark:bg-slate-800/40 rounded-xl p-1 border border-slate-200/80 dark:border-slate-700/80">
                      <button
                        type="button"
                        onClick={() => setIsPreview(false)}
                        className={`relative px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                          !isPreview
                            ? 'bg-white dark:bg-slate-700 shadow-sm text-[var(--tc-text)] dark:text-[var(--tc-text-dark)]'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPreview(true)}
                        className={`relative px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                          isPreview
                            ? 'bg-white dark:bg-slate-700 shadow-sm text-[var(--tc-text)] dark:text-[var(--tc-text-dark)]'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                  <div className="border border-slate-200/60 dark:border-slate-600 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm">
                    {isPreview ? (
                      <div className="min-h-[400px] p-4 prose prose-slate dark:prose-invert max-w-none break-words [overflow-wrap:anywhere] [&_a]:underline [&_a]:[color:var(--tc-text)] dark:[&_a]:[color:var(--tc-text-dark)] [&_a]:decoration-[var(--tc-primary)]/50 hover:[&_a]:decoration-[var(--tc-primary)] [&_*]:break-words [&_*]:[overflow-wrap:anywhere]">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a {...props} className="underline text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] decoration-[var(--tc-primary)]/50 hover:decoration-[var(--tc-primary)] break-words [overflow-wrap:anywhere]" />
                            ),
                            p: ({ node, ...props }) => (
                              <p {...props} className="break-words [overflow-wrap:anywhere]" />
                            ),
                            code: ({ node, ...props }) => (
                              <code {...props} className="break-words [overflow-wrap:anywhere]" />
                            ),
                          }}
                        >
                          {editedNote.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <Textarea
                        value={editedNote.content}
                        onChange={(e) =>
                          setEditedNote({ ...editedNote, content: e.target.value })
                        }
                        className="min-h-[400px] p-4 bg-transparent border-0 outline-none resize-none text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono text-sm break-words [overflow-wrap:anywhere]"
                      />
                    )}
                  </div>
                </div>

                {/* Pin */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pin-note-edit"
                    checked={editedNote.is_pinned}
                    onCheckedChange={(checked) =>
                      setEditedNote({ ...editedNote, is_pinned: checked as boolean })
                    }
                    className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 themed-checkbox data-[state=checked]:!text-white transition-colors duration-150"
                  />
                  <Label htmlFor="pin-note-edit" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
                    Pin this insight
                  </Label>
                </div>

                {/* Action Buttons */}
                <AlertDialogFooter className="mt-4 flex items-center justify-between pt-4">
                  <AlertDialogCancel
                    type="button"
                    onClick={() => {
                      setIsSaving(false);
                      setIsEditing(false);
                      setEditedNote({
                        ...displayNote,
                        strategy_ids: displayNote.strategy_ids || (displayNote.strategy_id ? [displayNote.strategy_id] : []),
                        trade_refs: displayNote.trade_refs ?? [],
                      });
                      setError(null);
                    }}
                    disabled={isSaving}
                    className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    Cancel
                  </AlertDialogCancel>

                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 themed-btn-primary shadow-md"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                      {isSaving && (
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="opacity-25"
                          />
                          <path
                            className="opacity-90"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4A4 4 0 004 12z"
                          />
                        </svg>
                      )}
                      Save Changes
                    </span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  </Button>
                </AlertDialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Note Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {editedNote.is_pinned && (
                      <Badge className="shadow-none bg-[var(--tc-subtle)] border border-[var(--tc-border)] text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] hover:bg-[var(--tc-subtle)]">
                        <Pin className="h-3 w-3 mr-1" />
                        Pinned
                      </Badge>
                    )}
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Created {format(new Date(editedNote.created_at), 'MMM d, yyyy')}
                    </span>
                    {editedNote.updated_at !== editedNote.created_at && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        • Updated {format(new Date(editedNote.updated_at), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                  {(editedNote.strategy || (editedNote.strategies && editedNote.strategies.length > 0)) && (
                    <div className="flex items-start gap-2 flex-wrap">
                      {(() => {
                        const strategyCount = editedNote.strategies?.length || (editedNote.strategy ? 1 : 0);
                        const label = strategyCount === 1 ? 'Strategy:' : 'Strategies:';
                        return (
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-0.5">{label}</span>
                        );
                      })()}
                      <div className="flex flex-wrap gap-1.5">
                        {editedNote.strategies && editedNote.strategies.length > 0 ? (
                          editedNote.strategies.map((strategy) => (
                            <Badge
                              key={strategy.id}
                              className="shadow-none bg-[var(--tc-subtle)] border border-[var(--tc-border)] text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] hover:bg-[var(--tc-subtle)]"
                            >
                              {strategy.name}
                            </Badge>
                          ))
                        ) : editedNote.strategy ? (
                          <Badge className="shadow-none bg-[var(--tc-subtle)] border border-[var(--tc-border)] text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] hover:bg-[var(--tc-subtle)]">
                            {editedNote.strategy.name}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {(displayNote.trades && displayNote.trades.length > 0) && (
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Linked trades:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {displayNote.trades.map((t) => (
                          <Badge
                            key={`${t.mode}-${t.id}`}
                            variant="outline"
                            className="shadow-none bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-normal"
                          >
                            {t.trade_date} · {t.market} {t.direction}
                            {t.strategy_name ? ` · ${t.strategy_name}` : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {editedNote.title}
                </h2>

                {/* Content */}
                <div className="prose prose-slate dark:prose-invert max-w-none min-h-[200px] p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-200/70 dark:border-slate-800/70 break-words [overflow-wrap:anywhere] [&_a]:underline [&_a]:[color:var(--tc-text)] dark:[&_a]:[color:var(--tc-text-dark)] [&_a]:decoration-[var(--tc-primary)]/50 hover:[&_a]:decoration-[var(--tc-primary)] [&_*]:break-words [&_*]:[overflow-wrap:anywhere]">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
                        <a {...props} className="underline text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] decoration-[var(--tc-primary)]/50 hover:decoration-[var(--tc-primary)] break-words [overflow-wrap:anywhere]" />
                      ),
                      p: ({ node, ...props }) => (
                        <p {...props} className="break-words [overflow-wrap:anywhere]" />
                      ),
                      code: ({ node, ...props }) => (
                        <code {...props} className="break-words [overflow-wrap:anywhere]" />
                      ),
                    }}
                  >
                    {editedNote.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
