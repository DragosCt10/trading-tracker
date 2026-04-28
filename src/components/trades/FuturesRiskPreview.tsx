'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';

import {
  getFuturesSpec,
  type FuturesSpec,
  type SpecSource,
} from '@/constants/futuresSpecs';
import type { CustomFuturesSpec } from '@/types/account-settings';

interface FuturesRiskPreviewProps {
  /** Active account balance — used for the % sanity check (warn if risk crosses thresholds). */
  accountBalance: number;
  /** Currency symbol prefix (e.g. "$", "€"). */
  currencySymbol?: string;
  market: string;
  numContracts: number | undefined;
  slSize: number | undefined;
  riskRewardRatio: number | undefined;
  /** Per-trade override $/SL-unit value, used when symbol resolution falls through. */
  dollarPerSlUnitOverride: number | undefined;
  /** User-saved custom specs (tier 2). Sourced from useSettings. */
  customSpecs: CustomFuturesSpec[];
}

/** Sanity threshold (percent of balance) above which a warning banner shows. */
const HIGH_RISK_PCT = 25;
/** Sanity threshold below which a warning banner shows (likely wrong unit / typo). */
const LOW_RISK_PCT = 0.01;

/**
 * Live `$ Risk` preview rendered in the trade form for futures accounts.
 *
 * Mirrors the calculator's resolver and formula so the user sees the dollar amount
 * before saving — the unambiguous source of truth for "did I pick the right unit?".
 *
 * Warning banner triggers when computed risk lands outside [0.01%, 25%] of balance —
 * almost always a wrong unit (e.g. ticks vs points) or stale override value.
 */
export function FuturesRiskPreview({
  accountBalance,
  currencySymbol = '$',
  market,
  numContracts,
  slSize,
  riskRewardRatio,
  dollarPerSlUnitOverride,
  customSpecs,
}: FuturesRiskPreviewProps) {
  const contracts = Number(numContracts) || 0;
  const sl = Number(slSize) || 0;
  const rr = Number(riskRewardRatio) || 0;
  const overrideValue = Number(dollarPerSlUnitOverride) || 0;

  const resolved = getFuturesSpec(market, customSpecs);
  let multiplier = 0;
  let unitLabel = '';
  let specSource: SpecSource | null = null;
  let specRef: FuturesSpec | null = null;
  if (resolved) {
    multiplier = resolved.spec.dollarPerSlUnit;
    unitLabel = resolved.spec.slUnitLabel;
    specSource = resolved.source;
    specRef = resolved.spec;
  } else if (overrideValue > 0) {
    multiplier = overrideValue;
    unitLabel = 'unit';
    specSource = 'override';
  }

  const inputsReady = contracts > 0 && sl > 0 && multiplier > 0;
  const riskDollars = inputsReady ? contracts * sl * multiplier : 0;
  const targetDollars = inputsReady && rr > 0 ? riskDollars * rr : 0;

  const balance = Number(accountBalance) || 0;
  const riskPct = balance > 0 && riskDollars > 0 ? (riskDollars / balance) * 100 : 0;

  const showWarning = riskDollars > 0 && balance > 0 && (riskPct > HIGH_RISK_PCT || riskPct < LOW_RISK_PCT);
  const warningCopy = riskPct > HIGH_RISK_PCT
    ? `Risk is ${riskPct.toFixed(1)}% of balance — verify SL ${unitLabel || 'unit'}.`
    : `Risk is ${riskPct.toFixed(3)}% of balance — verify SL ${unitLabel || 'unit'}.`;

  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

  if (!inputsReady) {
    return (
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 px-4 py-3">
        <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
          Enter contracts and SL size to see risk preview.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 px-4 py-3 space-y-2"
      aria-live="polite"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">Risk</span>
        <span className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
          {fmt(riskDollars)}
        </span>
      </div>
      {targetDollars > 0 && (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Target P&amp;L <span className="text-slate-400">(at {rr.toFixed(2)}:1)</span>
          </span>
          <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
            {fmt(targetDollars)}
          </span>
        </div>
      )}
      {specRef && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
          Using {specSource === 'custom' ? 'saved' : 'canonical'} spec: {specRef.label}
          {' '}· <span className="font-mono">{currencySymbol}{multiplier} / {unitLabel}</span>
        </p>
      )}
      {!specRef && specSource === 'override' && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
          Using per-trade override: <span className="font-mono">{currencySymbol}{multiplier} per SL unit</span>
        </p>
      )}
      {showWarning && (
        <div className="flex gap-2 items-start rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 mt-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">{warningCopy}</p>
        </div>
      )}
    </div>
  );
}
