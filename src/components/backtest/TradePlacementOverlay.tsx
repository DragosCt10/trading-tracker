'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crosshair, Target, ShieldAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  calculateBacktestRisk,
  type BacktestRiskResult,
} from '@/utils/backtestRiskCalc';

export type PlacementMode = 'idle' | 'entry' | 'sl' | 'tp';

export interface TradePlacementState {
  mode: PlacementMode;
  entryPrice: number | null;
  slPrice: number | null;
  tpPrice: number | null;
  /** Risk percent of balance (e.g. 0.5 for 0.5%). */
  riskPct: number;
}

interface TradePlacementOverlayProps {
  state: TradePlacementState;
  onChange: (next: TradePlacementState) => void;
  /** Account balance (currency-agnostic — display-only). */
  balance: number;
  /** Currency symbol for the dollar readouts (e.g. "$"). */
  currencySymbol?: string;
}

const formatMoney = (n: number, symbol: string) =>
  `${n < 0 ? '-' : ''}${symbol}${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPrice = (n: number | null) =>
  n == null
    ? '—'
    : n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/**
 * Click-to-place trade overlay. The chart click handler peeks at `state.mode`
 * and writes the clicked price to the corresponding slot — see BacktestClient.
 *
 * Why a mode toggle instead of native drag handles: lightweight-charts has no
 * built-in draggable price lines. Step 1 trades implementation effort for a
 * UX that's simple to explain — pick which line you want to move, then click
 * the chart at the new price. Step 2 will revisit with a custom drag layer
 * once the rest of the placement model is settled.
 */
export function TradePlacementOverlay({
  state,
  onChange,
  balance,
  currencySymbol = '$',
}: TradePlacementOverlayProps) {
  const risk: BacktestRiskResult = useMemo(
    () =>
      calculateBacktestRisk({
        entryPrice: state.entryPrice,
        slPrice: state.slPrice,
        tpPrice: state.tpPrice,
        riskPct: state.riskPct,
        balance,
      }),
    [state.entryPrice, state.slPrice, state.tpPrice, state.riskPct, balance],
  );

  const setMode = (next: PlacementMode) =>
    onChange({ ...state, mode: state.mode === next ? 'idle' : next });

  const reset = () =>
    onChange({
      mode: 'idle',
      entryPrice: null,
      slPrice: null,
      tpPrice: null,
      riskPct: state.riskPct,
    });

  const directionLabel =
    risk.direction === 'long'
      ? 'Long'
      : risk.direction === 'short'
        ? 'Short'
        : '—';

  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/85 dark:bg-slate-800/40 backdrop-blur-xl p-4 shadow-md min-w-[260px] max-w-[300px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Trade placement
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 cursor-pointer"
          aria-label="Clear placement"
          onClick={reset}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <PlacementButton
          icon={<Crosshair className="h-3.5 w-3.5" />}
          label="Entry"
          active={state.mode === 'entry'}
          set={state.entryPrice != null}
          onClick={() => setMode('entry')}
        />
        <PlacementButton
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          label="SL"
          active={state.mode === 'sl'}
          set={state.slPrice != null}
          onClick={() => setMode('sl')}
        />
        <PlacementButton
          icon={<Target className="h-3.5 w-3.5" />}
          label="TP"
          active={state.mode === 'tp'}
          set={state.tpPrice != null}
          onClick={() => setMode('tp')}
        />
      </div>

      {state.mode !== 'idle' && (
        <div className="text-xs text-blue-600 dark:text-blue-400 mb-3">
          Click on the chart to set {state.mode.toUpperCase()}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-3">
        <Stat label="Direction" value={directionLabel} />
        <Stat label="R:R" value={risk.rr ? `${risk.rr.toFixed(2)} : 1` : '—'} />
        <Stat label="Entry" value={formatPrice(state.entryPrice)} />
        <Stat label="SL" value={formatPrice(state.slPrice)} />
        <Stat label="TP" value={formatPrice(state.tpPrice)} />
        <Stat label="SL distance" value={risk.slDistance ? risk.slDistance.toFixed(2) : '—'} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Label htmlFor="bt-risk-pct" className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
          Risk %
        </Label>
        <Input
          id="bt-risk-pct"
          type="number"
          step="0.05"
          min="0"
          max="100"
          value={state.riskPct}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange({ ...state, riskPct: Number.isFinite(v) ? v : 0 });
          }}
          className="h-8 w-20 text-xs"
        />
      </div>

      <div className="rounded-lg border border-slate-200/70 dark:border-slate-700/50 bg-white/60 dark:bg-slate-900/40 p-2.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500 dark:text-slate-400">Risk</span>
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            -{formatMoney(risk.riskDollars, currencySymbol)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Reward (TP)</span>
          <span
            className={cn(
              'font-semibold',
              risk.projectedPnlDollars > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-500',
            )}
          >
            +{formatMoney(risk.projectedPnlDollars, currencySymbol)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlacementButton({
  icon,
  label,
  active,
  set,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  set: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors cursor-pointer',
        active
          ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300'
          : set
            ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15'
            : 'border-slate-200/70 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/40',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100 text-right tabular-nums">{value}</span>
    </>
  );
}
