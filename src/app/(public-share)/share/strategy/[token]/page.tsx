import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { logShareError } from '@/lib/server/shareLogger';
import { getShareByToken, getShareStatsCache, getPublicTradesForShare } from '@/lib/server/publicShares';
import { getStrategyById } from '@/lib/server/strategies';
import { getDashboardAggregatesServiceRole } from '@/lib/server/dashboardAggregates';
import { resolveSubscription } from '@/lib/server/subscription';
import { PRO_ONLY_EXTRA_CARD_KEYS, type ExtraCardKey } from '@/constants/extraCards';
import { tierAtLeast } from '@/constants/tiers';
import ShareStrategyClient from './ShareStrategyClient';
import type { StrategyShareRow } from '@/lib/server/publicShares';
import {
  buildSharePageStatsFromCache,
  buildEmptySharePageStats,
} from './sharePageStats';

export const dynamic = 'force-dynamic';

// Never index share pages — they contain private PnL data.
// X-Robots-Tag: noindex is also set in middleware for defence-in-depth
// (Slack / Discord unfurl bots ignore <meta> tags).
export const metadata: Metadata = {
  title: 'Shared strategy · Trading Tracker',
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

export default async function ShareStrategyPage({ params }: PageProps) {
  const resolvedParams = await params;
  const token = resolvedParams.token;

  const share = await getShareByToken(token);

  if (!share) {
    // Show a not-found state matching the share page / app: same gradient background and card design.
    return (
      <main className="min-h-screen max-w-(--breakpoint-xl) mx-auto w-full flex items-center justify-center px-4">
        <div className="max-w-md w-full px-6 py-8 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50">
          <h1 className="text-2xl font-semibold mb-3">Link not found or expired</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This shared strategy analytics link is no longer available. It may have been revoked by
            the owner or the URL is incorrect.
          </p>
        </div>
      </main>
    );
  }

  const strategy = await getStrategyById(share.strategy_id);

  if (!strategy) {
    return notFound();
  }

  // Fetch account currency via service role so we can render the correct symbol.
  const supabase = createServiceRoleClient();
  const { data: account } = await supabase
    .from('account_settings')
    .select('currency, account_balance')
    .eq('id', share.account_id)
    .single();

  const typedAccount = account as
    | { currency?: string | null; account_balance?: number | null }
    | null;

  const currencySymbol = getCurrencySymbolFromCode(typedAccount?.currency ?? 'USD');
  const accountBalance = typedAccount?.account_balance ?? null;

  // Always fetch full trades for MY TRADES tab (images, notes, all fields).
  // For analytics: use cache if available; on cache miss call the RPC via service role,
  // store the result, and use it — so subsequent visits are served from cache.
  const [trades, cachedStats, ownerSubscription] = await Promise.all([
    getPublicTradesForShare({
      accountId: share.account_id,
      mode: share.mode as 'live' | 'backtesting' | 'demo',
      strategyId: share.strategy_id,
      startDate: share.start_date,
      endDate: share.end_date,
    }),
    getShareStatsCache(share.id),
    resolveSubscription(share.created_by),
  ]);

  let rpcResult = cachedStats;

  if (!rpcResult) {
    // Cache miss: run the RPC with the service role client (bypasses auth, requires DB
    // to allow service_role calls — see get_dashboard_aggregates auth check).
    try {
      rpcResult = await getDashboardAggregatesServiceRole({
        userId: share.created_by,
        accountId: share.account_id,
        mode: share.mode,
        startDate: share.start_date,
        endDate: share.end_date,
        strategyId: share.strategy_id,
        execution: 'executed',
        accountBalance: accountBalance ?? 0,
        includeCompactTrades: true,
        market: 'all',
        includeSeries: false,
      });

      // Persist so the next visit is served from cache.
      const serviceSupabase = createServiceRoleClient();
      await serviceSupabase
        .from('share_stats_cache')
        .upsert({ share_id: share.id, stats: rpcResult as unknown as Record<string, unknown> });
    } catch (err) {
      logShareError({ route: 'ShareStrategyPage', shareId: share.id }, 'Failed to compute share stats on cache miss (non-fatal)', err);
    }
  }

  const precomputedStats = rpcResult
    ? buildSharePageStatsFromCache(
        rpcResult,
        accountBalance ?? 0,
        share.mode,
        share.start_date,
        share.end_date,
      )
    : buildEmptySharePageStats();

  const isPro = tierAtLeast(ownerSubscription.tier, 'pro');

  return (
    <main className="min-h-screen max-w-(--breakpoint-xl) mx-auto w-full">
      <ShareStrategyClient
        trades={trades}
        precomputedStats={precomputedStats}
        strategy={{
          name: strategy.name,
          extra_cards: isPro
            ? strategy.extra_cards
            : strategy.extra_cards.filter(
                (card) => !PRO_ONLY_EXTRA_CARD_KEYS.includes(card as ExtraCardKey)
              ),
        }}
        shareData={share as StrategyShareRow}
        expiresAt={share.expires_at ?? null}
        currencySymbol={currencySymbol}
        accountBalance={accountBalance}
        isPro={isPro}
      />
    </main>
  );
}

