'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Loader2 } from 'lucide-react';
import {
  getUserTradeSharesAction,
  setTradeShareActiveAction,
  deleteTradeShareAction,
  type TradeShareRow,
} from '@/lib/server/publicTradeShares';
import { queryKeys } from '@/lib/queryKeys';
import { ShareLinkRow } from '@/components/share/ShareLinkRow';
import { useColorTheme } from '@/hooks/useColorTheme';

interface SharedTradesPanelProps {
  userId: string;
}

function buildFullUrl(shareToken: string, colorTheme: string | null): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  let fullUrl = `${origin}/share/trade/${shareToken}`;
  if (colorTheme != null) {
    fullUrl += `${fullUrl.includes('?') ? '&' : '?'}theme=${encodeURIComponent(colorTheme)}`;
  }
  return fullUrl;
}

function formatShareRowLabel(share: TradeShareRow): string {
  const parts: string[] = [share.mode.toUpperCase()];
  if (share.trade_market) parts.push(share.trade_market);
  if (share.trade_direction) parts.push(share.trade_direction);
  if (share.trade_date) parts.push(share.trade_date);
  if (parts.length === 1) {
    // Fallback when labels are missing (legacy row or null values).
    parts.push(`trade ${share.trade_id.slice(0, 8)}`);
  }
  return parts.join(' · ');
}

export default function SharedTradesPanel({ userId }: SharedTradesPanelProps) {
  const queryClient = useQueryClient();
  const { colorTheme } = useColorTheme();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sharesQueryKey = queryKeys.tradeShares(userId);

  const { data: shares = [], isLoading } = useQuery({
    queryKey: sharesQueryKey,
    queryFn: () => getUserTradeSharesAction({ userId }),
    staleTime: 60_000,
  });

  const handleToggleShareActive = async (share: TradeShareRow) => {
    const nextActive = !share.active;
    setRevokingId(share.id);
    try {
      const { error } = await setTradeShareActiveAction({
        shareId: share.id,
        userId,
        active: nextActive,
      });
      if (!error) {
        queryClient.setQueryData<TradeShareRow[]>(sharesQueryKey, (prev) =>
          prev?.map((s) => (s.id === share.id ? { ...s, active: nextActive } : s)) ?? []
        );
      }
    } finally {
      setRevokingId(null);
    }
  };

  const handleDeleteShare = async (share: TradeShareRow) => {
    if (deletingId) return;
    setDeletingId(share.id);
    try {
      const { error } = await deleteTradeShareAction({ shareId: share.id, userId });
      if (!error) {
        queryClient.setQueryData<TradeShareRow[]>(sharesQueryKey, (prev) =>
          prev?.filter((s) => s.id !== share.id) ?? []
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Shared trades
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Manage public share links for individual trades. Turn a link off to
          immediately make it private, or delete it to revoke access permanently.
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading shared trades…</span>
          </div>
        ) : shares.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300/60 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 px-4 py-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You haven&apos;t shared any trades yet.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Open any trade and click the share icon to create a link.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {shares.map((share) => (
              <ShareLinkRow
                key={share.id}
                primaryLabel={formatShareRowLabel(share)}
                secondaryLabel={`Created ${new Date(share.created_at).toLocaleDateString()}`}
                shareUrl={buildFullUrl(share.share_token, colorTheme ?? null)}
                active={share.active}
                onToggleActive={() => handleToggleShareActive(share)}
                onDelete={() => handleDeleteShare(share)}
                isRevoking={revokingId === share.id}
                isDeleting={deletingId === share.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
