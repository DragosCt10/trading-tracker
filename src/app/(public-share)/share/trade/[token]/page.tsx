import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import {
  getTradeShareByToken,
  getPublicTradeForShare,
} from '@/lib/server/publicTradeShares';
import { getStrategyById } from '@/lib/server/strategies';
import { type ExtraCardKey } from '@/constants/extraCards';
import ShareTradeClient from './ShareTradeClient';
import type { TradeShareRow } from '@/lib/server/publicTradeShares';

export const dynamic = 'force-dynamic';

// Never index share pages — they contain private trade data.
// X-Robots-Tag: noindex is also set in middleware for defence-in-depth.
export const metadata: Metadata = {
  title: 'Shared trade · Trading Tracker',
  robots: { index: false, follow: false, nocache: true },
};

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

function getCurrencySymbolFromCode(code: string | null | undefined): string {
  switch (code) {
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'JPY':
      return '¥';
    case 'CHF':
      return 'CHF';
    case 'AUD':
      return 'A$';
    case 'CAD':
      return 'C$';
    case 'NZD':
      return 'NZ$';
    case 'USD':
    default:
      return '$';
  }
}

function NotFoundCard() {
  return (
    <main className="min-h-screen max-w-(--breakpoint-xl) mx-auto w-full flex items-center justify-center px-4">
      <div className="max-w-md w-full px-6 py-8 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50">
        <h1 className="text-2xl font-semibold mb-3">Link not found or expired</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This shared trade link is no longer available. It may have been revoked by
          the owner or the URL is incorrect.
        </p>
      </div>
    </main>
  );
}

export default async function ShareTradePage({ params }: PageProps) {
  const { token } = await params;

  const share = await getTradeShareByToken(token);
  if (!share) {
    return <NotFoundCard />;
  }

  const trade = await getPublicTradeForShare({
    tradeId: share.trade_id,
    accountId: share.account_id,
    mode: share.mode as 'live' | 'backtesting' | 'demo',
  });
  if (!trade) {
    // Trade was hard-deleted after the share was created — render 404.
    return notFound();
  }

  const strategy = share.strategy_id ? await getStrategyById(share.strategy_id) : null;

  const supabase = createServiceRoleClient();
  const { data: account } = await supabase
    .from('account_settings')
    .select('currency')
    .eq('id', share.account_id)
    .single();

  const typedAccount = account as { currency?: string | null } | null;
  const currencySymbol = getCurrencySymbolFromCode(typedAccount?.currency ?? 'USD');

  return (
    <main className="min-h-screen max-w-(--breakpoint-xl) mx-auto w-full">
      <ShareTradeClient
        trade={trade}
        strategy={
          strategy
            ? {
                name: strategy.name,
                extra_cards: (strategy.extra_cards ?? []) as ExtraCardKey[],
              }
            : null
        }
        shareData={share as TradeShareRow}
        expiresAt={share.expires_at ?? null}
        currencySymbol={currencySymbol}
      />
    </main>
  );
}
