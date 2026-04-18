import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import { checkRateLimit } from '@/lib/rateLimit';
import { baseReportConfigSchema } from '@/lib/tradeLedger/reportConfig';
import { renderReport, type AccountMeta } from '@/lib/server/tradeLedger/renderReport';
import { getTradeLedgerQuota, recordTradeLedgerGeneration } from '@/lib/server/subscription';
import type { Trade } from '@/types/trade';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_TRADES = 20_000;

const GENERATE_RATE_LIMIT = { limit: 20, windowMs: 60_000 } as const;

export async function POST(request: Request) {
  const { user } = await getCachedUserSession();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const allowed = await checkRateLimit(
    `tl:generate:${user.id}`,
    GENERATE_RATE_LIMIT.limit,
    GENERATE_RATE_LIMIT.windowMs,
  );
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  // ── Monthly PDF quota (Starter Plus: 5/mo, Pro/Elite: unlimited) ──
  const quota = await getTradeLedgerQuota(user.id);
  if (quota.remaining !== null && quota.remaining <= 0) {
    return NextResponse.json(
      {
        error: 'monthly_limit_exceeded',
        message: `You've used all ${quota.limit} Trade Ledger PDFs for this month. Upgrade to PRO for unlimited reports.`,
        used: quota.used,
        limit: quota.limit,
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = baseReportConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_config', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const config = parsed.data;

  const supabase = await createClient();

  // ── 1. Load account metadata + IDOR guard ───────────────────────────────
  const { data: accountRows, error: accountsError } = await supabase
    .from('account_settings')
    .select('id, name, currency, account_balance, user_id, mode')
    .in('id', config.accountIds);

  if (accountsError) {
    console.error('[TradeLedger] account fetch failed', {
      userId: user.id,
      error: accountsError,
    });
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  if (!accountRows || accountRows.length !== config.accountIds.length) {
    return NextResponse.json({ error: 'account_not_found' }, { status: 404 });
  }

  for (const row of accountRows) {
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (row.mode !== config.mode) {
      return NextResponse.json(
        { error: 'mode_mismatch', message: 'Account mode does not match report mode.' },
        { status: 400 },
      );
    }
  }

  const currencies = new Set(accountRows.map((a) => a.currency));
  if (currencies.size > 1) {
    return NextResponse.json(
      {
        error: 'mixed_currency',
        message: 'Consolidated reports require all selected accounts to share a currency.',
      },
      { status: 400 },
    );
  }

  const accounts: AccountMeta[] = accountRows.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    accountBalance: Number(a.account_balance),
  }));

  // ── 2. Fetch trades ──────────────────────────────────────────────────────
  const tableName = `${config.mode}_trades` as const;
  let tradeQuery = supabase
    .from(tableName)
    .select('*')
    .eq('user_id', user.id)
    .in('account_id', config.accountIds)
    .gte('trade_date', config.period.start)
    .lte('trade_date', config.period.end)
    .order('trade_date', { ascending: true })
    .order('trade_time', { ascending: true });

  if (config.strategyId) {
    tradeQuery = tradeQuery.eq('strategy_id', config.strategyId);
  }

  const { data: tradesRaw, error: tradesError } = await tradeQuery;

  if (tradesError) {
    console.error('[TradeLedger] trade fetch failed', {
      userId: user.id,
      error: tradesError,
    });
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const trades = (tradesRaw ?? []) as Trade[];

  if (trades.length > MAX_TRADES) {
    return NextResponse.json(
      {
        error: 'too_many_trades',
        message: `This period contains ${trades.length.toLocaleString()} trades. Trade Ledger supports up to ${MAX_TRADES.toLocaleString()} per report. Narrow the period.`,
        count: trades.length,
        max: MAX_TRADES,
      },
      { status: 413 },
    );
  }

  // ── 3. Trader display name ──────────────────────────────────────────────
  const traderName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.email ? user.email.split('@')[0] : 'Trader');

  // ── 4. Render ───────────────────────────────────────────────────────────
  try {
    const result = await renderReport({
      config,
      trades,
      accounts,
      traderName,
      context: { via: 'download' },
    });

    // Burn a quota slot only after a successful render so failures don't
    // cost the user a report. Best-effort — if the insert fails we still
    // ship the PDF (logged for follow-up).
    let postQuota = quota;
    try {
      postQuota = await recordTradeLedgerGeneration(user.id);
    } catch (err) {
      console.error('[TradeLedger] quota increment failed', {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="alpha-stats-${result.referenceCode}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-TradeLedger-Ref': result.referenceCode,
      'X-TradeLedger-Hash': result.hashHex,
      'X-TradeLedger-Used': String(postQuota.used),
    };
    if (postQuota.limit !== null) {
      headers['X-TradeLedger-Limit'] = String(postQuota.limit);
    }

    return new NextResponse(new Uint8Array(result.pdf), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[TradeLedger] generate failed', {
      event: 'trade_ledger_generate_failed',
      userId: user.id,
      tradeCount: trades.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'generation_failed' },
      { status: 500 },
    );
  }
}
