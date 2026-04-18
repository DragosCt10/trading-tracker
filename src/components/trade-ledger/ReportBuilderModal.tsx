'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, Link2, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalShell } from '@/components/ui/ModalShell';
import { ShareLinkRow } from '@/components/share/ShareLinkRow';
import { Textarea } from '@/components/ui/textarea';
import { useColorTheme } from '@/hooks/useColorTheme';
import type { TradeLedgerShareRow } from '@/lib/server/tradeLedgerShares';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PeriodPicker, type Period } from './builder/PeriodPicker';
import { AccountPicker, type AccountOption } from './builder/AccountPicker';
import { SectionPicker } from './builder/SectionPicker';
import {
  createReportConfigSchema,
  defaultReportConfig,
  type AccountCurrencyRecord,
  type ReportConfig,
  type TradeLedgerMode,
} from '@/lib/tradeLedger/reportConfig';
import {
  generateLedgerPdf,
  triggerPdfDownload,
} from '@/lib/tradeLedger/generateLedgerPdf';
import { useTradeLedgerTemplates } from '@/hooks/useTradeLedgerTemplates';
import { useTradeLedgerShares } from '@/hooks/useTradeLedgerShares';
import { useTradeLedgerCount } from '@/hooks/useTradeLedgerCount';
import {
  useInvalidateTradeLedgerQuota,
  useTradeLedgerQuota,
} from '@/hooks/useTradeLedgerQuota';
import {
  SHARE_EXPIRY_CHOICES,
  DEFAULT_SHARE_EXPIRY_DAYS,
  type ShareExpiryDays,
} from '@/lib/tradeLedger/shareConstants';
import { format, startOfMonth } from 'date-fns';

const MAX_TRADES = 20_000;

interface ReportBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  accounts: AccountOption[];
  /** Optional config to prefill (e.g. loaded from a template). */
  initialConfig?: ReportConfig;
}

const DEFAULT_MODE: TradeLedgerMode = 'live';

/** Matches NewTradeModal.tsx field styling. */
export const TL_INPUT_CLASS =
  'h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300';

export const TL_LABEL_CLASS =
  'block text-sm font-semibold text-slate-700 dark:text-slate-300';

export function ReportBuilderModal({
  open,
  onOpenChange,
  userId,
  accounts,
  initialConfig,
}: ReportBuilderModalProps) {
  const firstAccount = accounts[0];
  const initialMode = (initialConfig?.mode ?? firstAccount?.mode ?? DEFAULT_MODE) as TradeLedgerMode;
  const initialAccountId = initialConfig?.accountIds[0] ?? firstAccount?.id ?? '';
  const now = new Date();
  const startPeriod: Period = initialConfig?.period ?? {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(now, 'yyyy-MM-dd'),
  };

  const [config, setConfig] = useState<ReportConfig>(() =>
    initialConfig ?? defaultReportConfig(initialAccountId, initialMode, startPeriod),
  );
  const [templateName, setTemplateName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [, startConfigTransition] = useTransition();
  const templates = useTradeLedgerTemplates(userId);
  const shares = useTradeLedgerShares(userId);
  const quotaQuery = useTradeLedgerQuota(open);
  const invalidateQuota = useInvalidateTradeLedgerQuota();
  const quota = quotaQuery.data;
  const isQuotaExhausted =
    quota?.limit !== undefined &&
    quota?.limit !== null &&
    (quota?.remaining ?? 0) <= 0;

  const [shareExpiry, setShareExpiry] = useState<ShareExpiryDays>(DEFAULT_SHARE_EXPIRY_DAYS);
  const [isSharing, setIsSharing] = useState(false);
  const [lastCreatedReference, setLastCreatedReference] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { colorTheme } = useColorTheme();

  useEffect(() => {
    if (initialConfig) {
      startConfigTransition(() => setConfig(initialConfig));
    }
  }, [initialConfig]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const accountsById = useMemo<Record<string, AccountCurrencyRecord>>(
    () =>
      Object.fromEntries(
        accounts.map((a) => [a.id, { id: a.id, currency: a.currency }]),
      ),
    [accounts],
  );

  const countQuery = useTradeLedgerCount(
    {
      mode: config.mode,
      accountIds: config.accountIds,
      period: config.period,
      strategyId: config.strategyId,
    },
    open,
  );

  const tradeCount = countQuery.data?.count ?? 0;
  const isCountLoading = countQuery.isLoading || countQuery.isFetching;
  const hasAccountSelection = config.accountIds.length > 0;
  const countKnown = !!countQuery.data && !countQuery.data.skipped;
  const isPeriodEmpty = countKnown && tradeCount === 0;
  const isOverLimit = countKnown && tradeCount > MAX_TRADES;
  const canGenerate =
    hasAccountSelection &&
    !isCountLoading &&
    !isPeriodEmpty &&
    !isOverLimit &&
    !isQuotaExhausted;

  function updateConfig(patch: Partial<ReportConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
    setValidationError(null);
  }

  function updateSections(updater: (prev: ReportConfig['sections']) => ReportConfig['sections']) {
    setConfig((prev) => ({ ...prev, sections: updater(prev.sections) }));
    setValidationError(null);
  }

  function setMode(mode: TradeLedgerMode) {
    const first = accounts.find((a) => a.mode === mode);
    setConfig((prev) => ({
      ...prev,
      mode,
      accountIds: first ? [first.id] : [],
    }));
  }

  function validate(): ReportConfig | null {
    const schema = createReportConfigSchema(accountsById);
    const parsed = schema.safeParse(config);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setValidationError(firstIssue?.message ?? 'Invalid configuration');
      return null;
    }
    return parsed.data;
  }

  async function handleGenerate() {
    setServerError(null);
    if (isPeriodEmpty) {
      setValidationError('No trades in the selected period. Widen the range or switch accounts.');
      return;
    }
    if (isOverLimit) {
      setValidationError(
        `This period has ${tradeCount.toLocaleString()} trades. Trade Ledger supports up to ${MAX_TRADES.toLocaleString()}. Narrow the range.`,
      );
      return;
    }
    const validated = validate();
    if (!validated) return;
    setIsGenerating(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const result = await generateLedgerPdf(validated, { signal: ctrl.signal });
    setIsGenerating(false);

    if (!result.ok) {
      setServerError(result.message ?? humanizeError(result.error));
      return;
    }

    triggerPdfDownload(result.blob, result.filename);
    invalidateQuota();
    onOpenChange(false);
  }

  async function handleSaveTemplate() {
    setServerError(null);
    const validated = validate();
    if (!validated) return;
    if (!templateName.trim()) {
      setValidationError('Give your template a name before saving.');
      return;
    }
    setIsSaving(true);
    const res = await templates.create.mutateAsync({
      name: templateName.trim(),
      config: validated,
    });
    setIsSaving(false);
    if (!res.ok) {
      setServerError(humanizeError(res.error));
      return;
    }
    setTemplateName('');
  }

  async function handleShare() {
    setServerError(null);
    setLastCreatedReference(null);
    if (isPeriodEmpty) {
      setValidationError('No trades in the selected period. Adjust before sharing.');
      return;
    }
    if (isOverLimit) {
      setValidationError(
        `This period has ${tradeCount.toLocaleString()} trades. Trade Ledger supports up to ${MAX_TRADES.toLocaleString()}.`,
      );
      return;
    }
    const validated = validate();
    if (!validated) return;

    setIsSharing(true);
    const res = await shares.create.mutateAsync({
      config: validated,
      expiryDays: shareExpiry,
    });
    setIsSharing(false);

    if (!res.ok) {
      setServerError(humanizeError(res.error));
      return;
    }

    setLastCreatedReference(res.referenceCode);
  }

  function buildShareUrl(token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let fullUrl = `${origin}/share/ledger/${token}`;
    if (colorTheme != null) {
      fullUrl += `${fullUrl.includes('?') ? '&' : '?'}theme=${encodeURIComponent(colorTheme)}`;
    }
    return fullUrl;
  }

  async function handleToggleShareActive(share: TradeLedgerShareRow) {
    const isActive = share.revokedAt === null;
    setRevokingId(share.id);
    try {
      await shares.setActive.mutateAsync({ id: share.id, active: !isActive });
    } finally {
      setRevokingId(null);
    }
  }

  async function handleDeleteShare(share: TradeLedgerShareRow) {
    if (deletingId) return;
    setDeletingId(share.id);
    try {
      await shares.remove.mutateAsync(share.id);
    } finally {
      setDeletingId(null);
    }
  }

  const footer = (
    <div className="flex items-center justify-between gap-3">
      {quota && quota.limit !== null ? (
        <p
          className={`text-xs font-medium ${
            isQuotaExhausted
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {quota.used} / {quota.limit} PDFs this month
        </p>
      ) : (
        <span />
      )}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={isGenerating}
          className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
        >
          Cancel
        </Button>
        <Button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || !canGenerate}
        size="sm"
        title={
          isPeriodEmpty
            ? 'No trades in the selected period'
            : isOverLimit
              ? `Over the ${MAX_TRADES.toLocaleString()}-trade limit — narrow the period`
              : isQuotaExhausted
                ? `You've used all ${quota?.limit} PDFs for this month — upgrade for unlimited`
                : undefined
        }
        className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold border-0 px-4 py-2 group [&_svg]:text-white disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Generating…</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span className="text-sm">Generate PDF</span>
          </>
        )}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
      </Button>
      </div>
    </div>
  );

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<FileText className="h-5 w-5" />}
      title="New Trade Ledger Report"
      description="Choose a period, one or more accounts, and the stats you want included in the PDF."
      maxWidth="max-w-xl"
      footer={footer}
    >
      <div className="space-y-8">
        {/* Step 1: Period + Mode */}
        <section className="space-y-3">
          <StepHeading step={1} title="Period" />
          <PeriodPicker
            value={config.period}
            onChange={(p) => updateConfig({ period: p })}
          />
          <div className="space-y-1.5">
            <Label className={TL_LABEL_CLASS}>Mode</Label>
            <Select value={config.mode} onValueChange={(v) => setMode(v as TradeLedgerMode)}>
              <SelectTrigger className={TL_INPUT_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="backtesting">Backtesting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TradeCountPill
            loading={isCountLoading}
            hasAccounts={hasAccountSelection}
            count={tradeCount}
            countKnown={countKnown}
            overLimit={isOverLimit}
          />
        </section>

        {/* Step 2: Accounts */}
        <section className="space-y-3">
          <StepHeading step={2} title="Accounts" />
          <AccountPicker
            accounts={accounts}
            mode={config.mode}
            selectedIds={config.accountIds}
            onChange={(ids) => updateConfig({ accountIds: ids })}
          />
        </section>

        {/* Step 3: Sections */}
        <section className="space-y-3">
          <StepHeading
            step={3}
            title="Sections"
            description="Account Summary and Transaction Ledger are always included."
          />
          <SectionPicker sections={config.sections} onChange={updateSections} />

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="key-metrics-bullets"
              checked={config.sections.keyMetricsBullets}
              onCheckedChange={(checked) =>
                updateSections((prev) => ({
                  ...prev,
                  keyMetricsBullets: checked === true,
                }))
              }
              className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
            />
            <Label htmlFor="key-metrics-bullets" className="text-sm font-normal cursor-pointer">
              Include Key Metrics bullets
            </Label>
          </div>
        </section>

        {/* Step 4: Notes */}
        <section className="space-y-3">
          <StepHeading step={4} title="Footer notes (optional)" />
          <Textarea
            placeholder="E.g. 'Q2 prop firm audit report'"
            maxLength={250}
            value={config.sections.footerNotes ?? ''}
            onChange={(e) =>
              updateSections((prev) => ({
                ...prev,
                footerNotes: e.target.value || null,
              }))
            }
            className={`${TL_INPUT_CLASS} min-h-[88px] py-3`}
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
            {(config.sections.footerNotes ?? '').length} / 250
          </p>
        </section>

        {/* Step 5: Save as template */}
        <section className="space-y-3 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
          <StepHeading step={5} title="Save as template (optional)" />
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Monthly prop firm audit"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              maxLength={30}
              className={TL_INPUT_CLASS}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveTemplate}
              disabled={isSaving || !templateName.trim()}
              className="cursor-pointer h-12 rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 text-sm font-medium transition-colors duration-200"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-2">Save</span>
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
            {templateName.length} / 30
          </p>
        </section>

        {/* Step 6: Share link */}
        <section className="space-y-3 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
          <StepHeading
            step={6}
            title="Share as a public link (optional)"
            description="Freezes the report at this moment so a prop firm, mentor, or accountant can view it without a login. The integrity hash is preserved forever."
          />

          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className={TL_LABEL_CLASS}>Expires in</Label>
              <Select
                value={String(shareExpiry)}
                onValueChange={(v) => setShareExpiry(Number(v) as ShareExpiryDays)}
              >
                <SelectTrigger className={TL_INPUT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHARE_EXPIRY_CHOICES.map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      {days === 7 ? '7 days' : days === 30 ? '30 days' : days === 90 ? '90 days' : '1 year'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end">
              <Button
                type="button"
                onClick={handleShare}
                disabled={isSharing || !canGenerate}
                className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold border-0 px-4 h-12 group [&_svg]:text-white disabled:opacity-60"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm">Creating…</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    <span className="ml-2 text-sm">Create link</span>
                  </>
                )}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </div>
          </div>

          {lastCreatedReference && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Link created · Reference{' '}
              <span className="font-mono">{lastCreatedReference}</span>
            </p>
          )}

          {/* Existing shares list */}
          {shares.list.data && shares.list.data.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
                Active share links
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                Turn a link off to immediately make it private.
              </p>
              <div className="space-y-2">
                {shares.list.data.map((share) => {
                  const active = share.revokedAt === null;
                  const expiresLabel = share.expiresAt
                    ? `Expires ${format(new Date(share.expiresAt), 'MMM d, yyyy')}`
                    : `Created ${format(new Date(share.createdAt), 'MMM d, yyyy')}`;
                  const period = share.config.period;
                  const primaryLabel = period
                    ? `${period.start} ~ ${period.end}`
                    : 'Trade ledger report';
                  return (
                    <ShareLinkRow
                      key={share.id}
                      primaryLabel={primaryLabel}
                      secondaryLabel={expiresLabel}
                      shareUrl={buildShareUrl(share.token)}
                      active={active}
                      onToggleActive={() => handleToggleShareActive(share)}
                      onDelete={() => handleDeleteShare(share)}
                      isRevoking={revokingId === share.id}
                      isDeleting={deletingId === share.id}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {validationError && (
          <Alert variant="destructive">
            <AlertTitle>Check your setup</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}
        {serverError && (
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t generate report</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
      </div>
    </ModalShell>
  );
}

interface TradeCountPillProps {
  loading: boolean;
  hasAccounts: boolean;
  count: number;
  countKnown: boolean;
  overLimit: boolean;
}

function TradeCountPill({
  loading,
  hasAccounts,
  count,
  countKnown,
  overLimit,
}: TradeCountPillProps) {
  if (!hasAccounts) return null;

  if (loading && !countKnown) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking trades in this period…
      </div>
    );
  }

  if (overLimit) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200/80 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-950/30 px-3 py-2 text-xs font-medium text-rose-800 dark:text-rose-200">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>
          {count.toLocaleString()} trades — over the {MAX_TRADES.toLocaleString()}{' '}
          limit. Narrow the period.
        </span>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>No trades in this period. Adjust the dates or the account selection.</span>
      </div>
    );
  }

  const approaching = count >= MAX_TRADES * 0.9;
  if (approaching) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>
          {count.toLocaleString()} trades — approaching the{' '}
          {MAX_TRADES.toLocaleString()} limit.
        </span>
      </div>
    );
  }

  return (
    <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
      {count.toLocaleString()} {count === 1 ? 'trade' : 'trades'} in this period
    </p>
  );
}

function StepHeading({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-400">
        Step {step} · {title}
      </p>
      {description && (
        <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
      )}
    </div>
  );
}

function humanizeError(code: string): string {
  switch (code) {
    case 'rate_limited':
      return 'You have generated a lot of reports in the last minute — try again shortly.';
    case 'too_many_trades':
      return 'This period has more than 20,000 trades. Narrow the period and try again.';
    case 'forbidden':
      return 'Account access denied.';
    case 'unauthenticated':
      return 'You need to be logged in.';
    case 'mixed_currency':
      return 'All selected accounts must share a currency.';
    case 'mode_mismatch':
      return 'Account mode does not match report mode.';
    case 'no_trades':
      return 'No trades in the selected period — nothing to share.';
    case 'invalid_config':
      return 'The report configuration is invalid.';
    case 'invalid_expiry':
      return 'Invalid expiry choice.';
    case 'network_error':
      return 'Network error — check your connection.';
    default:
      return 'Something went wrong generating the report.';
  }
}
