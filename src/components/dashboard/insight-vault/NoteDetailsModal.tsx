'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useProgressDialog } from '@/hooks/useProgressDialog';
import { Note } from '@/types/note';
import type { TradeRef } from '@/types/note';
import { deleteNote, updateNote } from '@/lib/server/notes';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useStrategies } from '@/hooks/useStrategies';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import { type AccountModeSelection } from '@/components/shared/AccountModePopover';
import { AlertCircle, Pencil, Trash2, Pin, X, FileText } from 'lucide-react';
import { MarkdownRenderer } from '@/components/dynamicComponents';
import MarkdownEditor from '@/components/dashboard/insight-vault/MarkdownEditor';
import StrategySelector from '@/components/dashboard/insight-vault/StrategySelector';
import TradeLinkingPicker from '@/components/dashboard/insight-vault/TradeLinkingPicker';

// shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const { selection } = useActionBarSelection();
  const accountId = selection.activeAccount?.id;
  const { strategies } = useStrategies({ userId, accountId });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { error, setError } = useProgressDialog();
  const [isPreview, setIsPreview] = useState(false);

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
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Use list note as source of truth (no getNoteById on open — list already has note + linkedTradesFull)
  const displayNote = note;

  // Derived: linked trades for display (list note has linkedTradesFull; getNoteById would set trades)
  const linkedTradesForDisplay = useMemo(() =>
    displayNote.trades && displayNote.trades.length > 0
      ? displayNote.trades
      : (displayNote.linkedTradesFull?.map((t) => ({
          id: t.id ?? '',
          mode: t.mode ?? '',
          trade_date: t.trade_date,
          market: t.market,
          direction: t.direction,
          trade_outcome: t.trade_outcome,
          strategy_name: undefined as string | undefined,
        })) ?? []),
  [displayNote.trades, displayNote.linkedTradesFull]);

  // Update editedNote when note prop changes (e.g. list refetched)
  useEffect(() => {
    if (displayNote.id !== editedNote.id && !isEditing) {
      setEditedNote({
        ...displayNote,
        strategy_ids: displayNote.strategy_ids || (displayNote.strategy_id ? [displayNote.strategy_id] : []),
        trade_refs: displayNote.trade_refs ?? [],
      });
    }
  }, [displayNote, editedNote.id, isEditing]);

  const handleStrategyIdsChange = useCallback((ids: string[]) => {
    setEditedNote((prev) => ({ ...prev, strategy_ids: ids }));
  }, []);

  const handleLegacyStrategyIdChange = useCallback((id: string | null) => {
    setEditedNote((prev) => ({ ...prev, strategy_id: id }));
  }, []);

  const handleTradeRefsChange = useCallback((refs: TradeRef[]) => {
    setEditedNote((prev) => ({ ...prev, trade_refs: refs }));
  }, []);

  // Track dirty state when editing — compare editedNote against displayNote
  const isDirty = useMemo(() => {
    if (!isEditing) return false;
    const origIds = displayNote.strategy_ids || (displayNote.strategy_id ? [displayNote.strategy_id] : []);
    const origRefs = displayNote.trade_refs ?? [];
    return (
      editedNote.title !== displayNote.title ||
      editedNote.content !== displayNote.content ||
      editedNote.is_pinned !== displayNote.is_pinned ||
      JSON.stringify(editedNote.strategy_ids ?? []) !== JSON.stringify(origIds) ||
      JSON.stringify(editedNote.trade_refs ?? []) !== JSON.stringify(origRefs)
    );
  }, [isEditing, editedNote, displayNote]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    setIsEditing(false);
    setEditedNote({
      ...displayNote,
      strategy_ids: displayNote.strategy_ids || (displayNote.strategy_id ? [displayNote.strategy_id] : []),
      trade_refs: displayNote.trade_refs ?? [],
    });
    setError(null);
    onClose();
  }, [displayNote, onClose, setError]);

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
      <AlertDialog open={isOpen} onOpenChange={handleClose}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">
          {/* Gradient orbs background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
            <div
              className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl"
            />
            <div
              className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl"
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
                        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              <span className="text-slate-600 dark:text-slate-400">Are you sure you want to delete &quot;{editedNote.title}&quot;? This action cannot be undone.</span>
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
                    onClick={handleClose}
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
                <StrategySelector
                  selectedIds={editedNote.strategy_ids ?? []}
                  onChange={handleStrategyIdsChange}
                  strategies={strategies}
                  legacyStrategyId={editedNote.strategy_id}
                  onLegacyStrategyIdChange={handleLegacyStrategyIdChange}
                  idPrefix="edit-strategy"
                />

                {/* Link to trades (optional) */}
                <TradeLinkingPicker
                  selectedRefs={editedNote.trade_refs ?? []}
                  onChange={handleTradeRefsChange}
                  userId={userId}
                  strategyIds={editedNote.strategy_ids ?? []}
                  enabled={isOpen && isEditing}
                  tradePickerSelection={tradePickerSelection}
                  onTradePickerSelectionChange={setTradePickerSelection}
                  idPrefix="edit-trade"
                />

                {/* Content Editor */}
                <MarkdownEditor
                  content={editedNote.content}
                  onChange={(content) => setEditedNote({ ...editedNote, content })}
                  isPreview={isPreview}
                  onTogglePreview={() => setIsPreview((prev) => !prev)}
                />

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
                      if (isDirty) {
                        setShowDiscardDialog(true);
                      } else {
                        setIsSaving(false);
                        setIsEditing(false);
                        setEditedNote({
                          ...displayNote,
                          strategy_ids: displayNote.strategy_ids || (displayNote.strategy_id ? [displayNote.strategy_id] : []),
                          trade_refs: displayNote.trade_refs ?? [],
                        });
                        setError(null);
                      }
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
                  {linkedTradesForDisplay.length > 0 && (
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Linked trades:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedTradesForDisplay.map((t) => (
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
                  <MarkdownRenderer content={editedNote.content} />
                </div>
              </div>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="text-slate-900 dark:text-slate-50 font-semibold text-lg">Discard unsaved changes?</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-slate-600 dark:text-slate-400">You have unsaved changes to this insight. Are you sure you want to discard them?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3">
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
              >
                Keep editing
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleConfirmDiscard}
                className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0"
              >
                Discard
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
