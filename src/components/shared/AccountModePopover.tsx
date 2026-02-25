'use client';

import * as React from 'react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { getAllAccountsForUser } from '@/lib/server/accounts';
import type { AccountRow } from '@/lib/server/accounts';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { STATIC_DATA } from '@/constants/queryConfig';

export type Mode = 'live' | 'backtesting' | 'demo';

const MODES: Mode[] = ['live', 'demo', 'backtesting'];

const MODE_LABELS: Record<Mode, string> = {
  live: 'Live',
  demo: 'Demo',
  backtesting: 'Backtesting',
};

const MODE_SECTION_LABEL: Record<Mode, string> = {
  live: 'LIVE',
  demo: 'DEMO',
  backtesting: 'BACKTESTING',
};

export interface AccountModeSelection {
  mode: Mode;
  accountId: string | null;
  account?: AccountRow | null;
}

interface AccountModePopoverProps {
  userId: string | undefined;
  value: AccountModeSelection;
  onChange: (selection: AccountModeSelection) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Optional: align trigger width to popover (e.g. min-w-[200px]) */
  triggerClassName?: string;
  /** 'default' = ActionBar style (transparent, h-8); 'input' = insight modal style (filled bg) */
  variant?: 'default' | 'input';
  /** When true, show spinner on trigger and optional triggerLabel */
  loading?: boolean;
  /** Override trigger label (e.g. "Applying…" when loading) */
  triggerLabel?: string;
}

export function AccountModePopover({
  userId,
  value,
  onChange,
  placeholder = 'Select account',
  disabled = false,
  triggerClassName,
  variant = 'input',
  loading = false,
  triggerLabel: triggerLabelProp,
}: AccountModePopoverProps) {
  const [open, setOpen] = React.useState(false);

  const { data: allAccounts = [] } = useQuery<AccountRow[]>({
    queryKey: ['accounts:all', userId],
    enabled: !!userId,
    ...STATIC_DATA,
    queryFn: () => (userId ? getAllAccountsForUser(userId) : []),
  });

  const accountsByMode = React.useMemo(() => {
    const map: Record<Mode, AccountRow[]> = { live: [], demo: [], backtesting: [] };
    for (const a of allAccounts) {
      if (a.mode in map) map[a.mode as Mode].push(a);
    }
    return map;
  }, [allAccounts]);

  const triggerLabel =
    triggerLabelProp ?? value.account?.name ?? placeholder;

  const selectTriggerClass =
    variant === 'default'
      ? 'h-8 overflow-hidden rounded-xl border border-slate-200/80 bg-transparent text-slate-700 hover:bg-slate-100/60 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800/50 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors duration-200 disabled:opacity-50 gap-1.5 sm:gap-2'
      : 'h-9 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-700 dark:text-slate-50 hover:bg-slate-100/60 hover:dark:bg-slate-800/50 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors duration-200 disabled:opacity-50 gap-1.5 sm:gap-2';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select trading account"
          disabled={disabled}
          className={clsx(
            'group flex items-center gap-2 min-w-0',
            selectTriggerClass,
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
            'disabled:pointer-events-none',
            triggerClassName
          )}
        >
          <span className="font-medium max-w-[120px] sm:max-w-[200px] truncate">
            {triggerLabel}
          </span>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronDown
              className={clsx(
                'h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto min-w-[200px] max-w-[min(280px,calc(100vw-2rem))] max-h-[min(320px,70vh)] flex flex-col rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 px-3 pt-2 pb-2 text-slate-900 dark:text-slate-50"
      >
        <div className="overflow-y-auto overscroll-contain">
          {MODES.map((mode, i) => {
            const modeAccounts = accountsByMode[mode];
            return (
              <React.Fragment key={mode}>
                {i > 0 && (
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                )}

                <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 select-none">
                  {MODE_SECTION_LABEL[mode]}
                </div>

                {modeAccounts.length === 0 ? (
                  <p className="px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500 italic">
                    No accounts
                  </p>
                ) : (
                  modeAccounts.map((account) => {
                    const isActive =
                      mode === value.mode && account.id === value.accountId;
                    return (
                      <button
                        key={account.id}
                        type="button"
                        className={clsx(
                          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left cursor-pointer',
                          'transition-colors duration-150',
                          isActive
                            ? 'bg-[var(--tc-subtle)] text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                        )}
                        onClick={() => {
                          onChange({
                            mode,
                            accountId: account.id,
                            account,
                          });
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={clsx(
                            'h-3.5 w-3.5 flex-shrink-0 transition-opacity',
                            isActive
                              ? 'opacity-100 text-[var(--tc-primary)]'
                              : 'opacity-0'
                          )}
                        />
                        <span className="truncate">{account.name}</span>
                      </button>
                    );
                  })
                )}
              </React.Fragment>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
