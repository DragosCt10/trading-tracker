'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChartCandlestick,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  X as CloseIcon,
  LineChart,
  Check,
} from 'lucide-react';
import {
  BacktestChart,
  type BacktestChartHandle,
  type BacktestChartClick,
  type ChartLineSeries,
} from '@/components/backtest/BacktestChart';
import { computeSMA, computeEMA, computeBollingerBands } from '@/lib/indicators';
import { SymbolPicker, type SymbolPickerValue } from '@/components/backtest/SymbolPicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TradePlacementOverlay,
  type TradePlacementState,
} from '@/components/backtest/TradePlacementOverlay';
import { BACKTESTABLE_SYMBOLS } from '@/lib/marketData/dukascopySymbols';
import type { OhlcBar } from '@/lib/marketData/types';
import { timeframeToSeconds } from '@/lib/marketData/types';
import { queryKeys } from '@/lib/queryKeys';
import { MARKET_DATA } from '@/constants/queryConfig';
import type { TradingMode } from '@/types/trade';

interface BacktestClientProps {
  strategyName: string;
  mode: TradingMode;
  isBacktestingMode: boolean;
  accountBalance: number;
  currencySymbol: string;
}

const TODAY_ISO_DATE = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
const DAYS_AGO_ISO_DATE = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const DEFAULT_PICKER_VALUE: SymbolPickerValue = {
  symbol: 'NAS100', // most popular index — matches Dukascopy `usatechidxusd`
  timeframe: 'h1',
  fromIso: DAYS_AGO_ISO_DATE(60),
  toIso: TODAY_ISO_DATE(),
};

/**
 * Available indicators. `compute` takes the raw bars[] and returns one or
 * more `ChartLineSeries` ready for the chart. To add a new indicator
 * later, drop a new entry here — no other plumbing changes.
 */
type IndicatorDef = {
  id: string;
  label: string;
  category: 'MA' | 'Bands';
  compute: (bars: OhlcBar[]) => ChartLineSeries[];
};

// Tailwind-aligned palette so indicators read well in both themes.
const IND_COLORS = {
  amber: '#f59e0b',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  emerald: '#10b981',
  fuchsia: '#d946ef',
  bands: 'rgba(168, 85, 247, 0.85)', // purple-500 @ 85%
  bandsFill: 'rgba(168, 85, 247, 0.55)',
};

const INDICATORS: IndicatorDef[] = [
  {
    id: 'sma-20',
    label: 'SMA 20',
    category: 'MA',
    compute: (bars) => [
      { id: 'sma-20', title: 'SMA 20', color: IND_COLORS.amber, lineWidth: 2, data: computeSMA(bars, 20) },
    ],
  },
  {
    id: 'sma-50',
    label: 'SMA 50',
    category: 'MA',
    compute: (bars) => [
      { id: 'sma-50', title: 'SMA 50', color: IND_COLORS.sky, lineWidth: 2, data: computeSMA(bars, 50) },
    ],
  },
  {
    id: 'sma-200',
    label: 'SMA 200',
    category: 'MA',
    compute: (bars) => [
      { id: 'sma-200', title: 'SMA 200', color: IND_COLORS.violet, lineWidth: 2, data: computeSMA(bars, 200) },
    ],
  },
  {
    id: 'ema-20',
    label: 'EMA 20',
    category: 'MA',
    compute: (bars) => [
      { id: 'ema-20', title: 'EMA 20', color: IND_COLORS.rose, lineWidth: 2, data: computeEMA(bars, 20) },
    ],
  },
  {
    id: 'ema-50',
    label: 'EMA 50',
    category: 'MA',
    compute: (bars) => [
      { id: 'ema-50', title: 'EMA 50', color: IND_COLORS.emerald, lineWidth: 2, data: computeEMA(bars, 50) },
    ],
  },
  {
    id: 'ema-200',
    label: 'EMA 200',
    category: 'MA',
    compute: (bars) => [
      { id: 'ema-200', title: 'EMA 200', color: IND_COLORS.fuchsia, lineWidth: 2, data: computeEMA(bars, 200) },
    ],
  },
  {
    id: 'bb-20-2',
    label: 'Bollinger 20, 2',
    category: 'Bands',
    compute: (bars) => {
      const { middle, upper, lower } = computeBollingerBands(bars, 20, 2);
      return [
        { id: 'bb-20-2-upper', title: 'BB Upper', color: IND_COLORS.bands, lineWidth: 1, data: upper },
        { id: 'bb-20-2-middle', title: 'BB Basis', color: IND_COLORS.bandsFill, lineWidth: 2, lineStyle: 'dashed', data: middle },
        { id: 'bb-20-2-lower', title: 'BB Lower', color: IND_COLORS.bands, lineWidth: 1, data: lower },
      ];
    },
  },
];

function expandToIsoDateTime(yyyyMmDd: string, endOfDay = false): string {
  // Treat date inputs as UTC midnight to keep cache keys deterministic.
  const suffix = endOfDay ? 'T23:59:59Z' : 'T00:00:00Z';
  return `${yyyyMmDd}${suffix}`;
}

async function fetchOhlc(value: SymbolPickerValue): Promise<{ bars: OhlcBar[] }> {
  const fromIso = expandToIsoDateTime(value.fromIso, false);
  const toIso = expandToIsoDateTime(value.toIso, true);
  const params = new URLSearchParams({
    symbol: value.symbol,
    timeframe: value.timeframe,
    from: fromIso,
    to: toIso,
  });
  const res = await fetch(`/api/market-data/ohlc?${params.toString()}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to fetch market data (${res.status})`);
  }
  return res.json();
}

export default function BacktestClient({
  strategyName,
  mode,
  isBacktestingMode,
  accountBalance,
  currencySymbol,
}: BacktestClientProps) {
  const [picker, setPicker] = useState<SymbolPickerValue>(DEFAULT_PICKER_VALUE);
  const [placement, setPlacement] = useState<TradePlacementState>({
    mode: 'idle',
    entryPrice: null,
    slPrice: null,
    tpPrice: null,
    riskPct: 0.5,
  });
  const chartHandleRef = useRef<BacktestChartHandle | null>(null);
  const fullscreenRootRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Replay (TradingView-style scrub-back). `replayTime` is the UNIX-second
  // anchor; bars after it are filtered out and the BacktestChart draws a
  // dashed vertical line at this time. `replayPicking` is the "choose
  // your anchor" mode entered by the Replay button — a preview line
  // follows the cursor until click. `replayPlayDir` drives auto-stepping
  // in either direction; `replaySpeed` is a multiplier on the tick rate.
  // `replayBarPos` is the drag-positioned offset of the control bar
  // relative to its chart-container offsetParent; null = default centered.
  const [replayTime, setReplayTime] = useState<number | null>(null);
  const [replayPlayDir, setReplayPlayDir] = useState<'forward' | 'backward' | null>(null);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);
  const [replayPicking, setReplayPicking] = useState(false);
  const [replayBarPos, setReplayBarPos] = useState<{ x: number; y: number } | null>(null);
  const replayBarRef = useRef<HTMLDivElement | null>(null);
  // Tick mode = sub-bar replay using m1 bars to "build" the in-progress
  // candle (TradingView / FX Replay-style). Off by default; turning it
  // on triggers a parallel m1 fetch via the m1Query below.
  const [tickMode, setTickMode] = useState(false);

  // Active indicators. Set of IndicatorDef.id strings — insertion order
  // doesn't matter (the registry defines render order).
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(() => new Set());
  const [showVolume, setShowVolume] = useState(true);
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const indicatorMenuRef = useRef<HTMLDivElement | null>(null);

  const toggleIndicator = useCallback((id: string) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Click-outside handling for the indicator dropdown.
  useEffect(() => {
    if (!indicatorMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      const el = indicatorMenuRef.current;
      if (el && !el.contains(e.target as Node)) setIndicatorMenuOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [indicatorMenuOpen]);

  // Track real fullscreen state so the icon flips when the user hits Esc
  // or toggles via the browser, not just our button.
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      fullscreenRootRef.current?.requestFullscreen?.();
    }
  }, []);

  const fromIsoFull = useMemo(() => expandToIsoDateTime(picker.fromIso, false), [picker.fromIso]);
  const toIsoFull = useMemo(() => expandToIsoDateTime(picker.toIso, true), [picker.toIso]);

  // Daily / weekly / monthly bars carry a UTC-midnight timestamp; rendering
  // them in local time would shift the date label by ±1 for users west or
  // far east of UTC. Force UTC labels for those timeframes so every viewer
  // sees the same calendar date the bar represents (the trading day).
  const dateMode = useMemo<'local' | 'utc'>(() => {
    return picker.timeframe === 'd1' || picker.timeframe === 'w1' || picker.timeframe === 'mn1'
      ? 'utc'
      : 'local';
  }, [picker.timeframe]);

  const ohlcQuery = useQuery({
    queryKey: queryKeys.marketData.ohlc(picker.symbol, picker.timeframe, fromIsoFull, toIsoFull),
    queryFn: () => fetchOhlc(picker),
    enabled: isBacktestingMode,
    ...MARKET_DATA,
  });

  // Sub-bar replay (TradingView / FX Replay-style "tick" replay) needs
  // m1 bars underneath the user's chosen TF to build the in-progress
  // candle. Only fetched when tick mode is actually requested AND the
  // user is on a TF coarser than m1 (where it adds value).
  const m1Enabled = isBacktestingMode && tickMode && picker.timeframe !== 'm1';
  const m1Query = useQuery({
    queryKey: queryKeys.marketData.ohlc(picker.symbol, 'm1', fromIsoFull, toIsoFull),
    queryFn: () => fetchOhlc({ ...picker, timeframe: 'm1' }),
    enabled: m1Enabled,
    ...MARKET_DATA,
  });

  // Recenter the chart on first successful load + on every fetch.
  useEffect(() => {
    if (!ohlcQuery.data) return;
    chartHandleRef.current?.fitContent();
  }, [ohlcQuery.data]);

  // Refit when fullscreen toggles — viewport size just changed, so we wait
  // a frame for layout to settle before asking the chart to refit.
  useEffect(() => {
    const id = window.setTimeout(() => chartHandleRef.current?.fitContent(), 50);
    return () => window.clearTimeout(id);
  }, [isFullscreen]);

  // Picker change handler — also resets replay if symbol or timeframe
  // changes (the bar coordinates would no longer match the anchor).
  const handlePickerChange = useCallback(
    (next: SymbolPickerValue) => {
      setPicker((prev) => {
        if (next.symbol !== prev.symbol || next.timeframe !== prev.timeframe) {
          setReplayTime(null);
          setReplayPlayDir(null);
          setReplayPicking(false);
        }
        return next;
      });
    },
    [],
  );

  // Auto-play: advance (or reverse) the replay anchor at a tick rate
  // determined by `replaySpeed` (1x = 600ms/bar, 10x = 60ms/bar). Stops
  // automatically at either edge of the loaded bars. Reads bars[] inside
  // the tick to avoid stale closures on data refetches. In tick mode,
  // steps through m1 bars (60s per step) for sub-bar replay.
  useEffect(() => {
    if (replayPlayDir === null) return;
    const useM1 = tickMode && picker.timeframe !== 'm1' && (m1Query.data?.bars?.length ?? 0) > 0;
    const sourceBars = useM1 ? (m1Query.data?.bars ?? []) : (ohlcQuery.data?.bars ?? []);
    if (sourceBars.length === 0) return;
    const intervalMs = Math.max(50, Math.round(600 / replaySpeed));
    const id = window.setInterval(() => {
      setReplayTime((curr) => {
        if (curr == null) return null;
        const idx = sourceBars.findIndex((b) => b.time === curr);
        if (idx < 0) return curr;
        const nextIdx = replayPlayDir === 'forward' ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= sourceBars.length) {
          // Hit the edge — stop auto-play, hold the current anchor.
          setReplayPlayDir(null);
          return curr;
        }
        return sourceBars[nextIdx].time;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [replayPlayDir, replaySpeed, ohlcQuery.data, m1Query.data, tickMode, picker.timeframe]);

  // Picking-mode keyboard: only Esc cancels. Skipped when typing.
  useEffect(() => {
    if (!replayPicking) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setReplayPicking(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replayPicking]);

  // Active-replay keyboard: ←/→ step, Space play/pause, Esc exit.
  // Skipped when typing into an input. In tick mode, ←/→ step through
  // m1 bars (60s per step) instead of user-TF bars.
  useEffect(() => {
    if (replayTime == null) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const useM1 = tickMode && picker.timeframe !== 'm1' && (m1Query.data?.bars?.length ?? 0) > 0;
      const sourceBars = useM1 ? (m1Query.data?.bars ?? []) : (ohlcQuery.data?.bars ?? []);
      if (sourceBars.length === 0) return;
      const idx = sourceBars.findIndex((b) => b.time === replayTime);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (idx >= 0 && idx < sourceBars.length - 1) setReplayTime(sourceBars[idx + 1].time);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (idx > 0) setReplayTime(sourceBars[idx - 1].time);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setReplayPlayDir((d) => (d === 'forward' ? null : 'forward'));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setReplayTime(null);
        setReplayPlayDir(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replayTime, ohlcQuery.data, m1Query.data, tickMode, picker.timeframe]);

  // Compute indicator line series from the bars currently visible to the
  // chart (post-replay-truncation). Memoized so toggling unrelated state
  // doesn't re-run the math. Lives above the early return so the hook
  // count stays stable across render branches.
  const indicatorLineSeries = useMemo<ChartLineSeries[]>(() => {
    const all = ohlcQuery.data?.bars ?? [];
    const visible: OhlcBar[] = replayTime != null ? all.filter((b) => b.time <= replayTime) : all;
    if (activeIndicators.size === 0 || visible.length === 0) return [];
    const out: ChartLineSeries[] = [];
    for (const def of INDICATORS) {
      if (activeIndicators.has(def.id)) {
        out.push(...def.compute(visible));
      }
    }
    return out;
  }, [activeIndicators, ohlcQuery.data, replayTime]);

  const handleChartClick = useCallback(
    (click: BacktestChartClick) => {
      // Picking the replay anchor: first click commits, exits picking.
      if (replayPicking && click.time != null) {
        setReplayTime(click.time);
        setReplayPicking(false);
        return;
      }
      // While replay is active and the user isn't placing entry/SL/TP,
      // a click on the chart repositions the replay anchor — same as
      // TradingView's drag-line interaction.
      if (placement.mode === 'idle' && replayTime != null && click.time != null) {
        setReplayTime(click.time);
        return;
      }
      if (placement.mode === 'idle') return;
      const price = Number(click.price);
      if (!Number.isFinite(price)) return;
      setPlacement((prev) => {
        switch (prev.mode) {
          case 'entry':
            return { ...prev, entryPrice: price, mode: 'idle' };
          case 'sl':
            return { ...prev, slPrice: price, mode: 'idle' };
          case 'tp':
            return { ...prev, tpPrice: price, mode: 'idle' };
          default:
            return prev;
        }
      });
    },
    [placement.mode, replayTime, replayPicking],
  );

  if (!isBacktestingMode) {
    return (
      <div className="flex items-center justify-center min-h-dvh px-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-xl w-full rounded-2xl border border-amber-300/60 dark:border-amber-700/40 bg-amber-50/70 dark:bg-amber-950/20 p-6 flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
              Backtesting needs a backtesting account
            </h2>
            <p className="text-sm text-amber-800/90 dark:text-amber-300/80">
              You&apos;re currently on a <strong>{mode}</strong> account. Create or
              switch to a backtesting account to use this view.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/settings"
                className="inline-flex items-center rounded-lg border border-amber-300/60 dark:border-amber-700/40 bg-white/70 dark:bg-slate-900/40 px-3 py-1.5 text-sm font-medium text-amber-900 dark:text-amber-200 hover:bg-white dark:hover:bg-slate-900/70 transition-colors"
              >
                Open Settings
              </Link>
              <Link
                href={`/strategy/${encodeURIComponent(strategyName)}`}
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-amber-900/80 dark:text-amber-200/80 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
              >
                Back to Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bars = ohlcQuery.data?.bars ?? [];
  const errorMessage =
    ohlcQuery.error instanceof Error ? ohlcQuery.error.message : null;

  // ---- Replay derived state -----------------------------------------------
  const isReplayActive = replayTime != null;
  const m1Bars: OhlcBar[] = m1Query.data?.bars ?? [];
  // Tick mode is "armed" only when m1 data is loaded and the user opted
  // in. Falls back to bar-mode behavior while m1 is still fetching.
  const tickArmed = tickMode && picker.timeframe !== 'm1' && m1Bars.length > 0;

  // Step source: in tick mode we step through m1 bars (60s per step) so
  // the in-progress candle "builds" smoothly; in bar mode we step
  // through the user-chosen-TF bars. Both expose the same array shape.
  const stepBars: OhlcBar[] = tickArmed ? m1Bars : bars;

  // Active replay (post-click): truncate bars after the anchor so future
  // bars are hidden — TradingView's actual replay UX. In tick mode, we
  // ALSO replace the rightmost (in-progress) parent bar with a partial
  // candle aggregated from m1 bars covering [parentStart, replayTime].
  let displayBars: OhlcBar[] = bars;
  if (isReplayActive && tickArmed) {
    const anchor = replayTime as number;
    const tfSec = timeframeToSeconds(picker.timeframe);
    const parentStart = Math.floor(anchor / tfSec) * tfSec;
    const closedBars = bars.filter((b) => b.time < parentStart);
    const subBars = m1Bars.filter((b) => b.time >= parentStart && b.time <= anchor);
    if (subBars.length > 0) {
      let high = subBars[0].high;
      let low = subBars[0].low;
      let volume = 0;
      for (const b of subBars) {
        if (b.high > high) high = b.high;
        if (b.low < low) low = b.low;
        volume += b.volume ?? 0;
      }
      const partial: OhlcBar = {
        time: parentStart,
        open: subBars[0].open,
        high,
        low,
        close: subBars[subBars.length - 1].close,
        volume,
      };
      displayBars = [...closedBars, partial];
    } else {
      displayBars = closedBars;
    }
  } else if (isReplayActive) {
    displayBars = bars.filter((b) => b.time <= (replayTime as number));
  }

  // Countdown badge — time remaining until the in-progress candle
  // closes, formatted MM:SS or HH:MM:SS. Only shown in active replay
  // + tick mode. Aligned with the rightmost (partial) candle's close
  // by BacktestChart, which renders it on the right axis.
  let countdownLabel: { text: string; price: number } | null = null;
  if (isReplayActive && tickArmed && displayBars.length > 0) {
    const tfSec = timeframeToSeconds(picker.timeframe);
    const anchor = replayTime as number;
    const parentStart = Math.floor(anchor / tfSec) * tfSec;
    const remaining = Math.max(0, parentStart + tfSec - anchor);
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const text = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    const lastClose = displayBars[displayBars.length - 1].close;
    countdownLabel = { text, price: lastClose };
  }

  // Index of the current anchor in stepBars[] (m1 bars in tick mode,
  // user-TF bars in bar mode). Used by step ±1.
  const replayIndex =
    isReplayActive && stepBars.length > 0
      ? stepBars.findIndex((b) => b.time === (replayTime as number))
      : -1;
  const canStepBack = replayIndex > 0;
  const canStepForward = replayIndex >= 0 && replayIndex < stepBars.length - 1;

  const stepReplay = (delta: 1 | -1) => {
    if (replayIndex < 0) return;
    const next = replayIndex + delta;
    if (next < 0 || next >= stepBars.length) return;
    setReplayTime(stepBars[next].time);
  };

  // Entering replay puts the chart in picking mode — the user moves the
  // mouse over the chart and clicks to commit the anchor. Matches the
  // TradingView UX where the line tracks the cursor before commit.
  const enterReplay = () => {
    if (bars.length === 0) return;
    setReplayPicking(true);
    setReplayPlayDir(null);
  };

  const exitReplay = () => {
    setReplayTime(null);
    setReplayPlayDir(null);
    setReplayPicking(false);
    setReplayBarPos(null);
  };

  // Toggle play in a direction; clicking the active direction pauses,
  // clicking the inactive one switches direction.
  const togglePlay = (dir: 'forward' | 'backward') => {
    setReplayPlayDir((curr) => (curr === dir ? null : dir));
  };

  // Drag handler for the replay control bar. Bound to onMouseDown on the
  // bar; ignores drags that originate inside a button or select trigger
  // (so the controls stay clickable). Clamps the resulting position to
  // the bounds of the chart container (offsetParent).
  const onReplayBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="combobox"], [role="listbox"]')) return;
    const bar = replayBarRef.current;
    if (!bar) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = bar.offsetLeft;
    const startTop = bar.offsetTop;
    const container = bar.offsetParent as HTMLElement | null;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let nextLeft = startLeft + dx;
      let nextTop = startTop + dy;
      if (container) {
        const maxLeft = container.clientWidth - bar.offsetWidth;
        const maxTop = container.clientHeight - bar.offsetHeight;
        nextLeft = Math.max(0, Math.min(maxLeft, nextLeft));
        nextTop = Math.max(0, Math.min(maxTop, nextTop));
      }
      setReplayBarPos({ x: nextLeft, y: nextTop });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div ref={fullscreenRootRef} className="flex flex-col h-dvh w-full bg-slate-50 dark:bg-slate-950">
      {/* Top toolbar — TradingView-style flat strip: strategy left, picker
          centered, indicators right. `relative z-20` keeps the indicators
          dropdown above the chart panel below. */}
      <div className="relative z-20 flex items-center gap-2 px-2 py-1.5 border-b border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-900">
        <Link
          href={`/strategy/${encodeURIComponent(strategyName)}`}
          className="flex items-center gap-1.5 px-2 h-8 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Back to ${strategyName}`}
        >
          <ChartCandlestick className="h-4 w-4" />
          <span className="text-sm font-semibold whitespace-nowrap max-w-[220px] truncate">
            {strategyName}
          </span>
        </Link>

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <SymbolPicker value={picker} onChange={handlePickerChange} disabled={ohlcQuery.isFetching} />

        <div className="ml-auto flex items-center gap-1">
          {/* Indicators dropdown */}
          <div ref={indicatorMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIndicatorMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={indicatorMenuOpen}
              className="inline-flex items-center gap-1.5 h-8 px-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LineChart className="h-4 w-4" />
              <span className="hidden sm:inline">Indicators</span>
              {activeIndicators.size > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-semibold h-4 min-w-4 px-1">
                  {activeIndicators.size}
                </span>
              )}
            </button>
          {indicatorMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-xl z-30 p-2"
            >
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Built-in
              </div>
              <button
                type="button"
                onClick={() => setShowVolume((v) => !v)}
                role="menuitemcheckbox"
                aria-checked={showVolume}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
              >
                <span className={`inline-flex items-center justify-center h-4 w-4 rounded border ${showVolume ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                  {showVolume && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1">Volume</span>
              </button>
              <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Moving Averages
              </div>
              {INDICATORS.filter((i) => i.category === 'MA').map((ind) => {
                const checked = activeIndicators.has(ind.id);
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => toggleIndicator(ind.id)}
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                  >
                    <span className={`inline-flex items-center justify-center h-4 w-4 rounded border ${checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1">{ind.label}</span>
                  </button>
                );
              })}
              <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Bands
              </div>
              {INDICATORS.filter((i) => i.category === 'Bands').map((ind) => {
                const checked = activeIndicators.has(ind.id);
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => toggleIndicator(ind.id)}
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                  >
                    <span className={`inline-flex items-center justify-center h-4 w-4 rounded border ${checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1">{ind.label}</span>
                  </button>
                );
              })}
              {activeIndicators.size > 0 && (
                <div className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActiveIndicators(new Set())}
                    className="w-full px-2 py-1.5 rounded-md text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer text-left"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mx-3 mt-3 rounded-xl border border-rose-300/60 dark:border-rose-700/40 bg-rose-50/70 dark:bg-rose-950/20 p-3 text-sm text-rose-800 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Chart + trade panel fill the remaining viewport height */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 p-3 min-h-0 items-stretch">
        <div className="relative rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xl overflow-hidden min-h-0">
          {ohlcQuery.isFetching && (
            <div className="absolute top-3 right-3 z-10 rounded-full bg-slate-900/70 dark:bg-slate-200/90 px-3 py-1 text-[11px] font-medium text-white dark:text-slate-900 shadow">
              Loading…
            </div>
          )}
          <BacktestChart
            ref={chartHandleRef}
            bars={displayBars}
            entryPrice={placement.entryPrice}
            slPrice={placement.slPrice}
            tpPrice={placement.tpPrice}
            onChartClick={handleChartClick}
            dateMode={dateMode}
            replayPicking={replayPicking}
            countdownLabel={countdownLabel}
            lineSeries={indicatorLineSeries}
            showVolume={showVolume}
            className="h-full w-full"
          />
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 backdrop-blur-md shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            {!isReplayActive && !replayPicking && bars.length > 0 && (
              <button
                type="button"
                onClick={enterReplay}
                aria-label="Start replay"
                title="Replay — pick a bar to scrub back to"
                className="inline-flex h-9 items-center gap-1.5 px-3 rounded-lg border border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 backdrop-blur-md shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-sm font-medium"
              >
                <Rewind className="h-4 w-4" />
                Replay
              </button>
            )}
            {replayPicking && (
              <button
                type="button"
                onClick={() => setReplayPicking(false)}
                aria-label="Cancel replay picking"
                title="Cancel"
                className="inline-flex h-9 items-center gap-1.5 px-3 rounded-lg border border-blue-300 dark:border-blue-700/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 backdrop-blur-md shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer text-sm font-medium"
              >
                Click a bar… (Esc to cancel)
              </button>
            )}
          </div>

          {/* Active replay control bar — TradingView-style. Defaults to
              bottom-center, draggable to any position within the chart
              panel. Background/borders carry the drag handle; clicks on
              buttons or the select pass through normally. */}
          {isReplayActive && (
            <div
              ref={replayBarRef}
              onMouseDown={onReplayBarMouseDown}
              style={
                replayBarPos
                  ? { left: replayBarPos.x, top: replayBarPos.y }
                  : undefined
              }
              className={
                'absolute z-10 flex items-center gap-0.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md shadow-lg px-1.5 py-1 select-none cursor-grab active:cursor-grabbing ' +
                (replayBarPos ? '' : 'bottom-3 left-1/2 -translate-x-1/2')
              }
            >
              {/* Step back */}
              <button
                type="button"
                onClick={() => stepReplay(-1)}
                disabled={!canStepBack}
                aria-label="Step back one bar"
                title="Step back (←)"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              {/* Play backward */}
              <button
                type="button"
                onClick={() => togglePlay('backward')}
                disabled={!canStepBack && replayPlayDir !== 'backward'}
                aria-label={replayPlayDir === 'backward' ? 'Pause' : 'Play backward'}
                title={replayPlayDir === 'backward' ? 'Pause' : 'Play backward'}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                  replayPlayDir === 'backward'
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {replayPlayDir === 'backward' ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 rotate-180" />
                )}
              </button>
              {/* Play forward */}
              <button
                type="button"
                onClick={() => togglePlay('forward')}
                disabled={!canStepForward && replayPlayDir !== 'forward'}
                aria-label={replayPlayDir === 'forward' ? 'Pause' : 'Play forward'}
                title={replayPlayDir === 'forward' ? 'Pause (Space)' : 'Play forward (Space)'}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                  replayPlayDir === 'forward'
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {replayPlayDir === 'forward' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              {/* Step forward */}
              <button
                type="button"
                onClick={() => stepReplay(1)}
                disabled={!canStepForward}
                aria-label="Step forward one bar"
                title="Step forward (→)"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              {/* Tick mode toggle — sub-bar replay using underlying m1 data
                  to build the in-progress candle (TradingView / FX Replay
                  style). Hidden when already on m1 since it'd be a no-op. */}
              {picker.timeframe !== 'm1' && (
                <button
                  type="button"
                  onClick={() => setTickMode((v) => !v)}
                  aria-pressed={tickMode}
                  title={
                    tickMode
                      ? (m1Query.isFetching && m1Bars.length === 0
                          ? 'Loading m1 data…'
                          : 'Tick replay (sub-bar). Click to disable.')
                      : 'Enable tick replay — step second-by-second through bars'
                  }
                  className={`inline-flex h-8 items-center gap-1 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    tickMode
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Tick
                  {tickMode && m1Query.isFetching && m1Bars.length === 0 && (
                    <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
                  )}
                </button>
              )}
              <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              {/* Speed selector */}
              <Select
                value={String(replaySpeed)}
                onValueChange={(v) => setReplaySpeed(Number(v))}
              >
                <SelectTrigger
                  aria-label="Replay speed"
                  title="Playback speed"
                  className="h-8 w-auto min-w-0 gap-1 px-2 border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 focus-visible:ring-0 focus:ring-offset-0"
                >
                  <SelectValue>{replaySpeed}x</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {[0.5, 1, 2, 5, 10].map((s) => (
                    <SelectItem key={s} value={String(s)} className="cursor-pointer">
                      {s}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button
                type="button"
                onClick={exitReplay}
                aria-label="Exit replay"
                title="Exit replay (Esc)"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          {!ohlcQuery.isFetching && bars.length === 0 && !errorMessage && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No bars returned for this range.
              </p>
            </div>
          )}
        </div>

        <TradePlacementOverlay
          state={placement}
          onChange={setPlacement}
          balance={accountBalance}
          currencySymbol={currencySymbol}
        />
      </div>

      {/*
        Attribution. Required by the Dukascopy data provider as a condition of
        free commercial use — confirmed by email from Dukascopy on 2026-04-29.
        Do not remove.
      */}
      <p className="px-3 pb-2 text-[11px] text-slate-500 dark:text-slate-400">
        Historical price data provided by{' '}
        <a
          href="https://www.dukascopy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200"
        >
          Dukascopy Bank SA
        </a>
        .
      </p>
    </div>
  );
}
