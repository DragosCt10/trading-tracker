'use client';

import { Target, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STATS_DEFAULT_DESCRIPTION } from './constants';
import type { AccountRow } from '@/lib/server/accounts';

interface StatsHeaderProps {
  activeAccount: AccountRow | null;
  isArchivedSheetOpen: boolean;
  onOpenArchived: () => void;
}

export function StatsHeader({
  activeAccount,
  isArchivedSheetOpen,
  onOpenArchived,
}: StatsHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl shadow-sm themed-header-icon-box">
            <Target className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent min-h-[2.25rem]">
              {!activeAccount ? (
                <>
                  <span className="sr-only">Loading account name</span>
                  <span
                    aria-hidden="true"
                    className="inline-block h-9 w-48 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
                  />
                </>
              ) : (
                activeAccount.name
              )}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 min-h-[1.25rem]">
              {!activeAccount ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-64 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse"
                />
              ) : (
                STATS_DEFAULT_DESCRIPTION
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={onOpenArchived}
            aria-expanded={isArchivedSheetOpen}
            aria-controls="stats-archived-dialog"
            aria-label="Open archived Stats Boards"
            className="flex cursor-pointer items-center gap-2 h-8 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 text-xs sm:text-sm font-medium transition-colors duration-200"
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            <span>Archived</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
