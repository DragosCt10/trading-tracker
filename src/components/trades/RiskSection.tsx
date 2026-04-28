'use client';

import * as React from 'react';
import { useState } from 'react';

import type { Trade } from '@/types/trade';
import type { AccountType, CustomFuturesSpec } from '@/types/account-settings';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CommonCombobox } from '@/components/CommonCombobox';
import { getFuturesSpec, normalizeFuturesSymbol, FUTURES_SPECS } from '@/constants/futuresSpecs';
import { FuturesRiskPreview } from '@/components/trades/FuturesRiskPreview';
import { SaveCustomFuturesSpecModal } from '@/components/trades/SaveCustomFuturesSpecModal';

interface RiskSectionProps {
  // ── Standard inputs (always rendered for both account types) ────────────
  riskPerTrade: Trade['risk_per_trade'];
  riskRewardRatio: Trade['risk_reward_ratio'];
  pnlPercentage: number;
  signedProfit: number;
  currency: string;
  riskPerTradeOptions: string[];
  rrRatioOptions: string[];
  onEditSavedRiskPerTrade: (oldName: string, newName: string) => void | Promise<void>;
  onEditSavedRrRatio: (oldName: string, newName: string) => void | Promise<void>;
  pinnedIdsRiskPerTrade?: string[];
  onTogglePinRiskPerTrade?: (itemId: string) => void;
  pinnedIdsRrRatio?: string[];
  onTogglePinRrRatio?: (itemId: string) => void;
  updateTrade: <K extends keyof Trade>(key: K, value: Trade[K]) => void;

  // ── Futures inputs (only used when accountType === 'futures') ───────────
  accountType?: AccountType;
  /** Active account balance — used for risk-% sanity warning in the preview. */
  accountBalance?: number;
  /** Current symbol from the form (drives the 3-tier spec resolver). */
  market?: string;
  /** SL size from the form (numeric input). Always stored in spec-native unit (points for equity-index). */
  slSize?: number;
  numContracts?: Trade['num_contracts'];
  dollarPerSlUnitOverride?: Trade['dollar_per_sl_unit_override'];
  /** User-saved custom specs (tier 2). Sourced from useSettings. */
  customSpecs?: CustomFuturesSpec[];
  /** Pickable SL-size suggestions for futures (saved on the strategy). */
  slSizeOptions?: string[];
  onEditSavedSlSize?: (oldName: string, newName: string) => void | Promise<void>;
  pinnedIdsSlSize?: string[];
  onTogglePinSlSize?: (itemId: string) => void;
}

export const RiskSection = React.memo(function RiskSection(props: RiskSectionProps) {
  const isFutures = props.accountType === 'futures';

  if (isFutures) {
    return <FuturesRiskInputs {...props} />;
  }

  return <StandardRiskInputs {...props} />;
});

// ─── Standard branch (preserved from NewTradeModal v1) ──────────────────────

function StandardRiskInputs({
  riskPerTrade,
  riskRewardRatio,
  pnlPercentage,
  signedProfit,
  currency,
  riskPerTradeOptions,
  rrRatioOptions,
  onEditSavedRiskPerTrade,
  onEditSavedRrRatio,
  pinnedIdsRiskPerTrade,
  onTogglePinRiskPerTrade,
  pinnedIdsRrRatio,
  onTogglePinRrRatio,
  updateTrade,
}: RiskSectionProps) {
  return (
    <>
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Risk per Trade (%) *
            </Label>
            <CommonCombobox
              value={riskPerTrade != null ? String(riskPerTrade) : ''}
              onChange={(v) => {
                const trimmed = v.trim();
                if (trimmed === '') {
                  updateTrade('risk_per_trade', undefined);
                  return;
                }
                const n = parseFloat(trimmed);
                updateTrade('risk_per_trade', Number.isFinite(n) ? n : undefined);
              }}
              options={riskPerTradeOptions}
              defaultSuggestions={riskPerTradeOptions}
              customValueLabel="risk per trade"
              placeholder="e.g. 1.5"
              dropdownClassName="z-[100]"
              inputMode="decimal"
              onEditSavedOption={onEditSavedRiskPerTrade}
              pinnedIds={pinnedIdsRiskPerTrade}
              onTogglePin={onTogglePinRiskPerTrade}
            />
          </div>

          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              R:R Ratio *
            </Label>
            <CommonCombobox
              value={riskRewardRatio != null ? String(riskRewardRatio) : ''}
              onChange={(v) => {
                const trimmed = v.trim();
                if (trimmed === '') {
                  updateTrade('risk_reward_ratio', undefined);
                  return;
                }
                const n = parseFloat(trimmed);
                updateTrade('risk_reward_ratio', Number.isFinite(n) ? n : undefined);
              }}
              options={rrRatioOptions}
              defaultSuggestions={rrRatioOptions}
              customValueLabel="R:R"
              placeholder="e.g. 2"
              dropdownClassName="z-[100]"
              inputMode="decimal"
              onEditSavedOption={onEditSavedRrRatio}
              pinnedIds={pinnedIdsRrRatio}
              onTogglePin={onTogglePinRrRatio}
            />
          </div>
        </div>
      </div>

      <PnlSummary pnlPercentage={pnlPercentage} signedProfit={signedProfit} currency={currency} />
    </>
  );
}

// ─── Futures branch ─────────────────────────────────────────────────────────

function FuturesRiskInputs({
  riskRewardRatio,
  pnlPercentage,
  signedProfit,
  currency,
  rrRatioOptions,
  onEditSavedRrRatio,
  pinnedIdsRrRatio,
  onTogglePinRrRatio,
  updateTrade,
  accountBalance,
  market,
  slSize,
  numContracts,
  dollarPerSlUnitOverride,
  customSpecs = [],
  slSizeOptions = [],
  onEditSavedSlSize,
  pinnedIdsSlSize,
  onTogglePinSlSize,
}: RiskSectionProps) {
  const normalizedSymbol = normalizeFuturesSymbol(market ?? '');
  const resolved = getFuturesSpec(normalizedSymbol, customSpecs);
  const specMissing = !resolved && normalizedSymbol.length > 0;
  const tickSize = resolved?.spec.tickSize;
  const supportsToggle = typeof tickSize === 'number' && tickSize > 0;

  const [saveSymbolModalOpen, setSaveSymbolModalOpen] = useState(false);
  /**
   * UI-only display unit. Storage stays canonical (sl_size always in spec-native unit, e.g. points).
   * Default 'native': what the spec calls its base unit (slUnitLabel, e.g. "point" for ES).
   * 'tick': converts displayed value via stored / tickSize. Toggle only visible when supportsToggle.
   */
  const [slUnit, setSlUnit] = useState<'native' | 'tick'>('native');
  const effectiveSlUnit: 'native' | 'tick' = supportsToggle ? slUnit : 'native';

  // Convert stored value (always in native unit) → display value for the input.
  const displayedSlValue =
    effectiveSlUnit === 'tick' && tickSize && slSize != null && slSize !== 0
      ? Number((slSize / tickSize).toFixed(6))
      : slSize;

  /** Convert a typed/selected string from the displayed unit back to the spec-native unit before persisting. */
  const persistSlSize = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      updateTrade('sl_size', undefined);
      return;
    }
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n)) {
      updateTrade('sl_size', undefined);
      return;
    }
    const inNative = effectiveSlUnit === 'tick' && tickSize ? n * tickSize : n;
    updateTrade('sl_size', inNative);
  };

  const dollarPerTick =
    resolved && tickSize ? Number((resolved.spec.dollarPerSlUnit * tickSize).toFixed(6)) : null;

  const unitLabelForToggle = resolved?.spec.slUnitLabel ?? 'unit';

  /** Derive contract-size qualifier from the spec label so the UI reads naturally
   *  (e.g. "Number of micro contracts" for MNQ, "Number of mini contracts" for ES). */
  const contractsLabel = (() => {
    const label = resolved?.spec.label?.toLowerCase() ?? '';
    if (label.includes('micro')) return 'Number of micro contracts';
    if (label.includes('mini')) return 'Number of mini contracts';
    return 'Number of contracts';
  })();

  return (
    <>
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Number of contracts — label adapts to mini / micro variants for clarity. */}
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {contractsLabel} *
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              pattern="[0-9]*"
              placeholder="e.g. 5"
              value={numContracts != null ? String(numContracts) : ''}
              onKeyDown={(e) => {
                // Block decimal/exponent characters at the keystroke level — contracts are whole-number-only.
                if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
              }}
              onChange={(e) => {
                // Strip anything that isn't a digit (handles paste / IME / mobile keyboards) and coerce to int.
                const digitsOnly = e.target.value.replace(/\D+/g, '');
                if (digitsOnly === '') {
                  updateTrade('num_contracts', null);
                  return;
                }
                const n = parseInt(digitsOnly, 10);
                updateTrade('num_contracts', Number.isFinite(n) && n > 0 ? n : null);
              }}
              className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {resolved && (
              <p className="text-[11px] text-slate-500 dark:text-slate-500">
                {resolved.spec.label}
                {' '}
                <span className="text-slate-400">
                  ({currency}{resolved.spec.dollarPerSlUnit} / {resolved.spec.slUnitLabel}
                  {dollarPerTick != null && (
                    <> · {currency}{dollarPerTick} / tick</>
                  )})
                </span>
                {resolved.source === 'custom' && (
                  <span className="text-slate-400"> · saved</span>
                )}
              </p>
            )}
          </div>

          {/* SL Size — stored in spec-native unit, optional Point/Tick display toggle inside the input. */}
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              SL Size *
            </Label>
            <div className="relative">
              <CommonCombobox
                value={displayedSlValue != null ? String(displayedSlValue) : ''}
                onChange={persistSlSize}
                options={slSizeOptions}
                defaultSuggestions={slSizeOptions}
                customValueLabel="SL size"
                placeholder={
                  effectiveSlUnit === 'tick' ? 'e.g. 40 (ticks)' : `e.g. 10 (${unitLabelForToggle}s)`
                }
                dropdownClassName="z-[100]"
                inputMode="decimal"
                onEditSavedOption={onEditSavedSlSize}
                pinnedIds={pinnedIdsSlSize}
                onTogglePin={onTogglePinSlSize}
                className={supportsToggle ? 'pr-[7.25rem]' : undefined}
              />
              {supportsToggle && (
                <div
                  role="group"
                  aria-label="SL size unit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 inline-flex rounded-lg border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm p-0.5 text-[11px] font-medium shadow-sm"
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSlUnit('native')}
                    aria-pressed={effectiveSlUnit === 'native'}
                    className={`px-2 py-1 rounded-md capitalize transition-colors ${
                      effectiveSlUnit === 'native'
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {unitLabelForToggle}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSlUnit('tick')}
                    aria-pressed={effectiveSlUnit === 'tick'}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      effectiveSlUnit === 'tick'
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    tick
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* R:R Ratio (preserved for futures per D2) */}
          <div className="space-y-2">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              R:R Ratio *
            </Label>
            <CommonCombobox
              value={riskRewardRatio != null ? String(riskRewardRatio) : ''}
              onChange={(v) => {
                const trimmed = v.trim();
                if (trimmed === '') {
                  updateTrade('risk_reward_ratio', undefined);
                  return;
                }
                const n = parseFloat(trimmed);
                updateTrade('risk_reward_ratio', Number.isFinite(n) ? n : undefined);
              }}
              options={rrRatioOptions}
              defaultSuggestions={rrRatioOptions}
              customValueLabel="R:R"
              placeholder="e.g. 2"
              dropdownClassName="z-[100]"
              inputMode="decimal"
              onEditSavedOption={onEditSavedRrRatio}
              pinnedIds={pinnedIdsRrRatio}
              onTogglePin={onTogglePinRrRatio}
            />
          </div>
        </div>

        {/* Override + save-symbol checkbox (tier 3, only when symbol missing) */}
        {specMissing && (
          <div className="space-y-3 rounded-xl border border-dashed border-amber-300/60 dark:border-amber-700/50 bg-amber-50/40 dark:bg-amber-900/10 p-4">
            <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
              Symbol &quot;{normalizedSymbol}&quot; not in catalog
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
              Enter the dollar value of 1 SL unit for this symbol, or save it for future trades.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  $ per SL-unit
                </Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="e.g. 50"
                  value={dollarPerSlUnitOverride != null ? String(dollarPerSlUnitOverride) : ''}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (v === '') {
                      updateTrade('dollar_per_sl_unit_override', null);
                      return;
                    }
                    const n = parseFloat(v);
                    updateTrade('dollar_per_sl_unit_override', Number.isFinite(n) ? n : null);
                  }}
                  className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300 sm:pb-2">
                <Checkbox
                  checked={saveSymbolModalOpen}
                  onCheckedChange={(checked) => setSaveSymbolModalOpen(checked === true)}
                  className="themed-checkbox h-4 w-4"
                />
                Save {normalizedSymbol} for future trades
              </label>
            </div>
          </div>
        )}

        {/* Live $ risk preview */}
        <FuturesRiskPreview
          accountBalance={accountBalance ?? 0}
          currencySymbol={currency}
          market={normalizedSymbol}
          numContracts={numContracts ?? undefined}
          slSize={slSize}
          riskRewardRatio={riskRewardRatio ?? undefined}
          dollarPerSlUnitOverride={dollarPerSlUnitOverride ?? undefined}
          customSpecs={customSpecs}
        />
      </div>

      <PnlSummary pnlPercentage={pnlPercentage} signedProfit={signedProfit} currency={currency} />

      <SaveCustomFuturesSpecModal
        open={saveSymbolModalOpen}
        onOpenChange={setSaveSymbolModalOpen}
        initialValues={{
          symbol: normalizedSymbol,
          dollarPerSlUnit: dollarPerSlUnitOverride ?? undefined,
        }}
        symbolLocked
        onSaved={() => {
          // Once saved, override is no longer needed — clear it so the resolver picks up tier 2.
          updateTrade('dollar_per_sl_unit_override', null);
        }}
      />
    </>
  );
}

// ─── Shared P&L summary ─────────────────────────────────────────────────────

function PnlSummary({
  pnlPercentage,
  signedProfit,
  currency,
}: {
  pnlPercentage: number;
  signedProfit: number;
  currency: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Calculated P&amp;L:</span>
        <div className="flex items-center gap-3">
          <Badge
            variant={pnlPercentage >= 0 ? 'default' : 'destructive'}
            className={`text-sm font-bold px-2.5 py-1 focus:ring-0 focus-visible:ring-0 hover:ring-0 ${
              pnlPercentage >= 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-500/10 hover:dark:bg-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-500/10 hover:dark:bg-rose-500/20'
            }`}
          >
            {pnlPercentage >= 0 ? '+' : ''}
            {pnlPercentage.toFixed(2)}%
          </Badge>
          <span
            className={`text-xl font-bold ${
              pnlPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {currency}
            {signedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Re-export for tests / external consumers. */
export { FUTURES_SPECS };
