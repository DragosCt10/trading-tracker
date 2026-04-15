'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Share2 } from 'lucide-react';
import type { Trade } from '@/types/trade';
import {
  createTradeShareAction,
  getUserTradeSharesAction,
  setTradeShareActiveAction,
  deleteTradeShareAction,
  type TradeShareRow,
} from '@/lib/server/publicTradeShares';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalShell } from '@/components/ui/ModalShell';
import { ShareLinkRow } from '@/components/share/ShareLinkRow';
import { cn } from '@/lib/utils';
import { useColorTheme } from '@/hooks/useColorTheme';

/**
 * The modal requires a trade that has id, user_id, account_id and mode set.
 * The caller (TradeDetailsPanel) already checks `trade?.id` before rendering, but
 * the Trade type marks these fields as optional, so we narrow here for TS safety.
 */
type ShareableTrade = Trade & {
  id: string;
  user_id: string;
  account_id: string;
  mode: NonNullable<Trade['mode']>;
};

type ShareTradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade;
};

function buildFullUrl(shareToken: string, colorTheme: string | null): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  let fullUrl = `${origin}/share/trade/${shareToken}`;
  if (colorTheme != null) {
    fullUrl += `${fullUrl.includes('?') ? '&' : '?'}theme=${encodeURIComponent(colorTheme)}`;
  }
  return fullUrl;
}

export function ShareTradeModal({ open, onOpenChange, trade: rawTrade }: ShareTradeModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState<'Copy' | 'Copied!'>('Copy');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { colorTheme } = useColorTheme();

  // Narrow to the required fields. If any is missing we show an error state
  // — this should be unreachable because TradeDetailsPanel checks trade?.id first.
  const trade = rawTrade as ShareableTrade;
  const missingFields = !rawTrade.id || !rawTrade.user_id || !rawTrade.account_id || !rawTrade.mode;

  const userId = trade.user_id;
  const sharesQueryKey = queryKeys.tradeShares(userId ?? 'none');

  const { data: allShares = [] } = useQuery({
    queryKey: sharesQueryKey,
    queryFn: () => getUserTradeSharesAction({ userId }),
    enabled: open && Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  // Only show shares for THIS specific trade in the modal list.
  const existingShares = useMemo(
    () => allShares.filter((s) => s.trade_id === trade.id),
    [allShares, trade.id]
  );

  // Auto-generate on open. Dedup on the server guarantees no duplicate rows.
  useEffect(() => {
    if (!open) {
      // Reset when closing so the next open starts fresh.
      setShareUrl(null);
      setCopyLabel('Copy');
      setErrorMessage(null);
      return;
    }

    if (missingFields) {
      setErrorMessage('This trade is missing data required to generate a share link.');
      return;
    }

    if (shareUrl) return; // already generated during this open session

    startTransition(async () => {
      setErrorMessage(null);
      const { url, share, error } = await createTradeShareAction({
        tradeId: trade.id,
        accountId: trade.account_id,
        mode: trade.mode,
        strategyId: trade.strategy_id ?? null,
        userId,
      });

      if (error || !url || !share) {
        setErrorMessage(error ?? 'Failed to generate share link. Please try again.');
        return;
      }

      const finalUrl = buildFullUrl(share.share_token, colorTheme ?? null);
      setShareUrl(finalUrl);

      // Optimistically prepend to the cached list so SharedTradesPanel is fresh.
      queryClient.setQueryData<TradeShareRow[]>(sharesQueryKey, (prev) => {
        if (!prev) return [share];
        if (prev.some((s) => s.id === share.id)) return prev;
        return [share, ...prev];
      });
    });
    // We intentionally run this only when the modal opens — re-running on other
    // dependency changes would spam the server action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 2000);
    } catch {
      // Clipboard may be blocked in insecure contexts — ignore silently.
    }
  };

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
        // If we just deleted the share we were showing, clear the URL so the
        // next open regenerates (won't reuse the dead token).
        setShareUrl(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const activeSharesSection = existingShares.length > 0 ? (
    <div className="space-y-2 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
        Active share links for this trade
      </p>
      <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
        Turn a link off to immediately make it private.
      </p>
      <div className="space-y-2">
        {existingShares.map((share) => (
          <ShareLinkRow
            key={share.id}
            primaryLabel={
              [share.trade_market, share.trade_direction, share.trade_date]
                .filter(Boolean)
                .join(' · ') || `Trade ${share.trade_id.slice(0, 8)}`
            }
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
    </div>
  ) : null;

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Share2 className="h-5 w-5" />}
      title="Share this trade"
      description="Generate a public, read-only link to a single trade. Viewers can't edit it or see your other trades."
      mode={trade.mode}
      belowScrollContent={activeSharesSection}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
            Your share link
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              readOnly
              value={
                shareUrl
                  ? shareUrl
                  : isPending
                    ? 'Generating link…'
                    : 'Link will appear here shortly'
              }
              className={cn(
                'rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-900/40',
                shareUrl
                  ? 'text-xs text-slate-700 dark:text-slate-200'
                  : 'text-[11px] text-slate-400 dark:text-slate-500 italic'
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!shareUrl}
              className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200 h-9 disabled:opacity-60"
            >
              {isPending && !shareUrl ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-1">Generating…</span>
                </>
              ) : (
                copyLabel
              )}
            </Button>
          </div>

          {errorMessage ? (
            <p className="text-xs font-medium text-rose-500 dark:text-rose-400">
              {errorMessage}
            </p>
          ) : null}

          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Manage all your shared trades anytime from{' '}
            <strong className="text-slate-800 dark:text-slate-200">Settings → Shared Trades</strong>.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
