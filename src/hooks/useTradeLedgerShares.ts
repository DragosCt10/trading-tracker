'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createShare,
  deleteShare,
  listShares,
  revokeShare,
  setShareActive,
  type CreateShareInput,
  type TradeLedgerShareRow,
} from '@/lib/server/tradeLedgerShares';
import { queryKeys } from '@/lib/queryKeys';
import { USER_DATA } from '@/constants/queryConfig';

export function useTradeLedgerShares(userId?: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.tradeLedger.shares(userId);

  const list = useQuery<TradeLedgerShareRow[]>({
    queryKey: key,
    enabled: !!userId,
    ...USER_DATA,
    queryFn: () => listShares(),
  });

  const create = useMutation({
    mutationFn: (input: CreateShareInput) => createShare(input),
    onSuccess: (res) => {
      if (res.ok) queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeShare(id),
    onSuccess: (res) => {
      if (res.ok) queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setShareActive(id, active),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TradeLedgerShareRow[]>(key);
      queryClient.setQueryData<TradeLedgerShareRow[]>(key, (prev) =>
        prev?.map((s) =>
          s.id === id
            ? { ...s, revokedAt: active ? null : new Date().toISOString() }
            : s,
        ) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteShare(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TradeLedgerShareRow[]>(key);
      queryClient.setQueryData<TradeLedgerShareRow[]>(key, (prev) =>
        prev?.filter((s) => s.id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { list, create, revoke, setActive, remove };
}
