'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useProgressDialog } from '@/hooks/useProgressDialog';
import { createNote } from '@/lib/server/notes';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useStrategies } from '@/hooks/useStrategies';
import { useActionBarSelection } from '@/hooks/useActionBarSelection';
import type { TradeRef } from '@/types/note';
import { type AccountModeSelection } from '@/components/shared/AccountModePopover';
import { FileText, X } from 'lucide-react';
import MarkdownEditor from '@/components/dashboard/insight-vault/MarkdownEditor';
import StrategySelector from '@/components/dashboard/insight-vault/StrategySelector';
import TradeLinkingPicker from '@/components/dashboard/insight-vault/TradeLinkingPicker';

// shadcn/ui
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteCreated?: () => void;
}

export default function NewNoteModal({ isOpen, onClose, onNoteCreated }: NewNoteModalProps) {
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;
  const { selection } = useActionBarSelection();
  const accountId = selection.activeAccount?.id;
  const { strategies } = useStrategies({ userId, accountId });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { error, setError } = useProgressDialog();
  const [mounted, setMounted] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const [note, setNote] = useState({
    title: '',
    content: '',
    strategy_id: null as string | null,
    strategy_ids: [] as string[],
    trade_refs: [] as TradeRef[],
    is_pinned: false,
  });
  const [tradePickerSelection, setTradePickerSelection] = useState<AccountModeSelection>({
    mode: 'live',
    accountId: null,
    account: null,
  });
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Track whether any field has been modified from empty initial state
  const isDirty = useMemo(() =>
    note.title.length > 0 ||
    note.content.length > 0 ||
    note.strategy_ids.length > 0 ||
    note.trade_refs.length > 0 ||
    note.is_pinned,
  [note.title, note.content, note.strategy_ids, note.trade_refs, note.is_pinned]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    onClose();
  }, [onClose]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setNote({
        title: '',
        content: '',
        strategy_id: null,
        strategy_ids: [],
        trade_refs: [],
        is_pinned: false,
      });
      setError(null);
      setIsPreview(false);
      setIsSubmitting(false);
      setShowDiscardDialog(false);
    }
  }, [isOpen, setError]);

  const handleStrategyIdsChange = useCallback((ids: string[]) => {
    setNote((prev) => ({
      ...prev,
      strategy_ids: ids,
      strategy_id: ids.length > 0 ? ids[0] : null,
    }));
  }, []);

  const handleTradeRefsChange = useCallback((refs: TradeRef[]) => {
    setNote((prev) => ({ ...prev, trade_refs: refs }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!note.title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!note.content.trim()) {
      setError('Please enter some content');
      return;
    }

    if (!userId) {
      setError('User not found. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: createError } = await createNote(userId, note);

      if (createError) throw new Error(createError.message);
      if (!data) throw new Error('Failed to create insight');

      setIsSubmitting(false);
      if (onNoteCreated) onNoteCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create insight. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

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
                <span>New Insight</span>
              </AlertDialogTitle>
              <button
                onClick={handleClose}
                className="cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Create a new insight with markdown support
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Scrollable content wrapper */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5">

          {error && (
            <div className="rounded-lg bg-red-500/10 backdrop-blur-sm p-3 border border-red-500/20 mb-4">
              <p className="text-xs text-red-500 dark:text-red-300 font-medium">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="note-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Title *
              </Label>
              <Input
                id="note-title"
                type="text"
                value={note.title}
                onChange={(e) => setNote({ ...note, title: e.target.value.slice(0, 25) })}
                maxLength={25}
                className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
                placeholder="Insight title (max 25 characters)"
                required
              />
            </div>

            {/* Strategies (optional - multiple selection) */}
            <StrategySelector
              selectedIds={note.strategy_ids}
              onChange={handleStrategyIdsChange}
              strategies={strategies}
              idPrefix="strategy"
            />

            {/* Link to trades (optional) */}
            <TradeLinkingPicker
              selectedRefs={note.trade_refs}
              onChange={handleTradeRefsChange}
              userId={userId}
              strategyIds={note.strategy_ids}
              enabled={isOpen}
              tradePickerSelection={tradePickerSelection}
              onTradePickerSelectionChange={setTradePickerSelection}
              idPrefix="trade"
            />

            {/* Markdown Editor */}
            <MarkdownEditor
              content={note.content}
              onChange={(content) => setNote({ ...note, content })}
              isPreview={isPreview}
              onTogglePreview={() => setIsPreview((prev) => !prev)}
              placeholder="Start writing your insight in markdown..."
            />

            {/* Pin Insight */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pin-note"
                checked={note.is_pinned}
                onCheckedChange={(checked) =>
                  setNote({ ...note, is_pinned: checked as boolean })
                }
                className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 themed-checkbox data-[state=checked]:!text-white transition-colors duration-150"
              />
              <Label htmlFor="pin-note" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
                Pin this insight
              </Label>
            </div>

            {/* Action Buttons */}
            <AlertDialogFooter className="mt-4 flex items-center justify-between pt-4">
              <AlertDialogCancel
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
              >
                Cancel
              </AlertDialogCancel>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 themed-btn-primary shadow-md"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                  {isSubmitting && (
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
                  Create Insight
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </AlertDialogFooter>
          </form>
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
            <span className="text-slate-600 dark:text-slate-400">You have unsaved changes. Are you sure you want to close without saving?</span>
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
