'use client';

import { useCallback, useEffect, useState } from 'react';
import { BacktestChart } from '@/components/backtest/BacktestChart';
import { SectionBadge } from '@/components/landing/shared/SectionBadge';
import { SectionHeading } from '@/components/landing/shared/SectionHeading';
import type { OhlcBar } from '@/lib/marketData/types';
import { DemoSymbolPicker } from './DemoSymbolPicker';
import {
  DEFAULT_DEMO_SYMBOL,
  DEFAULT_DEMO_TF,
  DEMO_LOOKBACK_DAYS,
  demoBarsUrl,
  type DemoSymbol,
  type DemoTimeframe,
} from './demoCatalog';

type Status = 'loading' | 'ready' | 'error';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Last DEMO_LOOKBACK_DAYS days, anchored at UTC midnight. Anchoring the range
 * keeps the URL stable across renders within the same UTC day so React Query
 * dedupe / Next route caching can collapse repeats.
 */
function lookbackRange(): { fromIso: string; toIso: string } {
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  const from = new Date(to.getTime() - DEMO_LOOKBACK_DAYS * MS_PER_DAY);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

interface PublicOhlcResponse {
  bars: OhlcBar[];
}

export function DemoChartSection() {
  const [symbol, setSymbol] = useState<DemoSymbol>(DEFAULT_DEMO_SYMBOL);
  const [tf, setTf] = useState<DemoTimeframe>(DEFAULT_DEMO_TF);
  const [bars, setBars] = useState<OhlcBar[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  // Bumped on retry click to re-trigger the fetch effect with a fresh AbortController.
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    const { fromIso, toIso } = lookbackRange();
    fetch(demoBarsUrl(symbol, tf, fromIso, toIso), { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PublicOhlcResponse;
        if (!Array.isArray(json.bars) || json.bars.length === 0) {
          throw new Error('Empty bar set');
        }
        setBars(json.bars);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[demo-chart] failed to load bars', err);
        setStatus('error');
      });
    return () => ctrl.abort();
  }, [symbol, tf, retryNonce]);

  // Set 'loading' alongside the trigger that re-runs the fetch, instead of
  // inside the effect — keeps state changes batched and avoids the cascading-
  // render warning from the React Compiler / lint rule.
  const handlePickerChange = useCallback((s: DemoSymbol, nextTf: DemoTimeframe) => {
    if (s === symbol && nextTf === tf) return;
    setSymbol(s);
    setTf(nextTf);
    setStatus('loading');
  }, [symbol, tf]);

  const handleRetry = useCallback(() => {
    setRetryNonce((n) => n + 1);
    setStatus('loading');
  }, []);

  return (
    <section
      id="demo-chart"
      className="relative mx-auto max-w-6xl px-4 py-20 scroll-mt-24"
    >
      <SectionBadge label="Live demo" />
      <SectionHeading>Try it now — no signup</SectionHeading>
      <p className="mt-4 max-w-[560px] text-base text-muted-foreground">
        Pick a symbol and timeframe. The chart shows the last month of bars from
        Dukascopy — the same data feed we use for paid backtesting.
      </p>

      <div className="mt-8">
        <DemoSymbolPicker symbol={symbol} tf={tf} onChange={handlePickerChange} />
      </div>

      <div className="relative mt-6 h-[520px] rounded-xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/30 overflow-hidden">
        {status === 'error' ? (
          <ErrorOverlay onRetry={handleRetry} />
        ) : (
          <>
            {status === 'loading' && <LoadingOverlay />}
            <BacktestChart
              bars={bars}
              showVolume={false}
              dateMode="utc"
              className="h-full w-full"
            />
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Historical price data provided by{' '}
        <a
          href="https://www.dukascopy.com"
          rel="noopener"
          target="_blank"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Dukascopy Bank SA
        </a>
        .
      </p>
    </section>
  );
}

function LoadingOverlay() {
  return (
    <div
      role="status"
      aria-label="Loading chart data"
      className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/40 dark:bg-slate-900/40 backdrop-blur-sm"
    >
      <span className="text-sm text-muted-foreground">Loading bars…</span>
    </div>
  );
}

function ErrorOverlay({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t load chart data. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-slate-300/40 dark:border-slate-700/50 px-4 py-2 text-sm font-medium hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
