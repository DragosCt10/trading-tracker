'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Check, Table2 } from 'lucide-react';
import { matchHeaders, toFieldMapping, DB_SCHEMA, type ColumnMatch } from '@/lib/columnMatcher';
import { buildAutoNormalizations } from '@/lib/tradeNormalizers';
import {
  extractColumnSamples,
  parseCsvTradesWithNorm,
  parseCsvRaw,
  type RawCsvParseResult,
} from '@/utils/tradeImportParser';
import { calculateTradePnl } from '@/utils/helpers/tradePnlCalculator';
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

  // ── Import defaults ─────────────────────────────────────────────────────
  const [defaultRiskPct, setDefaultRiskPct] = useState<number | null>(null);
  const [customRiskInput, setCustomRiskInput] = useState('');
  const [defaultRR, setDefaultRR] = useState<number | null>(null);
  const [customRRInput, setCustomRRInput] = useState('');

  // ── CSV row count ───────────────────────────────────────────────────────
  const [csvRowCount, setCsvRowCount] = useState(0);

  // ── Import result ───────────────────────────────────────────────────────
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    failed: { row: number; reason: string }[];
  } | null>(null);

  // ── Raw CSV preview dialog ──────────────────────────────────────────────
  const [rawParseOpen, setRawParseOpen] = useState(false);
  const [rawParseData, setRawParseData] = useState<RawCsvParseResult | null>(null);

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
    setCsvRowCount(0);
    setDefaultRiskPct(null);
    setCustomRiskInput('');
    setDefaultRR(null);
    setCustomRRInput('');
    setImportProgress(0);
    setImportResult(null);
    setRawParseOpen(false);
    setRawParseData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleShowParsedCsv() {
    if (!csvText.trim()) return;
    setRawParseData(parseCsvRaw(csvText));
    setRawParseOpen(true);
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
    setCsvRowCount(parsed.data.length);

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

    // Step 1: local fuzzy match — instant
    const initialMatches = matchHeaders(headers);
    setMatches(initialMatches);
    setStep('map');

    // Step 2: background AI translation for unmatched headers only.
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

      // Re-run matchHeaders on the full list with translations applied.
      // Keeps greedy assignment correct across all columns.
      const translatedHeaders = headers.map((h) => meaningful[h] ?? h);
      const finalMatches = matchHeaders(translatedHeaders).map((m, i) => ({
        ...m,
        csvHeader: headers[i], // restore original name for display
      }));

      setMatches(finalMatches);
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

    setStep('importing');
    setImportProgress(0);
    setErrorMessage('');

    const progressInterval = setInterval(() => {
      setImportProgress((p) => Math.min(p + 5, 90));
    }, 200);

    try {
      const fieldMapping = toFieldMapping(matches);
      const normalizations = buildAutoNormalizations(fieldMapping, columnSamples);

      const { rows, errors } = parseCsvTradesWithNorm(csvText, fieldMapping, normalizations, {
        ...(defaultRiskPct !== null ? { risk_per_trade: defaultRiskPct } : {}),
        ...(defaultRR !== null ? { risk_reward_ratio: defaultRR } : {}),
      });

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
        return { ...row, pnl_percentage, calculated_profit };
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

  // ── Derived ──────────────────────────────────────────────────────────────
  const mappedCount = matches.filter((m) => m.dbField).length;
  const requiredMissing = DB_SCHEMA.filter(
    (f) => f.required && !matches.some((m) => m.dbField === f.key),
  );
  const accountBalance = activeAccount?.account_balance ?? 0;
  const accountCurrency = activeAccount?.currency ?? 'USD';
  const translationCount = Object.keys(translations).length;

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
                        Supports MT5, MT4, manual journals — any CSV format
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/60">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">How it works</p>
                    </div>
                    <div className="px-4 py-3 space-y-1.5">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Columns are matched locally using fuzzy matching — instant, no AI needed for standard exports.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Foreign-language headers are translated automatically. You can review and adjust every mapping before importing.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        PnL is computed from Risk % and R:R using your account balance — no need to map Profit columns.
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
                    <button
                      type="button"
                      onClick={handleShowParsedCsv}
                      className="ml-auto flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <Table2 className="h-3.5 w-3.5" />
                      Preview raw
                    </button>
                  </div>

                  {/* Required fields warning */}
                  {requiredMissing.length > 0 && (
                    <div className="rounded-lg border border-yellow-300/80 bg-yellow-50 dark:border-yellow-700/50 dark:bg-yellow-950/30 px-3 py-2.5 text-xs">
                      <span className="font-semibold text-yellow-800 dark:text-yellow-300">Missing required: </span>
                      <span className="text-yellow-700 dark:text-yellow-400">{requiredMissing.map((f) => f.label).join(', ')}</span>
                      <p className="mt-1 text-yellow-600 dark:text-yellow-500">Use the dropdowns below to assign them manually.</p>
                    </div>
                  )}

                  {/* Column mapping table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <th className="px-3 py-2.5">CSV Column</th>
                          <th className="px-3 py-2.5">Samples</th>
                          <th className="px-3 py-2.5">DB Field</th>
                          <th className="px-3 py-2.5 text-center">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {matches.map((m) => (
                          <tr
                            key={m.csvHeader}
                            className="bg-white dark:bg-slate-900/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
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
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Default Risk % and R:R */}
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Default values</p>
                        <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">required</span>
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
                      setErrorMessage('');
                      setCsvRowCount(0);
                      setStep('upload');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className={cancelButtonClass}
                  >
                    ← Change file
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={translating || requiredMissing.length > 0 || !activeAccount || defaultRiskPct === null || defaultRR === null}
                    className="cursor-pointer rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold border-0 shadow-md shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {translating ? 'Translating…' : `Import ${csvRowCount} trade${csvRowCount !== 1 ? 's' : ''}`}
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

      {/* Raw CSV preview dialog — same design as NewTradeModal (AlertDialog with orbs, accent, header) */}
      <AlertDialog open={rawParseOpen} onOpenChange={setRawParseOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-2xl p-0 flex flex-col overflow-hidden">
          {/* Gradient orbs background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
            <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          </div>
          {/* Noise texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />
          {/* Top accent line */}
          <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

          {/* Fixed Header — same pattern as NewTradeModal */}
          <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
            <AlertDialogHeader className="space-y-1.5">
              <div className="flex items-center justify-between">
                <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  <div className="p-2 rounded-lg themed-header-icon-box">
                    <Table2 className="h-5 w-5" />
                  </div>
                  <span>Parsed CSV data</span>
                </AlertDialogTitle>
                <button
                  onClick={() => setRawParseOpen(false)}
                  className="cursor-pointer rounded-sm ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                {rawParseData
                  ? `${rawParseData.rowCount} row(s), ${rawParseData.headers.length} column(s). Raw parse — no column mapping applied.`
                  : 'No data.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>

          {/* Scrollable content */}
          {rawParseData && rawParseData.headers.length > 0 && (
            <div className="relative flex-1 min-h-0 overflow-auto px-6 py-5">
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-slate-50/50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">#</th>
                      {rawParseData.headers.map((h, i) => (
                        <th key={i} className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {h || '(empty)'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawParseData.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400 tabular-nums">{rowIdx + 1}</td>
                        {rawParseData.headers.map((header, colIdx) => (
                          <td key={colIdx} className="px-3 py-2 text-slate-800 dark:text-slate-200 max-w-[200px] truncate" title={row[header] ?? ''}>
                            {row[header] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer — same cancel style as main modal */}
          <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 flex-shrink-0 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setRawParseOpen(false)}
              className={cancelButtonClass}
            >
              Close
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
