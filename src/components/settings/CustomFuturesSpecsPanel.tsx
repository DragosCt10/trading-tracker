'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
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

import { useUserDetails } from '@/hooks/useUserDetails';
import { useSettings } from '@/hooks/useSettings';
import { deleteCustomFuturesSpec } from '@/lib/server/settings';
import { queryKeys } from '@/lib/queryKeys';
import { MAX_CUSTOM_FUTURES_SPECS } from '@/constants/futuresSpecs';
import type { CustomFuturesSpec } from '@/types/account-settings';

import { SaveCustomFuturesSpecModal } from '@/components/trades/SaveCustomFuturesSpecModal';

/**
 * Settings panel: list of user-saved custom futures contract specs.
 * Reuses SaveCustomFuturesSpecModal for both "Add new" and "Edit existing".
 *
 * Deleting a saved spec is safe even when historical trades reference it because
 * `calculated_risk_dollars` is snapshotted at write time (see plan OV8).
 */
export default function CustomFuturesSpecsPanel() {
  const queryClient = useQueryClient();
  const { data: userId } = useUserDetails();
  const { settings, settingsLoading } = useSettings({ userId: userId?.user?.id });
  const specs = settings.custom_futures_specs ?? [];

  const [editingSpec, setEditingSpec] = useState<CustomFuturesSpec | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomFuturesSpec | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const atCap = specs.length >= MAX_CUSTOM_FUTURES_SPECS;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const { error } = await deleteCustomFuturesSpec(deleteTarget.symbol);

    if (error) {
      setDeleteError(error.message ?? 'Failed to delete symbol.');
      setDeleting(false);
      return;
    }

    if (userId?.user?.id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings(userId.user.id) });
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            My Futures Symbols
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Custom contract specs for futures markets not in the canonical catalog.
            {' '}
            <span className="text-slate-400 dark:text-slate-500">
              ({specs.length}/{MAX_CUSTOM_FUTURES_SPECS} saved)
            </span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setAddOpen(true)}
          disabled={atCap}
          className="themed-btn-primary cursor-pointer rounded-xl text-white font-semibold px-3 py-1.5 border-0 disabled:opacity-60 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">Add symbol</span>
        </Button>
      </div>

      {settingsLoading && specs.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : specs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">No saved symbols yet.</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            Save a symbol from a futures trade form, or click <span className="font-medium">Add symbol</span> above.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {specs.map((spec) => (
            <li
              key={spec.symbol}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/40 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {spec.symbol}
                  </span>
                  {spec.label && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {spec.label}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-mono">${spec.dollarPerSlUnit}</span>
                  {' / '}
                  <span>{spec.slUnitLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingSpec(spec)}
                  className="h-8 w-8 p-0 cursor-pointer text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  aria-label={`Edit ${spec.symbol}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(spec)}
                  className="h-8 w-8 p-0 cursor-pointer text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  aria-label={`Delete ${spec.symbol}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {atCap && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          You&apos;ve reached the maximum of {MAX_CUSTOM_FUTURES_SPECS} saved symbols. Delete one to add another.
        </p>
      )}

      {/* Add new */}
      <SaveCustomFuturesSpecModal
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      {/* Edit existing */}
      <SaveCustomFuturesSpecModal
        open={editingSpec != null}
        onOpenChange={(open) => {
          if (!open) setEditingSpec(null);
        }}
        initialValues={
          editingSpec
            ? {
                symbol: editingSpec.symbol,
                label: editingSpec.label,
                dollarPerSlUnit: editingSpec.dollarPerSlUnit,
                slUnitLabel: editingSpec.slUnitLabel,
              }
            : undefined
        }
        symbolLocked={editingSpec != null}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved symbol?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-mono font-semibold">{deleteTarget.symbol}</span> will be
                  removed from your saved symbols. Existing trades using this symbol will keep
                  their original P&amp;L (snapshot is preserved); you can re-save the symbol later
                  if you trade it again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="rounded-lg bg-red-500/10 p-3 border border-red-500/20">
              <p className="text-xs text-red-500 dark:text-red-300 font-medium">{deleteError}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
