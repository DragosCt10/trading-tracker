import { notFound } from 'next/navigation';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getShareByToken } from '@/lib/server/publicShares';
import { getStrategyById } from '@/lib/server/strategies';
import ShareStrategyClient from './ShareStrategyClient';
import type { StrategyShareRow } from '@/lib/server/publicShares';

export const dynamic = 'force-dynamic';

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
    // Show a simple not-found state for invalid or revoked links.
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <div className="max-w-md px-6 py-8 rounded-2xl border border-slate-800/70 bg-slate-900/60 shadow-xl shadow-black/40">
          <h1 className="text-2xl font-semibold mb-3">Link not found or expired</h1>
          <p className="text-sm text-slate-300">
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

  return (
    <main className="min-h-screen">
      <ShareStrategyClient
        trades={await (async () => {
          // Lazily import to avoid circular dependency at module evaluation.
          const { getPublicTradesForShare } = await import('@/lib/server/publicShares');
          return getPublicTradesForShare({
            accountId: share.account_id,
            mode: share.mode,
            strategyId: share.strategy_id,
            startDate: share.start_date,
            endDate: share.end_date,
          });
        })()}
        strategy={{
          name: strategy.name,
          extra_cards: strategy.extra_cards,
        }}
        shareData={share as StrategyShareRow}
        currencySymbol={currencySymbol}
        accountBalance={accountBalance}
      />
    </main>
  );
}

