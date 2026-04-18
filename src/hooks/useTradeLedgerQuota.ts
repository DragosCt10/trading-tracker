'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface TradeLedgerQuota {
  used: number;
  limit: number | null;
  remaining: number | null;
}

const QUERY_KEY = ['trade-ledger:quota'] as const;

async function fetchQuota(): Promise<TradeLedgerQuota> {
  const res = await fetch('/api/trade-ledger/quota', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch quota');
  return res.json();
}

/** Current-month PDF generation quota for the Trade Ledger builder. */
export function useTradeLedgerQuota(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEY,
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: fetchQuota,
  });
}

/** Call after a successful PDF generation so the UI refetches usage. */
export function useInvalidateTradeLedgerQuota() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: QUERY_KEY });
}
