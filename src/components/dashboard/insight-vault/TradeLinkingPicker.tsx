'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTradesForNoteLinking } from '@/lib/server/trades';
import { queryKeys } from '@/lib/queryKeys';
import type { TradeRef } from '@/types/note';
import type { TradingMode } from '@/types/trade';
import { AccountModePopover, type AccountModeSelection } from '@/components/shared/AccountModePopover';
import { Link2, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface TradeLinkingPickerProps {
  selectedRefs: TradeRef[];
  onChange: (refs: TradeRef[]) => void;
  userId: string | undefined;
  strategyIds: string[];
  /** Controls whether the infinite query is enabled */
  enabled: boolean;
  /** Account/mode picker state */
  tradePickerSelection: AccountModeSelection;
  onTradePickerSelectionChange: (selection: AccountModeSelection) => void;
  /** Prefix for checkbox IDs to avoid collisions between modals */
  idPrefix?: string;
}

export default function TradeLinkingPicker({
  selectedRefs,
  onChange,
  userId,
  strategyIds,
  enabled,
  tradePickerSelection,
  onTradePickerSelectionChange,
  idPrefix = 'trade',
}: TradeLinkingPickerProps) {
  const tradeListScrollSentinelRef = useRef<HTMLDivElement>(null);

  const {
    data: tradesForLinkingData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.tradesForNoteLinking(userId, tradePickerSelection.mode, tradePickerSelection.accountId, strategyIds),
    queryFn: ({ pageParam }) =>
      getTradesForNoteLinking(userId!, tradePickerSelection.mode, {
        accountId: tradePickerSelection.accountId,
        strategyIds: strategyIds.length > 0 ? strategyIds : undefined,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!userId && enabled && !!tradePickerSelection.accountId,
    staleTime: 60 * 1000,
  });

  const tradesForLinking = useMemo(
    () => tradesForLinkingData?.pages.flatMap((p) => p.trades) ?? [],
    [tradesForLinkingData]
  );

  // Refs so the observer callback always reads fresh values without recreating the observer
  const isFetchingNextPageRef = useRef(isFetchingNextPage);
  const fetchNextPageRef = useRef(fetchNextPage);
  useEffect(() => {
    isFetchingNextPageRef.current = isFetchingNextPage;
    fetchNextPageRef.current = fetchNextPage;
  }, [isFetchingNextPage, fetchNextPage]);

  // Infinite scroll: only recreate when accountId or hasNextPage changes
  useEffect(() => {
    if (!tradePickerSelection.accountId || !hasNextPage) return;
    const el = tradeListScrollSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPageRef.current) fetchNextPageRef.current();
      },
      { root: el.closest('.overflow-y-auto'), rootMargin: '100px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tradePickerSelection.accountId, hasNextPage]);

  const isTradeSelected = (id: string, mode: TradingMode) =>
    selectedRefs.some((r) => r.id === id && r.mode === mode);

  const toggleTradeRef = (id: string, mode: TradingMode) => {
    const exists = selectedRefs.some((r) => r.id === id && r.mode === mode);
    const newRefs = exists
      ? selectedRefs.filter((r) => !(r.id === id && r.mode === mode))
      : [...selectedRefs, { id, mode }];
    onChange(newRefs);
  };

  return (
    <div className="space-y-1.5">
      <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        <span className="flex items-center gap-2">
          <Link2 className="h-4 w-4" style={{ color: 'var(--tc-primary)' }} />
          Link to trades (optional)
        </span>
      </Label>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Choose an account (and mode) to list its trades; optionally filter by strategies above.
      </p>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Account:</span>
        <AccountModePopover
          userId={userId}
          value={tradePickerSelection}
          onChange={onTradePickerSelectionChange}
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
            {strategyIds.length === 0
              ? 'No trades in this account yet.'
              : 'No trades for selected strategies in this account.'}
          </p>
        ) : (
          <div className="space-y-2 pr-1">
            {tradesForLinking.map((t) => (
              <div key={`${t.mode}-${t.id}`} className="flex items-center space-x-2">
                <Checkbox
                  id={`${idPrefix}-${t.mode}-${t.id}`}
                  checked={isTradeSelected(t.id, t.mode)}
                  onCheckedChange={() => toggleTradeRef(t.id, t.mode)}
                  className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 themed-checkbox data-[state=checked]:!text-white transition-colors duration-150"
                />
                <Label
                  htmlFor={`${idPrefix}-${t.mode}-${t.id}`}
                  className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300 flex-1 truncate"
                >
                  {t.trade_date} · {t.market} · {t.direction} · {t.trade_outcome}
                </Label>
              </div>
            ))}
            {/* Sentinel for infinite scroll */}
            <div ref={tradeListScrollSentinelRef} className="min-h-4 flex items-center justify-center py-2">
              {isFetchingNextPage && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>
          </div>
        )}
      </div>
      {selectedRefs.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {selectedRefs.length} trade{selectedRefs.length === 1 ? '' : 's'} linked
        </p>
      )}
    </div>
  );
}
