'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Check } from 'lucide-react';
import { parseCsvTrades, extractCsvHeaders } from '@/utils/tradeImportParser';
import { importTrades } from '@/lib/server/trades';
import type { Database } from '@/types/supabase';

type AccountRow = Database['public']['Tables']['account_settings']['Row'];

type Step = 'upload' | 'matching' | 'mapping' | 'preview' | 'importing' | 'done';

const TRADE_FIELDS: { value: string; label: string }[] = [
  { value: 'trade_date', label: 'Trade Date' },
  { value: 'trade_time', label: 'Trade Time' },
  { value: 'day_of_week', label: 'Day of Week' },
  { value: 'market', label: 'Market' },
  { value: 'direction', label: 'Direction' },
  { value: 'setup_type', label: 'Setup' },
  { value: 'trade_outcome', label: 'Outcome' },
  { value: 'risk_per_trade', label: 'Risk %' },
  { value: 'risk_reward_ratio', label: 'RR Ratio' },
  { value: 'risk_reward_ratio_long', label: 'RR Ratio Long' },
  { value: 'sl_size', label: 'SL Size' },
  { value: 'break_even', label: 'Break Even' },
  { value: 'reentry', label: 'Re-Entry' },
  { value: 'news_related', label: 'News Related' },
  { value: 'local_high_low', label: 'Local High/Low' },
  { value: 'partials_taken', label: 'Partials Taken' },
  { value: 'executed', label: 'Executed' },
  { value: 'launch_hour', label: 'Launch Hour' },
  { value: 'mss', label: 'MSS' },
  { value: 'liquidity', label: 'Liquidity' },
  { value: 'trade_link', label: 'Trade Link' },
  { value: 'liquidity_taken', label: 'Liquidity Taken' },
  { value: 'evaluation', label: 'Evaluation' },
  { value: 'notes', label: 'Notes' },
  { value: 'calculated_profit', label: 'Calculated Profit' },
  { value: 'pnl_percentage', label: 'P/L %' },
  { value: 'displacement_size', label: 'Displacement Size' },
  { value: 'fvg_size', label: 'FVG Size' },
];

const cancelButtonClass =
  'cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200';

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

  const [step, setStep] = useState<Step>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [pendingFileName, setPendingFileName] = useState('');
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [defaultRiskPct, setDefaultRiskPct] = useState<number | null>(null);
  const [customRiskInput, setCustomRiskInput] = useState('');
  const [defaultRR, setDefaultRR] = useState<number | null>(null);
  const [customRRInput, setCustomRRInput] = useState('');

  const [parseResult, setParseResult] = useState<{ rows: ReturnType<typeof parseCsvTrades>['rows']; errors: ReturnType<typeof parseCsvTrades>['errors'] } | null>(null);
  const [importResult, setImportResult] = useState<{ inserted: number; failed: { row: number; reason: string }[] } | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  function resetState() {
    setStep('upload');
    setIsDragging(false);
    setCsvText('');
    setCsvHeaders([]);
    setPendingFileName('');
    setMapping({});
    setDefaultRiskPct(null);
    setCustomRiskInput('');
    setDefaultRR(null);
    setCustomRRInput('');
    setParseResult(null);
    setImportResult(null);
    setImportProgress(0);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Please upload a .csv file.');
      return;
    }
    setErrorMessage('');

    const text = await file.text();
    const headers = extractCsvHeaders(text);
    if (headers.length === 0) {
      setErrorMessage('Could not read CSV headers. Make sure the file is valid.');
      return;
    }

    setCsvText(text);
    setCsvHeaders(headers);
    setPendingFileName(file.name);
    // Stay on 'upload' — user must click Analyze to trigger the AI request
  }

  async function handleProceedToMatching() {
    setStep('matching');
    try {
      const res = await fetch('/api/match-trade-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: csvHeaders }),
      });
      const { mapping: aiMapping } = await res.json() as { mapping: Record<string, string | null> };

      // Deduplicate: each DB field can appear at most once — keep the first occurrence
      const seenFields = new Set<string>();
      const deduped: Record<string, string | null> = {};
      for (const [header, field] of Object.entries(aiMapping ?? {})) {
        if (!field || !seenFields.has(field)) {
          deduped[header] = field;
          if (field) seenFields.add(field);
        } else {
          deduped[header] = null;
        }
      }

      // Fallbacks: when AI didn't map a required/common field, map from known header aliases (flexible import)
      const norm = (h: string) => h.trim().toLowerCase().replace(/\s+/g, ' ');
      const fallbacks: { field: string; pattern: RegExp }[] = [
        { field: 'direction', pattern: /^(order[- ]?type|side|type|action|buy\/sell|direction)$/i },
        { field: 'risk_reward_ratio', pattern: /^(rr|r:r|risk[- ]?reward|risk[- ]?reward[- ]?ratio|reward[- ]?ratio|rr[- ]?ratio)$/i },
        { field: 'trade_date', pattern: /^(date|open[- ]?date|trade[- ]?date|entry[- ]?date|close[- ]?date|time[- ]?open)$/i },
        { field: 'trade_outcome', pattern: /^(outcome|result|win\/loss|p\/l|profit\/loss|win[- ]?loss|status|trade[- ]?result)$/i },
        { field: 'trade_time', pattern: /^(time|open[- ]?time|entry[- ]?time|trade[- ]?time|hour)$/i },
        { field: 'market', pattern: /^(market|symbol|instrument|pair|asset|ticker|product)$/i },
        { field: 'risk_per_trade', pattern: /^(risk|risk\s*%|risk[- ]?%|risk[- ]?percent)$/i },
      ];
      for (const { field, pattern } of fallbacks) {
        if (seenFields.has(field)) continue;
        const header = csvHeaders.find((h) => pattern.test(norm(h)));
        if (header) {
          deduped[header] = field;
          seenFields.add(field);
        }
      }
      setMapping(deduped);
    } catch {
      setMapping({});
    }
    setStep('mapping');
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function updateMapping(csvHeader: string, tradeField: string | null) {
    setMapping((prev) => {
      // If the tradeField is already mapped to another header, unmap it
      const next = { ...prev };
      if (tradeField) {
        Object.keys(next).forEach((h) => {
          if (h !== csvHeader && next[h] === tradeField) {
            next[h] = null;
          }
        });
      }
      next[csvHeader] = tradeField;
      return next;
    });
  }

  function getMappedTradeFields(): Set<string> {
    return new Set(Object.values(mapping).filter(Boolean) as string[]);
  }

  function handleProceedToPreview() {
    const confirmedMapping = Object.fromEntries(
      Object.entries(mapping).filter(([, v]) => v !== null)
    ) as Record<string, string>;
    const result = parseCsvTrades(csvText, confirmedMapping, {
      ...(defaultRiskPct !== null ? { risk_per_trade: defaultRiskPct } : {}),
      ...(defaultRR !== null ? { risk_reward_ratio: defaultRR } : {}),
      ...(activeAccount?.account_balance ? { account_balance: activeAccount.account_balance } : {}),
    });
    setParseResult(result);
    setStep('preview');
  }

  async function handleImport() {
    if (!parseResult || !activeAccount) return;

    if (parseResult.rows.length === 0) {
      setErrorMessage('No valid rows to import.');
      return;
    }

    setStep('importing');
    setImportProgress(0);

    try {
      // Simulate progress while the server action runs (we don't have streaming progress)
      const progressInterval = setInterval(() => {
        setImportProgress((p) => Math.min(p + 5, 90));
      }, 200);

      const result = await importTrades({
        mode,
        account_id: activeAccount.id,
        strategy_id: strategyId || null,
        trades: parseResult.rows,
      });

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
      setStep('done');

      if (result.inserted > 0) {
        queryClient.invalidateQueries({
          predicate: (q) => (q.queryKey?.[0] as string) === 'allTrades',
        });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Import failed. Please try again.');
      setStep('preview');
    }
  }

  const canProceedToPreview = true;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent
        side="right"
        hideClose
        className="sm:max-w-2xl w-full flex flex-col overflow-hidden p-0 border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-l-2xl"
      >
        {/* Theme-aware gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-l-2xl">
          <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        </div>
        <div className="absolute -top-px left-0 right-0 h-0.5 rounded-tl-2xl opacity-60" style={{ background: 'linear-gradient(to right, transparent, var(--tc-primary), transparent)' }} />

        <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Header */}
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
            {step === 'upload' && 'Upload a CSV file to import your trades.'}
            {step === 'matching' && 'Analysing your CSV columns with AI…'}
            {step === 'mapping' && 'Review and confirm how your CSV columns map to trade fields.'}
            {step === 'preview' && 'Preview parsed trades and check for validation errors.'}
            {step === 'importing' && 'Importing your trades…'}
            {step === 'done' && 'Import complete.'}
          </SheetDescription>

          {/* Step indicator — same card style as Risk % / table */}
          <div className="mt-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3">
            <div className="flex items-center gap-2">
              {(['upload', 'mapping', 'preview', 'importing'] as const).map((s, i) => {
                const stepOrder = { upload: 0, matching: 0, mapping: 1, preview: 2, importing: 3, done: 3 };
                const currentOrder = stepOrder[step];
                const thisOrder = i;
                const isActive = currentOrder === thisOrder;
                const isDone = currentOrder > thisOrder;
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
                      {['Upload', 'Map Columns', 'Preview', 'Import'][i]}
                    </span>
                    {i < 3 && <div className="w-4 h-px bg-slate-300 dark:bg-slate-600/70" />}
                  </div>
                );
              })}
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step: Upload ── */}
          {(step === 'upload' || step === 'matching') && (
            <div className="flex flex-col gap-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => step === 'upload' && fileInputRef.current?.click()}
                data-dragging={isDragging}
                className={`import-drop-zone relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-200 ${
                  step === 'matching' ? 'pointer-events-none opacity-70' : ''
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />

                {step === 'matching' ? (
                  <>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse"
                      style={{ background: 'linear-gradient(to bottom right, var(--tc-primary), var(--tc-accent))' }}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">AI is matching your columns…</p>
                  </>
                ) : csvHeaders.length > 0 ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{pendingFileName}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {csvHeaders.length} columns detected · <span className="text-tc-primary underline">click to change file</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
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
                        Use any CSV — AI will map columns automatically
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Expected CSV format — required cols (conditional on strategy) */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/60">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    CSV format
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Column names do not need to match exactly — AI will map your CSV columns to trade fields.
                  </p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    You can set default Risk % and Risk:Reward in the next step; they will be used to calculate P&L and profit when not in the CSV.
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

          {/* ── Step: Mapping ── */}
          {step === 'mapping' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                AI suggested the mappings below. Use the dropdowns to fix any mistakes.
              </p>

              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
                <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/60">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Set default Risk % (optional)
                  </p>
                </div>
                <div className="px-4 py-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {[0.25, 0.5, 0.75, 1].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => { setDefaultRiskPct(preset); setCustomRiskInput(''); }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                          defaultRiskPct === preset && customRiskInput === ''
                            ? 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">or custom:</span>
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
                                const parsed = parseFloat(e.target.value);
                                setDefaultRiskPct(!isNaN(parsed) && parsed > 0 ? parsed : null);
                              }}
                              className="h-8 w-24 text-sm rounded-lg border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/50 pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[220px]">
                          Use the average risk across your trades for more accurate import results.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  {defaultRiskPct !== null && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      All imported trades will use <span className="font-semibold text-slate-800 dark:text-slate-200">{defaultRiskPct}%</span> risk.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
                <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/60">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Set default Risk:Reward ratio (optional)
                  </p>
                </div>
                <div className="px-4 py-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {[1, 1.5, 2, 2.5].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => { setDefaultRR(preset); setCustomRRInput(''); }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                          defaultRR === preset && customRRInput === ''
                            ? 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">or custom:</span>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          placeholder="0.00"
                          value={customRRInput}
                          onChange={(e) => {
                            setCustomRRInput(e.target.value);
                            const parsed = parseFloat(e.target.value);
                            setDefaultRR(!isNaN(parsed) && parsed > 0 ? parsed : null);
                          }}
                          className="h-8 w-24 text-sm rounded-lg border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/50 pr-6"
                        />
                      </div>
                    </div>
                  </div>
                  {defaultRR !== null && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      All imported trades will use <span className="font-semibold text-slate-800 dark:text-slate-200">{defaultRR}</span> risk:reward ratio.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-r border-slate-200 dark:border-slate-700">CSV Column</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Maps to Trade Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvHeaders.filter((header) => mapping[header] != null).map((header, idx) => {
                      const currentValue = mapping[header] ?? null;
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 border-b border-r border-slate-200 dark:border-slate-700">
                            {header}
                          </td>
                          <td className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                            <Select
                              value={currentValue ?? '__skip__'}
                              onValueChange={(v) => updateMapping(header, v === '__skip__' ? null : v)}
                            >
                              <SelectTrigger className="h-9 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__skip__">
                                  <span className="text-slate-400">— skip —</span>
                                </SelectItem>
                                {TRADE_FIELDS.map((f) => {
                                  const alreadyUsed = getMappedTradeFields().has(f.value) && mapping[header] !== f.value;
                                  return (
                                    <SelectItem key={f.value} value={f.value} disabled={alreadyUsed}>
                                      <span className={alreadyUsed ? 'text-slate-400' : ''}>
                                        {f.label}
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Step: Preview ── */}
          {step === 'preview' && parseResult && (
            <div className="flex flex-col gap-5">
              {/* Summary cards */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3.5 text-center">
                  <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{parseResult.rows.length}</p>
                  <p className="text-xs font-medium mt-0.5 text-slate-600 dark:text-slate-400">Rows ready</p>
                </div>
                {parseResult.errors.length > 0 ? (
                  <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3.5 text-center">
                    <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">{parseResult.errors.length}</p>
                    <p className="text-xs font-medium mt-0.5 text-slate-600 dark:text-slate-400">Rows with errors</p>
                  </div>
                ) : (
                  <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3.5 text-center">
                    <p className="text-2xl font-bold tabular-nums text-slate-400 dark:text-slate-500">0</p>
                    <p className="text-xs font-medium mt-0.5 text-slate-500 dark:text-slate-400">Rows with errors</p>
                  </div>
                )}
              </div>

              {/* Validation errors */}
              {parseResult.errors.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 border-b border-slate-200 dark:border-slate-700">
                      Validation errors
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
                      {parseResult.errors.map((err, i) => (
                        <div key={i} className="px-4 py-2.5 text-sm">
                          <span className="font-semibold text-red-600 dark:text-red-400">Row {err.rowIndex}</span>
                          <span className="text-slate-400 dark:text-slate-500 mx-1.5">·</span>
                          <span className="text-slate-600 dark:text-slate-400">{err.field}</span>
                          <span className="text-slate-400 dark:text-slate-500 mx-1.5">·</span>
                          <span className="text-slate-700 dark:text-slate-300">{err.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
              )}

              {/* Preview table */}
              {parseResult.rows.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Preview (first 5 rows)</p>
                  <div className="rounded-xl overflow-x-auto border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-700">Date</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-700">Market</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-700">Direction</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-700">Outcome</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-700">Risk %</th>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">RR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.rows.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-slate-800 dark:text-slate-200 border-b border-r border-slate-200 dark:border-slate-700">{row.trade_date}</td>
                            <td className="px-3 py-2 text-slate-800 dark:text-slate-200 border-b border-r border-slate-200 dark:border-slate-700">{row.market}</td>
                            <td className="px-3 py-2 text-slate-800 dark:text-slate-200 border-b border-r border-slate-200 dark:border-slate-700">{row.direction}</td>
                            <td className="px-3 py-2 border-b border-r border-slate-200 dark:border-slate-700 pointer-events-none">
                              <Badge className={`text-xs shadow-none border-none ${row.trade_outcome === 'Win' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {row.trade_outcome}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-slate-800 dark:text-slate-200 border-b border-r border-slate-200 dark:border-slate-700">{row.risk_per_trade}%</td>
                            <td className="px-3 py-2 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">{row.risk_reward_ratio}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {errorMessage && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
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
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-3">
                  Importing {parseResult?.rows.length} trades…
                </p>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 shrink-0 flex justify-between items-center">
          {step === 'upload' ? (
            <>
              <Button variant="outline" onClick={handleClose} className={cancelButtonClass}>
                Cancel
              </Button>
              {csvHeaders.length > 0 && (
                <Button
                  onClick={handleProceedToMatching}
                  className="cursor-pointer rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold border-0 shadow-md shadow-purple-500/30"
                >
                  Analyze with AI →
                </Button>
              )}
            </>
          ) : step === 'matching' ? (
            <Button variant="outline" onClick={handleClose} className={cancelButtonClass} disabled>
              Cancel
            </Button>
          ) : step === 'mapping' ? (
            <>
              <Button
                variant="outline"
                onClick={() => { setStep('upload'); setCsvText(''); setCsvHeaders([]); setMapping({}); }}
                className={cancelButtonClass}
              >
                ← Re-upload
              </Button>
              <Button
                onClick={handleProceedToPreview}
                disabled={!canProceedToPreview}
                className="cursor-pointer rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold border-0 shadow-md shadow-purple-500/30 disabled:opacity-50"
              >
                Preview →
              </Button>
            </>
          ) : step === 'preview' ? (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')} className={cancelButtonClass}>
                ← Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={parseResult?.rows.length === 0}
                className="cursor-pointer rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold border-0 shadow-md shadow-purple-500/30 disabled:opacity-50"
              >
                Import {parseResult?.rows.length ?? 0} Trades
              </Button>
            </>
          ) : step === 'done' ? (
            <Button
              onClick={handleClose}
              className="cursor-pointer ml-auto rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold border-0 shadow-md shadow-purple-500/30"
            >
              Done
            </Button>
          ) : null}
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
