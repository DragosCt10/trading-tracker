'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getInactiveStrategies } from '@/lib/server/strategies';
import { queryKeys } from '@/lib/queryKeys';
import type { Strategy } from '@/types/strategy';

interface ArchivedStrategiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onReactivate: (strategyId: string) => Promise<void>;
  onPermanentDelete: (strategyId: string) => Promise<void>;
  reactivatingStrategyId: string | null;
  deletingStrategyId: string | null;
  /** Bumped from the parent whenever reactivate/delete completes to force a refetch. */
  refreshKey: number;
}

/**
 * Archived Stats Boards sheet. Switched from `AlertDialog` to `Dialog` because
 * the list is a non-destructive browse view, not a confirmation — role=dialog
 * is the correct semantic. A single shared confirmation dialog handles the
 * destructive delete flow instead of one per-row, so 20+ archived rows don't
 * mount 20+ dialog portals on open.
 */
export function ArchivedStrategiesDialog({
  open,
  onOpenChange,
  userId,
  onReactivate,
  onPermanentDelete,
  reactivatingStrategyId,
  deletingStrategyId,
  refreshKey,
}: ArchivedStrategiesDialogProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const {
    data: archivedStrategies,
    isLoading: archivedLoading,
  } = useQuery<Strategy[]>({
    queryKey: [...queryKeys.archivedStrategies(userId), refreshKey],
    queryFn: async () => {
      if (!userId) return [];
      return getInactiveStrategies(userId);
    },
    enabled: !!userId && open,
    staleTime: 2 * 60_000,
  });

  const confirmTarget = archivedStrategies?.find((s) => s.id === confirmDeleteId) ?? null;

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    await onPermanentDelete(id);
  }, [confirmDeleteId, onPermanentDelete]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          id="stats-archived-dialog"
          className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl px-6 py-5"
        >
          {/* Only mount heavy decorative layers when the dialog is actually open. */}
          {open ? (
            <>
              {/* Gradient orbs background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl" aria-hidden="true">
                <div
                  className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl"
                  style={{ animationDuration: '8s' }}
                />
                <div
                  className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl"
                  style={{ animationDuration: '10s', animationDelay: '2s' }}
                />
              </div>

              {/* Noise texture overlay — inline SVG kept at dialog scope so it mounts lazily. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'repeat',
                }}
              />

              {/* Top accent line */}
              <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" aria-hidden="true" />
            </>
          ) : null}

          <div className="relative flex flex-col h-full">
            <DialogHeader className="space-y-1.5 mb-4">
              <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg themed-header-icon-box">
                  <Archive className="h-5 w-5" aria-hidden="true" />
                </div>
                <span>Archived Stats Boards</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                View and reactivate your archived Stats Boards. Reactivated Stats Boards will appear in your main Stats Center.
              </DialogDescription>
            </DialogHeader>

            <Alert className="mb-4 rounded-xl border-slate-200/80 bg-slate-100/60 dark:border-slate-700/80 dark:bg-slate-800/40">
              <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
                Important: Archived Stats Boards and all related trades are automatically deleted after 30 days.
              </AlertDescription>
            </Alert>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
              <div className="space-y-3">
                {archivedLoading ? (
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/60 dark:border-slate-300/50 bg-transparent">
                    <div className="flex-1 min-w-0">
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 mb-2 animate-pulse" aria-hidden="true" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse" aria-hidden="true" />
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" aria-hidden="true" />
                    </div>
                    <span className="sr-only">Loading archived strategies</span>
                  </div>
                ) : archivedStrategies && archivedStrategies.length > 0 ? (
                  archivedStrategies.map((strategy) => {
                    const isReactivating = reactivatingStrategyId === strategy.id;
                    const isDeleting = deletingStrategyId === strategy.id;
                    const disabled = isReactivating || isDeleting;
                    return (
                      <div
                        key={strategy.id}
                        className="group flex items-center justify-between p-4 rounded-xl border border-slate-700/60 dark:border-slate-300/50 bg-transparent hover:bg-slate-100/30 dark:hover:bg-slate-800/30 hover:border-slate-600/80 dark:hover:border-slate-400/80 transition-all duration-200"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate transition-colors group-hover:[color:var(--tc-text)] dark:group-hover:[color:var(--tc-text-dark)]">
                            {strategy.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Archived on {new Date(strategy.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReactivate(strategy.id)}
                            disabled={disabled}
                            aria-label={`Reactivate archived Stats Board ${strategy.name}`}
                            className="cursor-pointer relative h-8 overflow-hidden rounded-xl themed-btn-primary text-white font-semibold group/btn border-0 text-xs disabled:opacity-60 disabled:pointer-events-none [&_svg]:text-white px-3"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2 group-hover/btn:text-white">
                              {isReactivating ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                              )}
                              <span>Reactivate</span>
                            </span>
                            <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmDeleteId(strategy.id)}
                            disabled={disabled}
                            aria-label={`Permanently delete archived Stats Board ${strategy.name}`}
                            className="relative cursor-pointer p-2 px-4.5 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 disabled:pointer-events-none h-8 w-8"
                          >
                            <span className="relative z-10 flex items-center justify-center">
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              )}
                            </span>
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                    <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                    <p>No archived strategies</p>
                    <p className="text-xs mt-1">Strategies you delete will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single shared destructive-confirm dialog. Replaces the prior per-row AlertDialog. */}
      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmDeleteId(null);
        }}
      >
        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-slate-600 dark:text-slate-400">
                Are you sure you want to permanently delete &quot;{confirmTarget?.name ?? ''}&quot;? This will also delete all trades linked to this strategy. This action cannot be undone.
              </span>
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
                onClick={handleConfirmDelete}
                className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 flex items-center gap-2"
              >
                Yes, Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

