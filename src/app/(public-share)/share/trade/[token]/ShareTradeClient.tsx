'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, Share2 } from 'lucide-react';
import type { Trade } from '@/types/trade';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { TradeShareRow } from '@/lib/server/publicTradeShares';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/shared/Footer';
import TradeDetailsPanel from '@/components/TradeDetailsPanel';

type ShareTradeClientProps = {
  trade: Trade;
  strategy: { name: string; extra_cards: ExtraCardKey[] } | null;
  shareData: TradeShareRow;
  /** ISO timestamp from trade_shares.expires_at — shown in the header as "Valid until …" */
  expiresAt: string | null;
  currencySymbol: string;
};

export default function ShareTradeClient({
  trade,
  strategy,
  shareData,
  expiresAt,
}: ShareTradeClientProps) {
  const searchParams = useSearchParams();

  // Mirror ShareStrategyClient: apply the owner-selected color theme from ?theme=.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const themeFromUrl = searchParams.get('theme');
    if (!themeFromUrl) return;

    const allowedThemes = ['cyan', 'purple', 'emerald', 'gold', 'ice'] as const;
    if (!allowedThemes.includes(themeFromUrl as (typeof allowedThemes)[number])) {
      return;
    }

    try {
      document.documentElement.setAttribute('data-color-theme', themeFromUrl);
      window.localStorage.setItem('color-theme', themeFromUrl);
    } catch {
      // ignore storage errors
    }
  }, [searchParams]);

  const tradeDateLabel = trade.trade_date
    ? new Date(trade.trade_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-50 w-full">
      <main className="flex-1 w-full mt-12 px-4 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--tc-primary)]/50 px-3 py-1 text-xs font-medium shadow-sm bg-[var(--tc-primary)]/10 text-[var(--tc-primary)]">
                <Share2 className="h-3.5 w-3.5" />
                <span>Read-only shared view</span>
              </div>
              {expiresAt && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-1 text-xs text-slate-500 dark:text-slate-400 backdrop-blur-sm">
                  <span>
                    Valid until{' '}
                    {/* Pinned locale so server and client render the same string (avoids hydration mismatch). */}
                    {new Date(expiresAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {strategy?.name ?? 'Shared trade'}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                Public snapshot of a single trade. Notes and screenshots are visible in
                read-only mode; no other trades or account details are shown.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full border-[var(--tc-primary)]/60 bg-[var(--tc-primary)]/15 text-[var(--tc-primary)]"
              >
                {shareData.mode.toUpperCase()} MODE
              </Badge>
              <Badge
                variant="outline"
                className="text-[11px] font-medium uppercase tracking-wide rounded-full border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-200 px-3 py-1 backdrop-blur-sm"
              >
                {tradeDateLabel}
              </Badge>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-1 text-[11px] text-slate-600 dark:text-slate-300 backdrop-blur-sm">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Viewer cannot edit this trade</span>
            </div>
          </div>
        </header>

        <hr className="col-span-full my-8 border-t border-slate-200 dark:border-slate-700" />

        <div>
          <TradeDetailsPanel
            trade={trade}
            onClose={() => {}}
            readOnly
            pageMode
            extraCards={strategy?.extra_cards ?? []}
            savedTags={[]}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
