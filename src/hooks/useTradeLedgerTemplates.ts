'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteTemplate,
  listTemplates,
  saveTemplate,
  updateTemplate,
  type TradeLedgerTemplateRow,
} from '@/lib/server/tradeLedgerTemplates';
import { queryKeys } from '@/lib/queryKeys';
import { USER_DATA } from '@/constants/queryConfig';
import type { ReportConfig } from '@/lib/tradeLedger/reportConfig';

export function useTradeLedgerTemplates(userId?: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.tradeLedger.templates(userId);

  const list = useQuery<TradeLedgerTemplateRow[]>({
    queryKey: key,
    enabled: !!userId,
    ...USER_DATA,
    queryFn: () => listTemplates(),
  });

  const create = useMutation({
    mutationFn: ({ name, config }: { name: string; config: ReportConfig }) =>
      saveTemplate(name, config),
    onSuccess: (res) => {
      if (res.ok) queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const update = useMutation({
    mutationFn: ({
      id,
      name,
      config,
    }: {
      id: string;
      name: string;
      config: ReportConfig;
    }) => updateTemplate(id, name, config),
    onSuccess: (res) => {
      if (res.ok) queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: (res) => {
      if (res.ok) queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return { list, create, update, remove };
}
