'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserMarkets } from '@/lib/server/tradeLedger/getUserMarkets';
import type { TradeLedgerMode } from '@/lib/tradeLedger/reportConfig';

interface MarketPickerProps {
  mode: TradeLedgerMode;
  accountIds: string[];
  period: { start: string; end: string };
  strategyId: string | null;
  /** Current selection. `null` or empty array = "All markets". */
  selected: string[] | null;
  onChange: (next: string[] | null) => void;
}

export function MarketPicker({
  mode,
  accountIds,
  period,
  strategyId,
  selected,
  onChange,
}: MarketPickerProps) {
  const scopeKey = [
    mode,
    [...accountIds].sort().join(','),
    period.start,
    period.end,
    strategyId ?? '',
  ].join('|');

  const { data: markets = [], isLoading } = useQuery({
    queryKey: ['trade-ledger:markets', scopeKey],
    enabled: accountIds.length > 0,
    staleTime: 30_000,
    gcTime: 60_000,
    queryFn: () => getUserMarkets({ mode, accountIds, period, strategyId }),
  });

  const isAll = !selected || selected.length === 0;

  function toggle(m: string) {
    const current = selected ?? [];
    if (current.includes(m)) {
      const next = current.filter((x) => x !== m);
      onChange(next.length === 0 ? null : next);
    } else {
      onChange([...current, m]);
    }
  }

  function selectAll() {
    onChange(null);
  }

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading markets…
      </p>
    );
  }

  if (markets.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No markets in this period. All trades will be included.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isAll
            ? 'All markets included'
            : `${selected?.length ?? 0} of ${markets.length} selected`}
        </p>
        {!isAll && (
          <button
            type="button"
            onClick={selectAll}
            className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
          >
            Clear (include all)
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {markets.map((m) => {
          const active = selected?.includes(m) ?? false;
          return (
            <button
              key={m}
              type="button"
              onClick={() => toggle(m)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                active
                  ? 'border-transparent themed-btn-primary text-white'
                  : 'border-slate-200/80 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60',
              )}
            >
              {active && <Check className="h-3 w-3" />}
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}
