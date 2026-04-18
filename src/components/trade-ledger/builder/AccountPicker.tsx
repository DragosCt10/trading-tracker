'use client';

import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccountOption {
  id: string;
  name: string;
  currency: string;
  mode: 'live' | 'demo' | 'backtesting';
  balance: number;
}

interface AccountPickerProps {
  accounts: AccountOption[];
  mode: 'live' | 'demo' | 'backtesting';
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function AccountPicker({
  accounts,
  mode,
  selectedIds,
  onChange,
}: AccountPickerProps) {
  const modeAccounts = accounts.filter((a) => a.mode === mode);
  const grouped = groupBy(modeAccounts, (a) => a.currency);
  const selectedCurrency =
    selectedIds.length > 0
      ? accounts.find((a) => a.id === selectedIds[0])?.currency
      : null;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (modeAccounts.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No accounts in {mode} mode. Create one from Settings first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([currency, rows]) => {
        const disabled =
          selectedCurrency !== null && currency !== selectedCurrency;
        return (
          <div key={currency}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {currency}
              </span>
              {disabled && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Mixed currencies blocked
                </span>
              )}
            </div>
            <div className="space-y-1">
              {rows.map((acct) => {
                const checked = selectedIds.includes(acct.id);
                return (
                  <button
                    key={acct.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={checked}
                    onClick={() => toggle(acct.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all duration-200 text-left',
                      'min-h-[48px] cursor-pointer backdrop-blur-xl',
                      'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/70 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-50',
                      checked && 'text-slate-900 dark:text-slate-50',
                      disabled && 'opacity-50 cursor-not-allowed hover:border-slate-200/70',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-md border-2 shadow-sm transition-colors duration-150',
                          checked
                            ? 'themed-header-icon-box border-transparent text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800',
                        )}
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="font-medium">{acct.name}</span>
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: acct.currency,
                        maximumFractionDigits: 0,
                      }).format(acct.balance)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {selectedIds.length > 1 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Selected {selectedIds.length} accounts — the report will include a
          consolidated ledger with per-account breakdowns.
        </p>
      )}
    </div>
  );
}

function groupBy<T, K extends string>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
}
