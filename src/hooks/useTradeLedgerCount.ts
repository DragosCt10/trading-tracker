'use client';

import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  countTradesInPeriod,
  type CountTradesInput,
} from '@/lib/server/tradeLedger/countTradesInPeriod';

/**
 * Debounced trade-count preview for the Trade Ledger builder.
 *
 * - Skips the query until accountIds is non-empty.
 * - Debounces 300ms so date input scrubbing doesn't storm the server.
 * - keepPreviousData prevents flicker while the user types.
 */
export function useTradeLedgerCount(input: CountTradesInput, enabled = true) {
  const [debouncedKey, setDebouncedKey] = useState(() => serializeKey(input));

  useEffect(() => {
    const nextKey = serializeKey(input);
    if (nextKey === debouncedKey) return;
    const t = setTimeout(() => setDebouncedKey(nextKey), 300);
    return () => clearTimeout(t);
  }, [input, debouncedKey]);

  const query = useQuery({
    queryKey: ['trade-ledger:count', debouncedKey],
    enabled: enabled && input.accountIds.length > 0,
    staleTime: 15_000,
    gcTime: 60_000,
    placeholderData: keepPreviousData,
    queryFn: () => countTradesInPeriod(input),
  });

  return query;
}

function serializeKey(input: CountTradesInput): string {
  return [
    input.mode,
    [...input.accountIds].sort().join(','),
    input.period.start,
    input.period.end,
    input.strategyId ?? '',
  ].join('|');
}
