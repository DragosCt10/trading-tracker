'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Check, MoreHorizontal, Wand2, FileText, Mail } from 'lucide-react';
import { matchHeaders, applyValueMatches, toFieldMapping, DB_SCHEMA, type ColumnMatch, type SchemaField } from '@/lib/columnMatcher';
import { matchCsvColumns, type ColumnSuggestion } from '@/utils/csvColumnMatcher';
import { buildAutoNormalizations, normalizeDirection, normalizeOutcome } from '@/lib/tradeNormalizers';
import {
  extractColumnSamples,
  parseCsvTradesWithNorm,
  type AiNormalizations,
} from '@/utils/tradeImportParser';
import { calculateTradePnl } from '@/utils/helpers/tradePnlCalculator';
import { tradeDateAndTimeToUtcISO } from '@/utils/tradeExecutedAt';
import { importTrades } from '@/lib/server/trades';
import type { Database } from '@/types/supabase';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];
type Step = 'upload' | 'map' | 'importing' | 'done';

const cancelButtonClass =
  'cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200';

function scoreBadge(score: number) {
  if (score === 0) return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  if (score >= 90) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
  if (score >= 75) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
}

interface ImportTradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'live' | 'backtesting' | 'demo';
  activeAccount: AccountRow | null;
  strategyId: string;
}

export default function ImportTradesModal({
  isOpen,
  onClose,
  mode,
  activeAccount,
  strategyId,
}: ImportTradesModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultValuesCardRef = useRef<HTMLDivElement>(null);

  // ── Core state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Column matching ─────────────────────────────────────────────────────
  const [matches, setMatches] = useState<ColumnMatch[]>([]);
  const [columnSamples, setColumnSamples] = useState<Record<string, string[]>>({});

  // ── AI translation (background, unmatched headers only) ─────────────────
  const [translating, setTranslating] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  // ── Value-based matcher suggestions (combined date/time, ambiguous cols) ─
  const [suggestions, setSuggestions] = useState<ColumnSuggestion[]>([]);

  // ── AI value translation (background, unrecognized categorical values only) ─
  const [aiValueNorms, setAiValueNorms] = useState<AiNormalizations>({});
  const [translatingValues, setTranslatingValues] = useState(false);

  // ── "More options" modal for unresolved required fields ─────────────────
  const [moreOptionsField, setMoreOptionsField] = useState<SchemaField | null>(null);
  const [aiMatchingField, setAiMatchingField] = useState<string | null>(null);

  // ── Per-field inline defaults (applied to rows missing that column) ──────
  const [fieldDefaults, setFieldDefaults] = useState<Record<string, string>>({});

  // ── Import defaults ─────────────────────────────────────────────────────
  const [defaultRiskPct, setDefaultRiskPct] = useState<number | null>(null);
  const [customRiskInput, setCustomRiskInput] = useState('');
  const [defaultRR, setDefaultRR] = useState<number | null>(null);
  const [customRRInput, setCustomRRInput] = useState('');
  const [defaultValuesCardError, setDefaultValuesCardError] = useState(false);

  useEffect(() => {
    if (defaultRiskPct !== null && defaultRR !== null) setDefaultValuesCardError(false);
  }, [defaultRiskPct, defaultRR]);

  // ── Import result ───────────────────────────────────────────────────────
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    failed: { row: number; reason: string }[];
  } | null>(null);

  // ── Reset ───────────────────────────────────────────────────────────────
  function resetState() {
    setStep('upload');
    setIsDragging(false);
    setCsvText('');
    setFileName('');
    setErrorMessage('');
    setMatches([]);
    setColumnSamples({});
    setTranslating(false);
    setTranslations({});
    setSuggestions([]);
    setMoreOptionsField(null);
    setAiMatchingField(null);
    setFieldDefaults({});
    setAiValueNorms({});
    setTranslatingValues(false);
    setDefaultRiskPct(null);
    setCustomRiskInput('');
    setDefaultRR(null);
    setCustomRRInput('');
    setImportProgress(0);
    setImportResult(null);
    setDefaultValuesCardError(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    resetState();
    onClose();
  }

  // ── Value translation helper ─────────────────────────────────────────────
  // Collects sample values that the deterministic normalizer cannot resolve for
  // direction / trade_outcome / be_final_result, then asks the AI to map them
  // to the canonical English equivalents. Only triggered when unresolved values exist.
  async function triggerValueTranslation(
    currentMatches: ColumnMatch[],
    samples: Record<string, string[]>,
  ) {
    const fields: { direction?: string[]; trade_outcome?: string[]; be_final_result?: string[] } = {};

    const candidates: Array<{
      dbField: 'direction' | 'trade_outcome' | 'be_final_result';
      isResolved: (v: string) => boolean;
    }> = [
      { dbField: 'direction',      isResolved: (v) => normalizeDirection(v) !== null },
      { dbField: 'trade_outcome',  isResolved: (v) => normalizeOutcome(v) !== null },
      { dbField: 'be_final_result',isResolved: (v) => normalizeOutcome(v) === 'Win' || normalizeOutcome(v) === 'Lose' },
    ];

    for (const { dbField, isResolved } of candidates) {
      const csvHeader = currentMatches.find((m) => m.dbField === dbField)?.csvHeader;
      if (!csvHeader) continue;

      const unresolved = (samples[csvHeader] ?? []).filter(
        (v) => !isResolved(v) && /[a-zA-Z]/.test(v), // word-like only; skip numbers/symbols
      );
      if (unresolved.length > 0) fields[dbField] = unresolved;
    }

    if (Object.keys(fields).length === 0) return;

    setTranslatingValues(true);
    try {
      const res = await fetch('/api/translate-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) return;
      const norms: AiNormalizations = await res.json();
      setAiValueNorms(norms);
    } catch {
      // Silent — keep deterministic-only normalizations
    } finally {
      setTranslatingValues(false);
    }
  }

  // ── File handling ────────────────────────────────────────────────────────
  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Please upload a .csv file.');
      return;
    }
    setErrorMessage('');

    const text = await file.text();

    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const headers = parsed.meta.fields ?? [];
    if (headers.length === 0) {
      setErrorMessage('Could not read CSV headers. Make sure the file is valid.');
      return;
    }

    const samples = extractColumnSamples(text);
    setCsvText(text);
    setFileName(file.name);
    setColumnSamples(samples);
    setTranslations({});

    // Step 1: local fuzzy match — instant (header-name based)
    const initialMatches = matchHeaders(headers);

    // Step 2: value-based match — pattern analysis on sample cell contents.
    // Upgrades low-confidence fuzzy matches and catches columns with generic
    // or misleading headers (e.g. "Column A", "Type") by reading the actual values.
    const valueResult = matchCsvColumns(samples);
    setSuggestions(valueResult.suggestions);
    const currentMatches = applyValueMatches(initialMatches, valueResult);
    setMatches(currentMatches);
    setStep('map');

    // Step 3b: background value translation — detect unresolved categorical cell values
    // (direction / trade_outcome / be_final_result) and ask AI to map them to English.
    // Runs concurrently with header translation; uses post-value-match column assignments.
    triggerValueTranslation(currentMatches, samples).catch(() => {});

    // Step 3: background AI translation for unmatched headers only.
    // Only send headers that contain non-ASCII characters — those are likely
    // foreign-language. Pure ASCII headers are English; leave them unmatched
    // for manual mapping rather than letting the AI expand/rephrase them.
    const unmatched = headers.filter(
      (h) => initialMatches.find((m) => m.csvHeader === h)?.dbField === null,
    );
    const needsTranslation = unmatched.filter((h) => /[^\x00-\x7F]/.test(h));
    if (needsTranslation.length === 0) return;

    setTranslating(true);
    try {
      const res = await fetch('/api/translate-headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: needsTranslation }),
      });
      if (!res.ok) return;

      const translationMap: Record<string, string> = await res.json();

      // Only keep entries where the translation actually differs
      const meaningful = Object.fromEntries(
        Object.entries(translationMap).filter(
          ([orig, translated]) => orig !== translated && translated,
        ),
      );
      if (Object.keys(meaningful).length === 0) return;

      // Re-run both matchers with translations applied, then merge again.
      const translatedHeaders = headers.map((h) => meaningful[h] ?? h);
      const translatedFuzzy = matchHeaders(translatedHeaders).map((m, i) => ({
        ...m,
        csvHeader: headers[i], // restore original name for display
      }));
      setMatches(applyValueMatches(translatedFuzzy, valueResult));
      setTranslations(meaningful);
    } catch {
      // Silent — keep local-only matches
    } finally {
      setTranslating(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  // ── Inline match edit ────────────────────────────────────────────────────
  function updateMatch(csvHeader: string, newDbField: string | null) {
    setMatches((prev) =>
      prev.map((m) => {
        // Enforce one-to-one: clear this field from any other column that already holds it
        if (newDbField && m.csvHeader !== csvHeader && m.dbField === newDbField) {
          return { ...m, dbField: null, score: 0, label: '— Ignore —', required: false, valueType: null };
        }
        if (m.csvHeader !== csvHeader) return m;
        if (!newDbField) return { ...m, dbField: null, score: 0, label: '— Ignore —' };
        const field = DB_SCHEMA.find((f) => f.key === newDbField);
        return {
          ...m,
          dbField: newDbField,
          score: 100,
          label: field?.label ?? newDbField,
          required: field?.required ?? false,
          valueType: field?.valueType ?? null,
        };
      }),
    );
  }

  // ── Import ───────────────────────────────────────────────────────────────
  async function handleImport() {
    if (!activeAccount) return;

    // Only require defaults when the respective CSV columns are NOT already mapped
    const riskIsMapped = matches.some((m) => m.dbField === 'risk_per_trade');
    const rrIsMapped = matches.some((m) => m.dbField === 'risk_reward_ratio');
    if ((defaultRiskPct === null && !riskIsMapped) || (defaultRR === null && !rrIsMapped)) {
      setDefaultValuesCardError(true);
      setErrorMessage('');
      defaultValuesCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setDefaultValuesCardError(false);

    setStep('importing');
    setImportProgress(0);
    setErrorMessage('');

    const progressInterval = setInterval(() => {
      setImportProgress((p) => Math.min(p + 5, 90));
    }, 200);

    try {
      const fieldMapping = toFieldMapping(matches);
      const baseNorms = buildAutoNormalizations(fieldMapping, columnSamples);
      // Merge AI-translated value mappings on top of the deterministic normalizations.
      // Deterministic rules run first (spread order); AI fills the gaps for foreign languages.
      const normalizations: AiNormalizations = {
        ...baseNorms,
        direction:       { ...baseNorms.direction,       ...aiValueNorms.direction },
        trade_outcome:   { ...baseNorms.trade_outcome,   ...aiValueNorms.trade_outcome },
        be_final_result: { ...baseNorms.be_final_result, ...aiValueNorms.be_final_result },
      };

      const { rows: rawRows, errors } = parseCsvTradesWithNorm(csvText, fieldMapping, normalizations, {
        ...(defaultRiskPct !== null ? { risk_per_trade: defaultRiskPct } : {}),
        ...(defaultRR !== null ? { risk_reward_ratio: defaultRR } : {}),
      });

      // Apply inline field defaults to rows that are missing those values
      const rows = rawRows.map((row) => ({
        ...row,
        ...(fieldDefaults.trade_date    && !row.trade_date    ? { trade_date:    fieldDefaults.trade_date }    : {}),
        ...(fieldDefaults.trade_time    && !row.trade_time    ? { trade_time:    fieldDefaults.trade_time }    : {}),
        ...(fieldDefaults.market        && !row.market        ? { market:        fieldDefaults.market }        : {}),
        ...(fieldDefaults.direction     && !row.direction     ? { direction:     fieldDefaults.direction }     : {}),
        ...(fieldDefaults.trade_outcome && !row.trade_outcome ? { trade_outcome: fieldDefaults.trade_outcome } : {}),
      }));

      if (rows.length === 0) {
        clearInterval(progressInterval);
        setErrorMessage('No valid rows to import. Check the column mapping.');
        setStep('map');
        return;
      }

      // Compute PnL for every row — identical to NewTradeModal pattern
      const accountBalance = activeAccount.account_balance ?? 0;
      const tradesToImport = rows.map((row) => {
        const { pnl_percentage, calculated_profit } = calculateTradePnl(
          {
            trade_outcome: row.trade_outcome,
            risk_per_trade: row.risk_per_trade,
            risk_reward_ratio: row.risk_reward_ratio,
            break_even: row.break_even,
          },
          accountBalance,
        );
        const trade_executed_at = tradeDateAndTimeToUtcISO(row.trade_date ?? '', row.trade_time ?? '') ?? undefined;
        return { ...row, pnl_percentage, calculated_profit, ...(trade_executed_at != null ? { trade_executed_at } : {}) };
      });

      const result = await importTrades({
        mode,
        account_id: activeAccount.id,
        strategy_id: strategyId || null,
        trades: tradesToImport,
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      const allFailed = [
        ...errors.map((e) => ({ row: e.rowIndex, reason: `${e.field}: ${e.message}` })),
        ...(result.failed ?? []),
      ];

      setImportResult({ inserted: result.inserted, failed: allFailed });
      setStep('done');

      if (result.inserted > 0) {
        queryClient.invalidateQueries({
          predicate: (q) => (q.queryKey?.[0] as string) === 'allTrades',
        });
      }
    } catch (err) {
      clearInterval(progressInterval);
      setErrorMessage(err instanceof Error ? err.message : 'Import failed. Please try again.');
      setStep('map');
    }
  }

  // ── AI column match for a specific missing required field ────────────────
  async function handleAiMatch(field: SchemaField) {
    setAiMatchingField(field.key);
    try {
      const res = await fetch('/api/match-trade-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: matches.map((m) => m.csvHeader), columnSamples }),
      });
      if (!res.ok) return;
      const { fieldMapping } = await res.json() as { fieldMapping: Record<string, string | null> };
      const csvCol = Object.entries(fieldMapping).find(([, dbField]) => dbField === field.key)?.[0];
      if (csvCol) {
        updateMatch(csvCol, field.key);
        setMoreOptionsField(null);
      }
    } catch {
      // silent
    } finally {
      setAiMatchingField(null);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const parsedRowCount = useMemo(() => {
    if (!csvText || matches.length === 0) return 0;
    const fieldMapping = toFieldMapping(matches);
    const baseNorms = buildAutoNormalizations(fieldMapping, columnSamples);
    const normalizations: AiNormalizations = {
      ...baseNorms,
      direction:       { ...baseNorms.direction,       ...aiValueNorms.direction },
      trade_outcome:   { ...baseNorms.trade_outcome,   ...aiValueNorms.trade_outcome },
      be_final_result: { ...baseNorms.be_final_result, ...aiValueNorms.be_final_result },
    };
    const { rows } = parseCsvTradesWithNorm(csvText, fieldMapping, normalizations, {
      ...(defaultRiskPct !== null ? { risk_per_trade: defaultRiskPct } : {}),
      ...(defaultRR !== null ? { risk_reward_ratio: defaultRR } : {}),
    });
    return rows.length;
  }, [csvText, matches, columnSamples, defaultRiskPct, defaultRR, aiValueNorms]);

  const mappedCount = matches.filter((m) => m.dbField).length;

  // Required fields with no mapped CSV column — shown in the "Not Matched" table section
  const requiredNotMapped = DB_SCHEMA.filter(
    (f) => f.required && !matches.some((m) => m.dbField === f.key),
  ).filter((f) => {
    // Already resolved by the dedicated default controls below the table
    if (f.key === 'risk_per_trade' && defaultRiskPct !== null) return false;
    if (f.key === 'risk_reward_ratio' && defaultRR !== null) return false;
    return true;
  });

  // Subset that are still fully unresolved — blocks import button
  const requiredMissing = requiredNotMapped.filter((f) => !fieldDefaults[f.key]);
  const accountBalance = activeAccount?.account_balance ?? 0;
  const accountCurrency = activeAccount?.currency ?? 'USD';
  const translationCount = Object.keys(translations).length;

  // Whether defaults are actually needed (fields not mapped from CSV)
  const defaultsRequired =
    !matches.some((m) => m.dbField === 'risk_per_trade') ||
    !matches.some((m) => m.dbField === 'risk_reward_ratio');

  // ── Table groupings ───────────────────────────────────────────────────────
  const requiredMatched    = matches.filter((m) => m.required && !!m.dbField);
  const otherMatches       = matches.filter((m) => !(m.required && m.dbField));
  const availableForPicker = matches.filter((m) => !m.dbField);

  const renderMatchRow = (m: ColumnMatch) => (
    <tr
      key={m.csvHeader}
      className="bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-700/40"
    >
      {/* CSV header */}
      <td className="px-3 py-2 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[140px]">
        <span className="truncate block" title={m.csvHeader}>{m.csvHeader}</span>
        <div className="flex items-center gap-1 mt-0.5">
          {m.required && m.dbField && (
            <span className="text-[9px] text-orange-500">req</span>
          )}
          {translations[m.csvHeader] && m.dbField && (
            <span
              title={`AI translated "${m.csvHeader}" → "${translations[m.csvHeader]}"`}
              className="inline-block rounded bg-purple-100 dark:bg-purple-900/40 px-1 text-[9px] text-purple-600 dark:text-purple-300"
            >
              🌐 {translations[m.csvHeader]}
            </span>
          )}
        </div>
      </td>
      {/* Sample values */}
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-0.5 max-w-[150px]">
          {(columnSamples[m.csvHeader] ?? []).slice(0, 3).map((v) => (
            <span
              key={v}
              title={v}
              className="rounded bg-slate-100 dark:bg-slate-700/60 px-1 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[80px]"
            >
              {v}
            </span>
          ))}
        </div>
      </td>
      {/* DB field dropdown */}
      <td className="px-3 py-2">
        <select
          value={m.dbField ?? ''}
          onChange={(e) => updateMatch(m.csvHeader, e.target.value || null)}
          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">— Ignore —</option>
          <optgroup label="Required">
            {DB_SCHEMA.filter((f) => f.required).map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </optgroup>
          <optgroup label="Optional">
            {DB_SCHEMA.filter((f) => !f.required).map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </optgroup>
        </select>
      </td>
      {/* Score badge */}
      <td className="px-3 py-2 text-center">
        {m.dbField ? (
          <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${scoreBadge(m.score)}`}>
            {m.score}%
          </span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
        )}
      </td>
    </tr>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <SheetContent
          side="right"
          hideClose
          className="sm:max-w-2xl w-full flex flex-col overflow-hidden p-0 border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-l-2xl"
        >
          {/* Gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-l-2xl">
            <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          </div>
          <div className="absolute -top-px left-0 right-0 h-0.5 rounded-tl-2xl opacity-60" style={{ background: 'linear-gradient(to right, transparent, var(--tc-primary), transparent)' }} />

          <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">

            {/* ── Header ── */}
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 shrink-0">
              <div className="absolute right-4 top-4 z-10">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl cursor-pointer border border-slate-200/80 bg-slate-100/60 dark:border-slate-600/80 dark:bg-slate-800/60 p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/80 dark:hover:text-slate-100 dark:hover:bg-slate-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-transparent"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SheetTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Import Trades
              </SheetTitle>
              <SheetDescription className="text-slate-500 dark:text-slate-400">
                {step === 'upload' && 'Upload a CSV — columns are matched automatically using fuzzy matching.'}
                {step === 'map' && 'Review the column mapping, then import.'}
                {step === 'importing' && 'Importing your trades…'}
                {step === 'done' && 'Import complete.'}
              </SheetDescription>

              {/* Step indicator */}
              <div className="mt-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  {(['upload', 'map', 'done'] as const).map((s, i) => {
                    const stepOrder: Record<Step, number> = { upload: 0, map: 1, importing: 2, done: 2 };
                    const currentOrder = stepOrder[step];
                    const isActive = currentOrder === i;
                    const isDone = currentOrder > i;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 ${
                          isDone ? 'bg-emerald-600/90 dark:bg-emerald-500/90 text-white'
                          : isActive ? 'bg-slate-600 dark:bg-slate-500 text-white border border-slate-700/30 dark:border-slate-400/30'
                          : 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border border-slate-300/50 dark:border-slate-600/50'
                        }`}>
                          {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                        </div>
                        <span className={`text-xs font-medium ${isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                          {['Upload', 'Map Columns', 'Done'][i]}
                        </span>
                        {i < 2 && <div className="w-4 h-px bg-slate-300 dark:bg-slate-600/70" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </SheetHeader>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ── Step: Upload ── */}
              {step === 'upload' && (
                <div className="flex flex-col gap-4">
                  {/* How it works */}
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/60">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tips for a smooth import</p>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">1.</span> We match your columns automatically. Optionally, for better matching you can replace your CSV headers with our required names (e.g. Trade Date, Market / Symbol, Direction, Trade Outcome, Risk Per Trade %, Risk/Reward Ratio).
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">2.</span> If you still have issues or something is unclear, <a href="mailto:support@tradingtracker.app" className="text-tc-primary hover:underline font-medium">contact us</a>.
                      </p>
                    </div>
                  </div>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    data-dragging={isDragging}
                    className="import-drop-zone relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-200"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(to bottom right, color-mix(in srgb, var(--tc-primary) 25%, transparent), color-mix(in srgb, var(--tc-accent) 25%, transparent))' }}
                    >
                      <svg className="w-6 h-6 text-tc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Drop your CSV here or <span className="text-tc-primary underline">click to browse</span>
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Any CSV file — columns are matched automatically
                      </p>
                    </div>
                  </div>

                  {errorMessage && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                      {errorMessage}
                    </p>
                  )}
                </div>
              )}

              {/* ── Step: Map Columns ── */}
              {step === 'map' && (
                <div className="flex flex-col gap-4">

                  {/* File info bar */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={fileName}>{fileName}</span>
                    <span>·</span>
                    <span>{matches.length} columns</span>
                    <span>·</span>
                    <span>{mappedCount} matched</span>
                    {translating && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Translating…
                        </span>
                      </>
                    )}
                    {!translating && translationCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-purple-600 dark:text-purple-400">
                          {translationCount} translated by AI
                        </span>
                      </>
                    )}
                    {translatingValues && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Translating values…
                        </span>
                      </>
                    )}
                  </div>

                  {/* Value-based matcher suggestions (e.g. combined date/time column) */}
                  {suggestions.length > 0 && (
                    <div className="rounded-lg border border-sky-300/80 bg-sky-50 dark:border-sky-700/50 dark:bg-sky-950/30 px-3 py-2.5 text-xs flex flex-col gap-1">
                      <span className="font-semibold text-sky-800 dark:text-sky-300">Column hints</span>
                      {suggestions.map((s, i) => (
                        <p key={i} className="text-sky-700 dark:text-sky-400">
                          <span className="font-mono bg-sky-100 dark:bg-sky-900/50 px-1 rounded">{s.csvColumn}</span>
                          {' — '}{s.reason}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Column mapping table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <th className="px-3 py-2.5">CSV Column</th>
                          <th className="px-3 py-2.5">Samples</th>
                          <th className="px-3 py-2.5">DB Field</th>
                          <th className="px-3 py-2.5 text-center">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">

                        {/* ── Section 1: Required fields — matched ── */}
                        {requiredMatched.length > 0 && (
                          <>
                            <tr className="">
                              <td colSpan={4} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                Required — Matched
                              </td>
                            </tr>
                            {requiredMatched.map(renderMatchRow)}
                          </>
                        )}

                        {/* ── Section 2: Required fields — not yet matched ── */}
                        {requiredNotMapped.length > 0 && (
                          <>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                              <td colSpan={4} className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${requiredMissing.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                Required — Not Matched
                              </td>
                            </tr>
                            {requiredNotMapped.map((field) => {
                              const hasDefault = !!fieldDefaults[field.key];
                              return (
                                <tr key={`req-missing-${field.key}`} className="bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-700/40">
                                  {/* Col 1 — CSV column picker (mirrors matched-row layout) */}
                                  <td className="px-3 py-2 max-w-[140px]">
                                    <select
                                      defaultValue=""
                                      onChange={(e) => { if (e.target.value) updateMatch(e.target.value, field.key); }}
                                      className="w-full rounded-md border border-amber-300/80 dark:border-amber-700/60 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                                    >
                                      <option value="">— Pick a column —</option>
                                      {availableForPicker.map((m) => (
                                        <option key={m.csvHeader} value={m.csvHeader}>{m.csvHeader}</option>
                                      ))}
                                    </select>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="text-[9px] text-amber-500">req</span>
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500">· not found</span>
                                    </div>
                                  </td>

                                  {/* Col 2 — Samples / default indicator / More options */}
                                  <td className="px-3 py-2">
                                    {hasDefault ? (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className="rounded bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                                          default: {fieldDefaults[field.key]}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setMoreOptionsField(field)}
                                          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
                                        >
                                          change
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setMoreOptionsField(field)}
                                        className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                                      >
                                        <MoreHorizontal className="h-3 w-3" />
                                        More options
                                      </button>
                                    )}
                                  </td>

                                  {/* Col 3 — Locked DB field label */}
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      <span className={`font-medium text-xs ${hasDefault ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                                        {field.label}
                                      </span>
                                      <span className="text-[9px] font-semibold text-amber-500 uppercase">req</span>
                                    </div>
                                  </td>

                                  {/* Col 4 — Status */}
                                  <td className="px-3 py-2 text-center">
                                    {hasDefault ? (
                                      <span className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        default
                                      </span>
                                    ) : (
                                      <span className="text-amber-400 dark:text-amber-600 text-xs">?</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* ── Section 3: All other columns ── */}
                        {otherMatches.length > 0 && (
                          <>
                            {(requiredMatched.length > 0 || requiredMissing.length > 0) && (
                              <tr className="">
                                <td colSpan={4} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Other Columns
                                </td>
                              </tr>
                            )}
                            {otherMatches.map(renderMatchRow)}
                          </>
                        )}

                      </tbody>
                    </table>
                  </div>

                  {/* Default Risk % and R:R */}
                  <div
                    ref={defaultValuesCardRef}
                    className={`rounded-xl border overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 transition-colors ${
                      defaultValuesCardError
                        ? 'border-red-500 dark:border-red-500 ring-2 ring-red-500/30 dark:ring-red-500/30'
                        : 'border-slate-200/80 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Default values</p>
                        {defaultsRequired
                          ? <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">required</span>
                          : <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">optional</span>
                        }
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Used for rows missing Risk % or R:R in the CSV.</p>
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-3">
                      {/* Risk % */}
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Risk %</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[0.25, 0.5, 0.75, 1].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => { setDefaultRiskPct(preset); setCustomRiskInput(''); }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                defaultRiskPct === preset && customRiskInput === ''
                                  ? 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              {preset}%
                            </button>
                          ))}
                          <div className="flex items-center gap-1 ml-1">
                            <span className="text-[10px] text-slate-400">custom:</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={customRiskInput}
                                    onChange={(e) => {
                                      setCustomRiskInput(e.target.value);
                                      const p = parseFloat(e.target.value);
                                      setDefaultRiskPct(!isNaN(p) && p > 0 ? p : null);
                                    }}
                                    className="h-7 w-20 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/50 pr-5"
                                  />
                                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">%</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[200px]">
                                Use your average risk for more accurate PnL computation.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>

                      {/* R:R */}
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">R:R ratio</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[1, 1.5, 2, 2.5].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => { setDefaultRR(preset); setCustomRRInput(''); }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                defaultRR === preset && customRRInput === ''
                                  ? 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                          <div className="flex items-center gap-1 ml-1">
                            <span className="text-[10px] text-slate-400">custom:</span>
                            <Input
                              type="number"
                              min="0.1"
                              max="100"
                              step="0.1"
                              placeholder="0.00"
                              value={customRRInput}
                              onChange={(e) => {
                                setCustomRRInput(e.target.value);
                                const p = parseFloat(e.target.value);
                                setDefaultRR(!isNaN(p) && p > 0 ? p : null);
                              }}
                              className="h-7 w-20 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {errorMessage && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                      {errorMessage}
                    </p>
                  )}
                </div>
              )}

              {/* ── Step: Importing ── */}
              {step === 'importing' && (
                <div className="flex flex-col items-center justify-center gap-6 py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-violet-600 transition-all duration-300 rounded-full"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2">{importProgress}%</p>
                  </div>
                </div>
              )}

              {/* ── Step: Done ── */}
              {step === 'done' && importResult && (
                <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${importResult.inserted > 0 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                    {importResult.inserted > 0 ? (
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>

                  <div>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {importResult.inserted > 0
                        ? `${importResult.inserted} trade${importResult.inserted !== 1 ? 's' : ''} imported`
                        : 'No trades imported'}
                    </p>
                    {importResult.failed.length > 0 && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                        {importResult.failed.length} row{importResult.failed.length !== 1 ? 's' : ''} failed
                      </p>
                    )}
                  </div>

                  {importResult.failed.length > 0 && (
                    <div className="w-full border border-amber-200/60 dark:border-amber-800/40 rounded-xl overflow-hidden text-left">
                      <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                        Failed rows
                      </div>
                      <div className="max-h-40 overflow-y-auto divide-y divide-amber-100 dark:divide-amber-900/30">
                        {importResult.failed.map((f, i) => (
                          <div key={i} className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-semibold text-amber-500">Row {f.row}</span>
                            <span className="text-slate-400 mx-1">·</span>
                            {f.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 shrink-0 flex justify-between items-center">
              {step === 'upload' && (
                <Button variant="outline" onClick={handleClose} className={cancelButtonClass}>
                  Cancel
                </Button>
              )}

              {step === 'map' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCsvText('');
                      setFileName('');
                      setMatches([]);
                      setColumnSamples({});
                      setTranslations({});
                      setTranslating(false);
                      setAiValueNorms({});
                      setTranslatingValues(false);
                      setErrorMessage('');
                      setDefaultValuesCardError(false);
                      setStep('upload');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className={cancelButtonClass}
                  >
                    ← Change file
                  </Button>
                  {/* ── Debug: why is the button disabled? ── */}
                  {(translating || translatingValues || requiredMissing.length > 0 || !activeAccount) && (
                    <div className="flex flex-col gap-0.5 text-[10px] text-right text-red-500 dark:text-red-400">
                      {translating && <span>⏳ translating headers…</span>}
                      {translatingValues && <span>⏳ translating values…</span>}
                      {!activeAccount && <span>❌ no active account</span>}
                      {requiredMissing.map((f) => (
                        <span key={f.key}>❌ required field not resolved: <b>{f.label}</b></span>
                      ))}
                    </div>
                  )}
                  <Button
                    onClick={handleImport}
                    disabled={translating || translatingValues || requiredMissing.length > 0 || !activeAccount}
                    className="cursor-pointer rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold border-0 shadow-md shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {translating || translatingValues ? 'Translating…' : `Import ${parsedRowCount} trade${parsedRowCount !== 1 ? 's' : ''}`}
                  </Button>
                </>
              )}

              {step === 'importing' && (
                <Button variant="outline" onClick={handleClose} className={cancelButtonClass} disabled>
                  Cancel
                </Button>
              )}

              {step === 'done' && (
                <Button
                  onClick={handleClose}
                  className="cursor-pointer ml-auto rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold border-0 shadow-md shadow-purple-500/30"
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── More Options Modal ─────────────────────────────────────────────── */}
      {moreOptionsField && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setMoreOptionsField(null); }}
        >
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-0.5">Required field</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {moreOptionsField.label}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{moreOptionsField.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOptionsField(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/60 p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">

              {/* ── Set a default value ── */}
              {(moreOptionsField.key === 'risk_per_trade' || moreOptionsField.key === 'risk_reward_ratio') ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Set a default value</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Use the <span className="font-medium">Default values</span> section below the mapping table — it already handles {moreOptionsField.label}.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Set a default value</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                    Applied to every row that doesn&apos;t have this column in the CSV.
                  </p>
                  {moreOptionsField.key === 'direction' ? (
                    <select
                      value={fieldDefaults[moreOptionsField.key] ?? ''}
                      onChange={(e) => setFieldDefaults((p) => ({ ...p, [moreOptionsField.key]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— No default —</option>
                      <option value="Long">Long</option>
                      <option value="Short">Short</option>
                    </select>
                  ) : moreOptionsField.key === 'trade_outcome' ? (
                    <select
                      value={fieldDefaults[moreOptionsField.key] ?? ''}
                      onChange={(e) => setFieldDefaults((p) => ({ ...p, [moreOptionsField.key]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— No default —</option>
                      <option value="Win">Win</option>
                      <option value="Lose">Lose</option>
                      <option value="Break-Even">Break-Even</option>
                    </select>
                  ) : (
                    <input
                      type={moreOptionsField.valueType === 'date' ? 'date' : moreOptionsField.valueType === 'time' ? 'time' : 'text'}
                      value={fieldDefaults[moreOptionsField.key] ?? ''}
                      onChange={(e) => setFieldDefaults((p) => ({ ...p, [moreOptionsField.key]: e.target.value }))}
                      placeholder={moreOptionsField.valueType === 'date' ? 'YYYY-MM-DD' : moreOptionsField.valueType === 'time' ? 'HH:MM' : `e.g. EURUSD`}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                  {fieldDefaults[moreOptionsField.key] && (
                    <button
                      type="button"
                      onClick={() => setFieldDefaults((p) => { const n = { ...p }; delete n[moreOptionsField.key]; return n; })}
                      className="mt-1.5 text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                    >
                      ✕ Clear default
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              </div>

              {/* ── Option 1: Add it yourself ── */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Add it to your CSV</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Open your file, add a <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{moreOptionsField.label}</span> column with values for each row, then re-upload.
                  </p>
                </div>
              </div>

              {/* ── Option 2: Let AI find it ── */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                  <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Let AI find it</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-2">
                    AI will scan all your CSV columns and values to find a match for <span className="font-medium">{moreOptionsField.label}</span>.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleAiMatch(moreOptionsField)}
                    disabled={aiMatchingField === moreOptionsField.key}
                    className="h-7 px-3 text-xs rounded-lg cursor-pointer bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white border-0 shadow-sm shadow-purple-500/30 disabled:opacity-50"
                  >
                    {aiMatchingField === moreOptionsField.key ? (
                      <>
                        <svg className="h-3 w-3 mr-1.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Scanning…
                      </>
                    ) : 'Run AI scan'}
                  </Button>
                </div>
              </div>

              {/* ── Option 3: Get help ── */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Get help</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Can&apos;t figure it out? Contact me and I&apos;ll help you set up your import.
                  </p>
                  <a
                    href="mailto:support@tradingtracker.app"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    support@tradingtracker.app →
                  </a>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMoreOptionsField(null)}
                className="h-7 px-3 text-xs rounded-lg cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
