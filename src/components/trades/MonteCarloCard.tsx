'use client';

import React, { useMemo, useState } from 'react';
import { Crown, Info } from 'lucide-react';
import { MonteCarloChart } from './MonteCarloChart';
import { runMonteCarloSimulation } from '@/utils/monteCarloSimulation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDarkMode } from '@/hooks/useDarkMode';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { Trade } from '@/types/trade';

export const MONTE_CARLO_MIN_TRADES = 20;
const FUTURE_TRADE_OPTIONS = [25, 50, 75, 100, 150, 200, 500, 750, 1000] as const;
type DisplayMode = 'r' | 'dollar';

interface MonteCarloCardProps {
  trades: Trade[];
  currencySymbol?: string;
  isPro?: boolean;
}

export const MonteCarloCard: React.FC<MonteCarloCardProps> = ({
  trades,
  currencySymbol = '$',
  isPro,
}) => {
  const [futureTrades, setFutureTrades] = useState<number>(50);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('r');
  /** Starter-only: hide locked PRO preview (matches strategy page Hide PRO toggle). */
  const [showProPreview, setShowProPreview] = useState(true);
  const { isDark } = useDarkMode();
  const isLocked = !isPro;
  const showHideProToggle = isPro === false;

  const simulationData = useMemo(() => {
    if (isLocked) return [];
    return runMonteCarloSimulation(trades, 500, futureTrades);
  }, [isLocked, trades, futureTrades]);

  const tradesToUse = isLocked ? [] : trades;
  const tradesCount = tradesToUse.length;

  const hasSufficientData = tradesCount >= MONTE_CARLO_MIN_TRADES;

  if (showHideProToggle && !showProPreview) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3">
        <MonteCarloHideProToggle
          showProCards={showProPreview}
          onShowProCardsChange={setShowProPreview}
        />
      </div>
    );
  }

  /** Blurred + overlay region only — tooltip trigger excludes top PRO / Hide PRO controls. */
  const lockedPreviewBody = (
    <>
      {isLocked && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
      )}
      <div
        className={cn(
          'relative z-0 flex h-full min-h-0 flex-1 flex-col',
          isLocked && 'blur-[3px] opacity-70 pointer-events-none select-none'
        )}
      >
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
                  Future Equity
                </CardTitle>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="rounded p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-help focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                        aria-label="How to read this chart"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="start"
                      sideOffset={8}
                      className="w-[320px] text-xs sm:text-sm rounded-2xl p-4 relative overflow-hidden border border-slate-700/80 bg-slate-900/90 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.7)] text-slate-50 z-[100]"
                    >
                      {isDark && (
                        <div className="themed-nav-overlay themed-nav-overlay--diagonal pointer-events-none absolute inset-0 rounded-2xl" />
                      )}
                      <div className="relative text-left">
                        <div className="text-[11px] font-extrabold tracking-[0.18em] text-slate-300 mb-2">
                          HOW TO READ THIS CHART
                        </div>
                        <p className="text-xs text-slate-200/90 mb-3">
                          500 random sequences are simulated by drawing from your real trade history.
                          Each band shows how many of those sequences landed in that range at each future trade.
                        </p>
                        <div className="flex flex-col gap-2">
                        <TooltipBandRow
                          color="var(--tc-primary, #8b5cf6)"
                          label="75th – 90th pct"
                          description="Top 25% of runs — your best realistic scenarios."
                        />
                        <TooltipBandRow
                          color="var(--tc-primary, #8b5cf6)"
                          label="50th – 75th pct"
                          description="Above-average outcomes. More likely than not if your edge holds."
                          opacity={0.5}
                        />
                        <TooltipBandRow
                          isLine
                          color="var(--tc-primary, #8b5cf6)"
                          label="Median (50th pct)"
                          description="Half of all simulations finished above this, half below."
                        />
                        <TooltipBandRow
                          color="#f43f5e"
                          label="25th – 50th pct"
                          description="Below-average outcomes. Still within normal variance."
                          opacity={0.5}
                        />
                          <TooltipBandRow
                            color="#f43f5e"
                            label="10th – 25th pct"
                            description="Bottom 25% of runs — worst realistic scenarios."
                          />
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription className="text-base text-slate-500 dark:text-slate-400">
                {hasSufficientData
                  ? `Based on ${tradesCount} trade${tradesCount !== 1 ? 's' : ''} · ${futureTrades} future trades projected`
                  : `${tradesCount} trade${tradesCount !== 1 ? 's' : ''} available · need at least ${MONTE_CARLO_MIN_TRADES} for simulation`}
              </CardDescription>
            </div>

            {hasSufficientData ? (
              <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 gap-y-3">
                {/* R / $ toggle */}
                <div className="flex items-center rounded-xl border border-slate-200/70 dark:border-slate-700/50 overflow-hidden h-8 text-xs bg-slate-100/60 dark:bg-slate-800/40">
                  <button
                    onClick={() => setDisplayMode('r')}
                    className={`px-3 h-full font-semibold transition-colors duration-150 cursor-pointer ${
                      displayMode === 'r'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    R
                  </button>
                  <button
                    onClick={() => setDisplayMode('dollar')}
                    className={`px-3 h-full font-semibold transition-colors duration-150 cursor-pointer ${
                      displayMode === 'dollar'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {currencySymbol}
                  </button>
                </div>

                {/* Future trades selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Future trades:
                  </span>
                  <Select
                    value={String(futureTrades)}
                    onValueChange={(v) => setFutureTrades(Number(v))}
                  >
                    <SelectTrigger className="w-20 h-8 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 !bg-slate-50/50 dark:!bg-slate-800/30 backdrop-blur-xl shadow-none themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 cursor-pointer">
                      {FUTURE_TRADE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={String(opt)}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex-1 pt-2 pb-4">
          <div className="relative">
          {/* Chart or empty state */}
          {hasSufficientData ? (
            <>
              <div className="h-72">
                <MonteCarloChart
                  data={simulationData}
                  mode={displayMode}
                  currencySymbol={currencySymbol}
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4">
                <LegendDot color="var(--tc-primary, #8b5cf6)" label="75th–90th" />
                <LegendDot color="var(--tc-primary, #8b5cf6)" label="50th–75th" opacity={0.5} />
                <div className="flex items-center gap-1.5">
                  <span
                    className="block w-6 h-0.5 rounded-full"
                    style={{ background: 'var(--tc-primary, #8b5cf6)' }}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Median</span>
                </div>
                <LegendDot color="#f43f5e" label="25th–50th" opacity={0.5} />
                <LegendDot color="#f43f5e" label="10th–25th" />
              </div>
            </>
          ) : (
            <EmptyState tradeCount={tradesCount} minTrades={MONTE_CARLO_MIN_TRADES} />
          )}
        </div>
        </CardContent>
      </div>
    </>
  );

  const cardContent = (
    <Card className="mb-4 relative flex w-full flex-col overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
      {isLocked && (
        <div className="pointer-events-auto absolute right-3 top-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-row-reverse flex-wrap items-center justify-end gap-2">
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> PRO
          </span>
          {showHideProToggle && (
            <MonteCarloHideProToggle
              showProCards={showProPreview}
              onShowProCardsChange={setShowProPreview}
              compact
              onPointerDown={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {isLocked ? (
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative flex min-h-0 w-full flex-1 flex-col outline-none">
                {lockedPreviewBody}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              sideOffset={8}
              className="max-w-sm text-xs rounded-2xl p-3 border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50"
            >
              The data shown under the blur card is fictive and for demo purposes only.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        lockedPreviewBody
      )}
    </Card>
  );

  return cardContent;
};

/** Same interaction + styling as `ViewModeToggle` Hide PRO (starter users only). */
function MonteCarloHideProToggle({
  showProCards,
  onShowProCardsChange,
  withLeadingSeparator = false,
  compact = false,
  onPointerDown,
}: {
  showProCards: boolean;
  onShowProCardsChange: (show: boolean) => void;
  withLeadingSeparator?: boolean;
  compact?: boolean;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
}) {
  return (
    <div onPointerDown={onPointerDown} className="shrink-0">
      {withLeadingSeparator && (
        <>
          <div
            className="hidden sm:block h-7 w-px shrink-0 self-center bg-slate-300 dark:bg-slate-600"
            aria-hidden
          />
          <div
            className="sm:hidden w-full min-w-full basis-full shrink-0 h-px bg-slate-300 dark:bg-slate-600"
            aria-hidden
          />
        </>
      )}
      <div className={cn('flex items-center', compact ? 'gap-2' : 'gap-3')}>
        <button
          type="button"
          onClick={() => onShowProCardsChange(!showProCards)}
          aria-label={showProCards ? 'Hide PRO statistics' : 'Show PRO statistics'}
          className={cn(
            'relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 themed-focus focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 shadow-md cursor-pointer',
            !showProCards
              ? 'themed-btn-primary'
              : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md border',
              !showProCards
                ? 'translate-x-[24px] border-white/50'
                : 'translate-x-[4px] border-slate-200/50 dark:border-slate-600/50'
            )}
          />
        </button>
        <span
          className={cn(
            'font-semibold transition-all duration-300',
            compact ? 'text-xs' : 'text-sm',
            !showProCards
              ? 'text-slate-900 dark:text-slate-100'
              : 'text-slate-500 dark:text-slate-400'
          )}
        >
          Hide PRO
        </span>
      </div>
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

const TooltipBandRow: React.FC<{
  color: string;
  label: string;
  description: string;
  opacity?: number;
  isLine?: boolean;
}> = ({ color, label, description, opacity = 1, isLine = false }) => (
  <div className="flex gap-2">
    <div className="mt-0.5 flex-shrink-0">
      {isLine ? (
        <span className="block w-3 h-0.5 mt-1.5 rounded-full" style={{ background: color, opacity }} />
      ) : (
        <span className="block w-3 h-3 rounded-sm" style={{ background: color, opacity }} />
      )}
    </div>
    <div>
      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{label}: </span>
      <span className="text-xs text-slate-600 dark:text-slate-400">{description}</span>
    </div>
  </div>
);

const LegendDot: React.FC<{ color: string; label: string; opacity?: number }> = ({
  color,
  label,
  opacity = 1,
}) => (
  <div className="flex items-center gap-1.5">
    <span
      className="block w-2.5 h-2.5 rounded-sm flex-shrink-0"
      style={{ background: color, opacity }}
    />
    <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
  </div>
);

const EmptyState: React.FC<{ tradeCount: number; minTrades: number }> = ({
  tradeCount,
  minTrades,
}) => (
  <div className="flex flex-col items-center justify-center gap-3 py-14 rounded-lg bg-slate-100/50 dark:bg-slate-800/30">
    <div className="w-10 h-10 rounded-full bg-slate-200/60 dark:bg-slate-700/40 flex items-center justify-center">
      <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    </div>
    <div className="text-center">
      <p className="text-base font-medium text-slate-600 dark:text-slate-300">
        Not enough trades yet
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        {minTrades - tradeCount} more trade{minTrades - tradeCount !== 1 ? 's' : ''} needed to run the simulation
      </p>
    </div>
  </div>
);
