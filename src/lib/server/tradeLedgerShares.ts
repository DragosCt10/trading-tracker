'use server';

import { nanoid } from 'nanoid';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { getCachedUserSession } from '@/lib/server/session';
import { checkRateLimit } from '@/lib/rateLimit';
import { baseReportConfigSchema, type ReportConfig } from '@/lib/tradeLedger/reportConfig';
import {
  SHARE_EXPIRY_CHOICES,
  DEFAULT_SHARE_EXPIRY_DAYS,
  type ShareExpiryDays,
} from '@/lib/tradeLedger/shareConstants';
import { computeAllDashboardStats } from '@/utils/computeAllDashboardStats';
import {
  buildCanonicalPayload,
  buildReferenceCode,
  sha256Hex,
} from '@/lib/tradeLedger/integrityHash';
import type { Trade } from '@/types/trade';

const SHARE_RATE_LIMITS = {
  create: { limit: 10, windowMs: 60_000 },
  publicView: { limit: 60, windowMs: 60_000 },
} as const;

export interface TradeLedgerShareRow {
  id: string;
  token: string;
  config: ReportConfig;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  createdAt: string;
}

export interface CreateShareInput {
  config: ReportConfig;
  expiryDays?: ShareExpiryDays;
}

export interface CreateShareSuccess {
  ok: true;
  token: string;
  shareUrl: string;
  expiresAt: string;
  referenceCode: string;
  integrityHash: string;
}

export interface CreateShareFailure {
  ok: false;
  error: string;
  message?: string;
}

export async function listShares(): Promise<TradeLedgerShareRow[]> {
  const { user } = await getCachedUserSession();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trade_ledger_shares')
    .select('id, token, config, expires_at, revoked_at, view_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[TradeLedger] listShares failed', { userId: user.id, error });
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    token: r.token,
    config: r.config as ReportConfig,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
    viewCount: r.view_count,
    createdAt: r.created_at,
  }));
}

const MAX_SHARE_TRADES = 20_000;

export async function createShare(
  input: CreateShareInput,
): Promise<CreateShareSuccess | CreateShareFailure> {
  const { user } = await getCachedUserSession();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const allowed = await checkRateLimit(
    `tls:create:${user.id}`,
    SHARE_RATE_LIMITS.create.limit,
    SHARE_RATE_LIMITS.create.windowMs,
  );
  if (!allowed) return { ok: false, error: 'rate_limited' };

  const parsed = baseReportConfigSchema.safeParse(input.config);
  if (!parsed.success) return { ok: false, error: 'invalid_config' };
  const config = parsed.data;

  const expiryDays = input.expiryDays ?? DEFAULT_SHARE_EXPIRY_DAYS;
  if (!SHARE_EXPIRY_CHOICES.includes(expiryDays)) {
    return { ok: false, error: 'invalid_expiry' };
  }

  const supabase = await createClient();

  // ── Resolve accounts (IDOR + same-currency + mode match) ──────────────
  const { data: accountRows, error: accountsError } = await supabase
    .from('account_settings')
    .select('id, name, currency, account_balance, user_id, mode')
    .in('id', config.accountIds);

  if (accountsError || !accountRows || accountRows.length !== config.accountIds.length) {
    console.error('[TradeLedger] createShare account fetch failed', {
      userId: user.id,
      error: accountsError,
    });
    return { ok: false, error: 'account_not_found' };
  }

  for (const row of accountRows) {
    if (row.user_id !== user.id) return { ok: false, error: 'forbidden' };
    if (row.mode !== config.mode) return { ok: false, error: 'mode_mismatch' };
  }
  if (new Set(accountRows.map((a) => a.currency)).size > 1) {
    return { ok: false, error: 'mixed_currency' };
  }

  // ── Fetch the trades in-period ────────────────────────────────────────
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
  if (config.strategyId) tradeQuery = tradeQuery.eq('strategy_id', config.strategyId);
  if (config.markets && config.markets.length > 0) {
    tradeQuery = tradeQuery.in('market', config.markets);
  }

  const { data: tradesRaw, error: tradesError } = await tradeQuery;
  if (tradesError) {
    console.error('[TradeLedger] createShare trade fetch failed', {
      userId: user.id,
      error: tradesError,
    });
    return { ok: false, error: 'server_error' };
  }
  const trades = (tradesRaw ?? []) as Trade[];

  if (trades.length === 0) {
    return { ok: false, error: 'no_trades' };
  }
  if (trades.length > MAX_SHARE_TRADES) {
    return { ok: false, error: 'too_many_trades' };
  }

  // ── Compute aggregates + integrity hash ───────────────────────────────
  const aggregateBalance = accountRows.reduce(
    (s, a) => s + Number(a.account_balance),
    0,
  );
  const aggregates = computeAllDashboardStats(
    trades,
    aggregateBalance,
    'executed',
    'all',
  );

  const tradeIds = trades
    .map((t) => t.id)
    .filter((id): id is string => typeof id === 'string');
  const generatedAt = new Date();
  const canonical = buildCanonicalPayload(config, tradeIds, generatedAt);
  const integrityHash = await sha256Hex(canonical);
  const referenceCode = buildReferenceCode(integrityHash, generatedAt, 1);

  const token = nanoid(21);
  const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString();

  const { error: insertError } = await supabase.from('trade_ledger_shares').insert({
    user_id: user.id,
    token,
    config,
    trades_snapshot: trades,
    aggregates: aggregates as unknown as Record<string, unknown>,
    integrity_hash: integrityHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('[TradeLedger] createShare insert failed', {
      userId: user.id,
      error: insertError,
    });
    return { ok: false, error: 'create_failed' };
  }

  return {
    ok: true,
    token,
    shareUrl: `/share/ledger/${token}`,
    expiresAt,
    referenceCode,
    integrityHash,
  };
}

export async function revokeShare(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await getCachedUserSession();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('trade_ledger_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[TradeLedger] revokeShare failed', { userId: user.id, id, error });
    return { ok: false, error: 'revoke_failed' };
  }
  return { ok: true };
}

/**
 * Toggle a share link's active state. Active = `revoked_at IS NULL`.
 * Setting `active: true` clears `revoked_at`; `active: false` sets it to now.
 */
export async function setShareActive(
  id: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await getCachedUserSession();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('trade_ledger_shares')
    .update({ revoked_at: active ? null : new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[TradeLedger] setShareActive failed', {
      userId: user.id,
      id,
      active,
      error,
    });
    return { ok: false, error: 'update_failed' };
  }
  return { ok: true };
}

/** Hard-delete a share row so the link becomes permanently gone. */
export async function deleteShare(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await getCachedUserSession();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('trade_ledger_shares')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[TradeLedger] deleteShare failed', { userId: user.id, id, error });
    return { ok: false, error: 'delete_failed' };
  }
  return { ok: true };
}

/**
 * Public read — resolves a share token into its frozen payload. Uses the
 * service-role client since the caller is unauthenticated.
 * Returns null for invalid / expired / revoked tokens.
 *
 * Also purges rows whose revoked_at is older than 7 days (lazy purge — runs
 * on any public read so we never need a cron).
 */
export async function getSharedReport(token: string): Promise<{
  config: ReportConfig;
  tradesSnapshot: Trade[];
  aggregates: Record<string, unknown>;
  integrityHash: string;
  createdAt: string;
  expiresAt: string | null;
} | null> {
  // Public rate limit — protect against scraping
  const allowed = await checkRateLimit(
    `tls:view:${token}`,
    SHARE_RATE_LIMITS.publicView.limit,
    SHARE_RATE_LIMITS.publicView.windowMs,
  );
  if (!allowed) return null;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Lazy purge: hard-delete rows revoked > 7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  await admin
    .from('trade_ledger_shares')
    .delete()
    .lt('revoked_at', sevenDaysAgo);

  const { data, error } = await admin
    .from('trade_ledger_shares')
    .select('id, config, trades_snapshot, aggregates, integrity_hash, expires_at, revoked_at, view_count, created_at')
    .eq('token', token)
    .is('revoked_at', null)
    .single();

  if (error || !data) return null;
  if (data.expires_at && data.expires_at < now) return null;

  // Best-effort non-atomic view increment. Exact count isn't security-critical.
  void admin
    .from('trade_ledger_shares')
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq('id', data.id)
    .then(() => null, () => null);

  return {
    config: data.config as ReportConfig,
    tradesSnapshot: data.trades_snapshot as Trade[],
    aggregates: data.aggregates as Record<string, unknown>,
    integrityHash: data.integrity_hash,
    createdAt: data.created_at,
    expiresAt: data.expires_at as string | null,
  };
}
