'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedUserSession } from '@/lib/server/session';
import { checkRateLimit } from '@/lib/rateLimit';
import { baseReportConfigSchema, type ReportConfig } from '@/lib/tradeLedger/reportConfig';

export interface TradeLedgerTemplateRow {
  id: string;
  name: string;
  config: ReportConfig;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_RATE_LIMITS = {
  write: { limit: 30, windowMs: 60_000 },
} as const;

export async function listTemplates(): Promise<TradeLedgerTemplateRow[]> {
  const { user } = await getCachedUserSession();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trade_ledger_templates')
    .select('id, name, config, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[TradeLedger] listTemplates failed', { userId: user.id, error });
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    config: r.config as ReportConfig,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function saveTemplate(
  name: string,
  config: ReportConfig,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { user } = await getCachedUserSession();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const allowed = await checkRateLimit(
    `tlt:save:${user.id}`,
    TEMPLATE_RATE_LIMITS.write.limit,
    TEMPLATE_RATE_LIMITS.write.windowMs,
  );
  if (!allowed) return { ok: false, error: 'rate_limited' };

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 255) {
    return { ok: false, error: 'Template name must be 1–255 characters.' };
  }

  const parsed = baseReportConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid config' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trade_ledger_templates')
    .insert({ user_id: user.id, name: trimmed, config: parsed.data })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[TradeLedger] saveTemplate failed', { userId: user.id, error });
    return { ok: false, error: 'save_failed' };
  }

  return { ok: true, id: data.id };
}

export async function updateTemplate(
  id: string,
  name: string,
  config: ReportConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await getCachedUserSession();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const allowed = await checkRateLimit(
    `tlt:update:${user.id}`,
    TEMPLATE_RATE_LIMITS.write.limit,
    TEMPLATE_RATE_LIMITS.write.windowMs,
  );
  if (!allowed) return { ok: false, error: 'rate_limited' };

  const parsed = baseReportConfigSchema.safeParse(config);
  if (!parsed.success) return { ok: false, error: 'Invalid config' };

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 255) {
    return { ok: false, error: 'Template name must be 1–255 characters.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('trade_ledger_templates')
    .update({ name: trimmed, config: parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[TradeLedger] updateTemplate failed', { userId: user.id, id, error });
    return { ok: false, error: 'update_failed' };
  }
  return { ok: true };
}

export async function deleteTemplate(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await getCachedUserSession();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('trade_ledger_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[TradeLedger] deleteTemplate failed', { userId: user.id, id, error });
    return { ok: false, error: 'delete_failed' };
  }
  return { ok: true };
}
