import { NextResponse } from 'next/server';
import { getSharedReport } from '@/lib/server/tradeLedgerShares';
import { renderReport, type AccountMeta } from '@/lib/server/tradeLedger/renderReport';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import type { Trade } from '@/types/trade';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  const shared = await getSharedReport(token);
  if (!shared) {
    return new NextResponse('Report not found or expired', { status: 404 });
  }

  // Load account metadata via service role — the share row doesn't freeze this,
  // but account names/currencies rarely change and this keeps share storage smaller.
  const admin = createAdminClient();
  const { data: accountRows } = await admin
    .from('account_settings')
    .select('id, name, currency, account_balance')
    .in('id', shared.config.accountIds);

  const accounts: AccountMeta[] = (accountRows ?? []).map((a: { id: string; name: string; currency: string; account_balance: number | string }) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    accountBalance: Number(a.account_balance),
  }));

  if (accounts.length === 0) {
    return new NextResponse('Share references accounts that no longer exist', { status: 410 });
  }

  // Trader name is frozen into the share row at creation time (display name
  // from Settings → Profile, then auth `full_name`, then email local-part).
  // Old rows predating the column fall back to a generic label.
  const traderName = shared.traderName?.trim() || 'Alpha Stats Trader';

  try {
    const result = await renderReport({
      config: shared.config,
      trades: shared.tradesSnapshot as Trade[],
      accounts,
      traderName,
      context: { via: 'share' },
    });

    return new NextResponse(new Uint8Array(result.pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="alpha-stats-${result.referenceCode}.pdf"`,
        'Cache-Control': 'public, max-age=300',
        'X-TradeLedger-Ref': result.referenceCode,
        'X-TradeLedger-Hash': shared.integrityHash,
      },
    });
  } catch (error) {
    console.error('[TradeLedger] share PDF render failed', {
      event: 'trade_ledger_share_render_failed',
      token,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse('Could not render report', { status: 500 });
  }
}
