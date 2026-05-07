'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CrosshairMode,
  LineStyle,
  ColorType,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type Time,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type MouseEventParams,
} from 'lightweight-charts';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { OhlcBar } from '@/lib/marketData/types';
import type { LinePoint } from '@/lib/indicators';

/**
 * One indicator line drawn on the price pane. Caller pre-computes the
 * data; the chart manages create/update/remove via a stable `id` so
 * toggling indicators on/off doesn't recreate unrelated series.
 */
export interface ChartLineSeries {
  id: string;
  data: LinePoint[];
  color: string;
  lineWidth?: 1 | 2 | 3 | 4;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** Shown in the chart's series legend / hover tooltip. */
  title?: string;
}

export interface BacktestChartHandle {
  /** Recenter the time scale on the latest visible bar. */
  fitContent: () => void;
}

export interface BacktestChartClick {
  /** Bar timestamp under the cursor, in UNIX seconds. `null` if click landed in empty space. */
  time: number | null;
  /** Price under the cursor (mapped from Y-coordinate via the candle series). */
  price: number;
}

interface BacktestChartProps {
  bars: OhlcBar[];
  /** Entry price line (when set). */
  entryPrice?: number | null;
  /** Stop-loss price line (when set). */
  slPrice?: number | null;
  /** Take-profit price line (when set). */
  tpPrice?: number | null;
  /** Click handler — fires with bar time + Y-mapped price. */
  onChartClick?: (click: BacktestChartClick) => void;
  /** Tailwind className for the wrapping div (controls width/height). */
  className?: string;
  /**
   * How to render date/time labels. Defaults to `local`. Pass `utc` for
   * d1/w1/mn1 bars so the date axis follows each bar's UTC trading day
   * regardless of viewer timezone.
   */
  dateMode?: ChartDateMode;
  /**
   * "Picking" mode for replay: the user clicked Replay and is choosing
   * the anchor. While this is true, a preview line follows the crosshair
   * over the chart; the next click should commit the anchor (handled by
   * the caller in `onChartClick`). Anchor-time truncation of bars is
   * done by the caller before passing `bars`, so the chart itself does
   * not need to know the replay time after commit.
   */
  replayPicking?: boolean;
  /**
   * Optional countdown badge rendered on the right price axis, aligned
   * vertically with `price`. Used by tick-mode replay to show how much
   * "real time" remains before the in-progress bar closes
   * (e.g. "00:37:00 til close" on an h1 bar 23 minutes in).
   * `null` / `undefined` hides the badge.
   */
  countdownLabel?: { text: string; price: number } | null;
  /**
   * Indicator overlays (moving averages, Bollinger Bands, etc.) rendered
   * on the price pane. Diff'd by `id` — adding / removing entries only
   * touches the affected series, no full chart recreation.
   */
  lineSeries?: ChartLineSeries[];
  /**
   * Show the bottom volume histogram. Defaults to `true`. When `false`,
   * the volume series is hidden AND the bottom 25% margin reserved for
   * it on the price scale is reclaimed so candles fill the pane.
   */
  showVolume?: boolean;
}

// Tailwind palette references — kept inline so the chart canvas matches the
// rest of the analytics surface without pulling in the design tokens module.
// `*Faded` colors are used to render bars after the replay anchor: same hue,
// low alpha so they read as "future / not yet revealed" without disappearing.
const THEME_LIGHT = {
  background: '#ffffff',
  textColor: '#475569',          // slate-600
  gridColor: '#e2e8f0',           // slate-200
  borderColor: '#cbd5e1',         // slate-300
  upColor: '#16a34a',             // green-600
  downColor: '#dc2626',           // red-600
  upColorFaded: 'rgba(22,163,74,0.18)',
  downColorFaded: 'rgba(220,38,38,0.18)',
  volumeUp: 'rgba(22,163,74,0.4)',
  volumeDown: 'rgba(220,38,38,0.4)',
  volumeUpFaded: 'rgba(22,163,74,0.10)',
  volumeDownFaded: 'rgba(220,38,38,0.10)',
  entryColor: '#2563eb',          // blue-600
  slColor: '#dc2626',
  tpColor: '#16a34a',
};
const THEME_DARK = {
  background: 'transparent',      // lets parent themed-nav-overlay show through
  textColor: '#cbd5e1',           // slate-300
  gridColor: 'rgba(148,163,184,0.12)',
  borderColor: 'rgba(148,163,184,0.25)',
  upColor: '#22c55e',             // green-500
  downColor: '#ef4444',           // red-500
  upColorFaded: 'rgba(34,197,94,0.18)',
  downColorFaded: 'rgba(239,68,68,0.18)',
  volumeUp: 'rgba(34,197,94,0.35)',
  volumeDown: 'rgba(239,68,68,0.35)',
  volumeUpFaded: 'rgba(34,197,94,0.08)',
  volumeDownFaded: 'rgba(239,68,68,0.08)',
  entryColor: '#60a5fa',          // blue-400
  slColor: '#f87171',             // red-400
  tpColor: '#4ade80',             // green-400
};

/**
 * Date-label mode.
 *
 * `local` — render every label (date + time) in the browser's local
 * timezone. Default for intraday timeframes; matches TradingView's
 * "Local timezone" setting and feels right for hour-of-day reading.
 *
 * `utc` — render the date portion using `getUTC*`. Used for d1/w1/mn1
 * where each bar represents a UTC trading day; without this a NY user
 * (UTC−4/−5) would see a daily bar timestamped Apr 29 UTC labeled "28",
 * because UTC midnight = ~19–20:00 NY the previous day.
 */
export type ChartDateMode = 'local' | 'utc';

const pad2 = (n: number) => String(n).padStart(2, '0');

function formatTickMark(time: Time, tickMarkType: TickMarkType, mode: ChartDateMode): string {
  const d = new Date((time as number) * 1000);
  const utc = mode === 'utc';
  switch (tickMarkType) {
    case TickMarkType.Year:
      return String(utc ? d.getUTCFullYear() : d.getFullYear());
    case TickMarkType.Month:
      return d.toLocaleString(undefined, { month: 'short', timeZone: utc ? 'UTC' : undefined });
    case TickMarkType.DayOfMonth:
      return String(utc ? d.getUTCDate() : d.getDate());
    case TickMarkType.Time:
      return utc
        ? `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
        : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    case TickMarkType.TimeWithSeconds:
      return utc
        ? `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
        : `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    default:
      return d.toLocaleString();
  }
}

function formatCrosshairTime(time: Time, mode: ChartDateMode): string {
  const d = new Date((time as number) * 1000);
  const utc = mode === 'utc';
  const day = utc ? d.getUTCDate() : d.getDate();
  const month = d.toLocaleString(undefined, { month: 'short', timeZone: utc ? 'UTC' : undefined });
  const year = String(utc ? d.getUTCFullYear() : d.getFullYear()).slice(2);
  const hours = pad2(utc ? d.getUTCHours() : d.getHours());
  const minutes = pad2(utc ? d.getUTCMinutes() : d.getMinutes());
  return `${day} ${month} '${year}   ${hours}:${minutes}`;
}

function applyTheme(
  chart: IChartApi,
  candle: ISeriesApi<'Candlestick'>,
  volume: ISeriesApi<'Histogram'>,
  isDark: boolean,
) {
  const t = isDark ? THEME_DARK : THEME_LIGHT;
  chart.applyOptions({
    layout: {
      background: { type: ColorType.Solid, color: t.background },
      textColor: t.textColor,
    },
    grid: {
      vertLines: { color: t.gridColor },
      horzLines: { color: t.gridColor },
    },
    rightPriceScale: { borderColor: t.borderColor },
    timeScale: { borderColor: t.borderColor },
    crosshair: { mode: CrosshairMode.Normal },
  });
  candle.applyOptions({
    upColor: t.upColor,
    downColor: t.downColor,
    borderUpColor: t.upColor,
    borderDownColor: t.downColor,
    wickUpColor: t.upColor,
    wickDownColor: t.downColor,
  });
  // Volume colors are per-bar — re-styled via setData below; here we ensure
  // the histogram pane is themed.
  volume.applyOptions({});
}

/**
 * Refs-based wrapper around lightweight-charts. Strict invariants:
 *   - Chart instance is created ONCE per mount and stored in a ref.
 *   - Bars / theme / price-line updates are applied via the imperative API
 *     (`setData`, `applyOptions`, `IPriceLine.applyOptions`) — never by
 *     re-creating the chart on prop changes.
 *   - On unmount, `chart.remove()` is the ONLY cleanup needed; lightweight-
 *     charts disposes its series, listeners, and DOM nodes internally.
 */
export const BacktestChart = forwardRef<BacktestChartHandle, BacktestChartProps>(
  function BacktestChart(
    { bars, entryPrice = null, slPrice = null, tpPrice = null, onChartClick, className, dateMode = 'local', replayPicking = false, countdownLabel = null, lineSeries, showVolume = true },
    ref,
  ) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const replayLineRef = useRef<HTMLDivElement | null>(null);
    const pickingOverlayRef = useRef<HTMLDivElement | null>(null);
    const countdownBadgeRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
    const entryLineRef = useRef<IPriceLine | null>(null);
    const slLineRef = useRef<IPriceLine | null>(null);
    const tpLineRef = useRef<IPriceLine | null>(null);
    /** id → series, so toggling one indicator doesn't disturb the others. */
    const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
    // Latest-callback ref so subscribeClick's handler always sees the current
    // onChartClick without re-creating the chart. Sync inside an effect to
    // satisfy the React rule against ref writes during render.
    const onClickRef = useRef(onChartClick);
    useEffect(() => {
      onClickRef.current = onChartClick;
    }, [onChartClick]);

    // Latest-value ref for dateMode so the formatter callbacks (captured at
    // chart-creation time) read the current mode without us recreating the
    // chart on every timeframe switch.
    const dateModeRef = useRef<ChartDateMode>(dateMode);
    useEffect(() => {
      dateModeRef.current = dateMode;
      // Force the time scale to re-paint labels with the new formatter target.
      chartRef.current?.timeScale().applyOptions({});
    }, [dateMode]);

    const { mounted, isDark } = useDarkMode();

    // Init once. Never recreate.
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const chart = createChart(container, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: THEME_LIGHT.background },
          textColor: THEME_LIGHT.textColor,
          fontFamily:
            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        grid: {
          vertLines: { color: THEME_LIGHT.gridColor },
          horzLines: { color: THEME_LIGHT.gridColor },
        },
        rightPriceScale: {
          borderColor: THEME_LIGHT.borderColor,
          scaleMargins: { top: 0.08, bottom: 0.25 },
        },
        timeScale: {
          borderColor: THEME_LIGHT.borderColor,
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: Time, type: TickMarkType) =>
            formatTickMark(time, type, dateModeRef.current),
        },
        localization: {
          timeFormatter: (time: Time) => formatCrosshairTime(time, dateModeRef.current),
        },
        crosshair: { mode: CrosshairMode.Normal },
      });

      const candle = chart.addSeries(CandlestickSeries, {
        upColor: THEME_LIGHT.upColor,
        downColor: THEME_LIGHT.downColor,
        borderUpColor: THEME_LIGHT.upColor,
        borderDownColor: THEME_LIGHT.downColor,
        wickUpColor: THEME_LIGHT.upColor,
        wickDownColor: THEME_LIGHT.downColor,
      });

      const volume = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '', // overlay on its own invisible scale
      });
      volume.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      const handleClick = (param: MouseEventParams<Time>) => {
        const cb = onClickRef.current;
        if (!cb || !param.point) return;
        const price = candle.coordinateToPrice(param.point.y);
        if (price == null) return;
        const time =
          typeof param.time === 'number'
            ? (param.time as number)
            : null; // we use UNIX seconds, so this branch covers our setData input
        cb({ time, price: Number(price) });
      };
      chart.subscribeClick(handleClick);

      chartRef.current = chart;
      candleRef.current = candle;
      volumeRef.current = volume;

      // Snapshot for cleanup — refs may have been swapped before unmount.
      const indicatorMap = indicatorSeriesRef.current;

      return () => {
        chart.unsubscribeClick(handleClick);
        chart.remove();
        chartRef.current = null;
        candleRef.current = null;
        volumeRef.current = null;
        entryLineRef.current = null;
        slLineRef.current = null;
        tpLineRef.current = null;
        // chart.remove() disposes the series along with the chart, but we
        // also clear our id→series map so re-mount starts clean.
        indicatorMap.clear();
      };
    }, []);

    // Theme — applyOptions only, never recreate.
    useEffect(() => {
      const chart = chartRef.current;
      const candle = candleRef.current;
      const volume = volumeRef.current;
      if (!chart || !candle || !volume || !mounted) return;
      applyTheme(chart, candle, volume, isDark);
    }, [isDark, mounted]);

    // Bars — setData + recolor volume per up/down close. Future-bar
    // dimming during replay-picking is handled by a DOM overlay rather
    // than per-bar colors (cheaper than re-running setData on every
    // mousemove). After commit, the caller passes a truncated bars[] so
    // there's nothing to dim — the chart simply ends at the anchor.
    useEffect(() => {
      const candle = candleRef.current;
      const volume = volumeRef.current;
      if (!candle || !volume) return;

      const candleData: CandlestickData<Time>[] = bars.map((b) => ({
        time: b.time as Time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));
      const t = isDark ? THEME_DARK : THEME_LIGHT;
      const volumeData: HistogramData<Time>[] = bars.map((b) => ({
        time: b.time as Time,
        value: b.volume ?? 0,
        color: b.close >= b.open ? t.volumeUp : t.volumeDown,
      }));

      candle.setData(candleData);
      volume.setData(volumeData);
    }, [bars, isDark]);

    // Volume visibility — hide the histogram + reclaim the 25% bottom
    // margin reserved for it so candles fill the pane when volume is off.
    useEffect(() => {
      const chart = chartRef.current;
      const volume = volumeRef.current;
      if (!chart || !volume) return;
      volume.applyOptions({ visible: showVolume });
      chart.priceScale('right').applyOptions({
        scaleMargins: { top: 0.08, bottom: showVolume ? 0.25 : 0.05 },
      });
    }, [showVolume]);

    // Indicator overlays — diff by id: create/update existing, remove ids
    // no longer present. Toggling one indicator never recreates others.
    useEffect(() => {
      const chart = chartRef.current;
      if (!chart) return;
      const map = indicatorSeriesRef.current;
      const incomingIds = new Set((lineSeries ?? []).map((s) => s.id));

      // Remove series that are no longer requested.
      for (const [id, series] of map) {
        if (!incomingIds.has(id)) {
          chart.removeSeries(series);
          map.delete(id);
        }
      }

      // Create or update incoming series.
      for (const cfg of lineSeries ?? []) {
        const lineStyle =
          cfg.lineStyle === 'dashed'
            ? LineStyle.Dashed
            : cfg.lineStyle === 'dotted'
              ? LineStyle.Dotted
              : LineStyle.Solid;
        const data: LineData<Time>[] = cfg.data.map((p) => ({
          time: p.time as Time,
          value: p.value,
        }));
        let series = map.get(cfg.id);
        if (!series) {
          series = chart.addSeries(LineSeries, {
            color: cfg.color,
            lineWidth: cfg.lineWidth ?? 2,
            lineStyle,
            priceLineVisible: false,
            lastValueVisible: true,
            title: cfg.title,
          });
          map.set(cfg.id, series);
        } else {
          series.applyOptions({
            color: cfg.color,
            lineWidth: cfg.lineWidth ?? 2,
            lineStyle,
            title: cfg.title,
          });
        }
        series.setData(data);
      }
    }, [lineSeries]);

    // Entry / SL / TP price lines — create once each, then update via applyOptions.
    useEffect(() => {
      const candle = candleRef.current;
      if (!candle) return;
      const t = isDark ? THEME_DARK : THEME_LIGHT;

      // Entry
      if (entryPrice != null && Number.isFinite(entryPrice)) {
        if (!entryLineRef.current) {
          entryLineRef.current = candle.createPriceLine({
            price: entryPrice,
            color: t.entryColor,
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'Entry',
          });
        } else {
          entryLineRef.current.applyOptions({ price: entryPrice, color: t.entryColor });
        }
      } else if (entryLineRef.current) {
        candle.removePriceLine(entryLineRef.current);
        entryLineRef.current = null;
      }

      // SL
      if (slPrice != null && Number.isFinite(slPrice)) {
        if (!slLineRef.current) {
          slLineRef.current = candle.createPriceLine({
            price: slPrice,
            color: t.slColor,
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'SL',
          });
        } else {
          slLineRef.current.applyOptions({ price: slPrice, color: t.slColor });
        }
      } else if (slLineRef.current) {
        candle.removePriceLine(slLineRef.current);
        slLineRef.current = null;
      }

      // TP
      if (tpPrice != null && Number.isFinite(tpPrice)) {
        if (!tpLineRef.current) {
          tpLineRef.current = candle.createPriceLine({
            price: tpPrice,
            color: t.tpColor,
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'TP',
          });
        } else {
          tpLineRef.current.applyOptions({ price: tpPrice, color: t.tpColor });
        }
      } else if (tpLineRef.current) {
        candle.removePriceLine(tpLineRef.current);
        tpLineRef.current = null;
      }
    }, [entryPrice, slPrice, tpPrice, isDark]);

    // Countdown badge (tick-mode replay): a small pill rendered next to
    // the right price scale, vertically aligned with `countdownLabel.price`.
    // Repositions on visible-time-range change and on container resize.
    // Hidden when `countdownLabel` is null or the price is off-screen.
    useEffect(() => {
      const chart = chartRef.current;
      const candle = candleRef.current;
      const wrapper = wrapperRef.current;
      const badge = countdownBadgeRef.current;
      if (!chart || !candle || !wrapper || !badge) return;

      if (!countdownLabel) {
        badge.style.display = 'none';
        return;
      }

      const update = () => {
        const y = candle.priceToCoordinate(countdownLabel.price);
        if (y == null) {
          badge.style.display = 'none';
          return;
        }
        const priceScaleWidth = chart.priceScale('right').width();
        badge.style.display = 'block';
        badge.style.right = `${priceScaleWidth + 4}px`;
        badge.style.top = `${y}px`;
      };
      update();

      const tsUnsub = () => update();
      chart.timeScale().subscribeVisibleTimeRangeChange(tsUnsub);
      const ro = new ResizeObserver(update);
      ro.observe(wrapper);

      return () => {
        chart.timeScale().unsubscribeVisibleTimeRangeChange(tsUnsub);
        ro.disconnect();
      };
    }, [countdownLabel]);

    // Replay line + dim overlay, picking mode — both follow the crosshair
    // so the user can see exactly which bar the click will commit to and
    // preview which bars (to the right of the line) will be hidden once
    // they click. Snaps to bar times (param.time is already snapped).
    useEffect(() => {
      if (!replayPicking) return;
      const chart = chartRef.current;
      const lineEl = replayLineRef.current;
      const overlayEl = pickingOverlayRef.current;
      if (!chart || !lineEl || !overlayEl) return;

      const hide = () => {
        lineEl.style.display = 'none';
        overlayEl.style.display = 'none';
      };

      const onMove = (param: MouseEventParams<Time>) => {
        if (param.time == null) {
          hide();
          return;
        }
        const x = chart.timeScale().timeToCoordinate(param.time);
        if (x == null) {
          hide();
          return;
        }
        // Stop the overlay short of the right price scale so its labels
        // stay readable through the dim — looks correct at any zoom.
        const priceScaleWidth = chart.priceScale('right').width();
        lineEl.style.display = 'block';
        lineEl.style.left = `${x}px`;
        overlayEl.style.display = 'block';
        overlayEl.style.left = `${x}px`;
        overlayEl.style.right = `${priceScaleWidth}px`;
      };
      chart.subscribeCrosshairMove(onMove);
      return () => {
        chart.unsubscribeCrosshairMove(onMove);
        hide();
      };
    }, [replayPicking]);

    useImperativeHandle(
      ref,
      () => ({
        fitContent: () => chartRef.current?.timeScale().fitContent(),
      }),
      [],
    );

    return (
      <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
        <div ref={containerRef} className="absolute inset-0" />
        {/* Dim overlay shown only during replay-picking. Sits below the
            line (z-[5] vs z-10) and stops short of the right price scale
            via the picking effect setting `right` dynamically. */}
        <div
          ref={pickingOverlayRef}
          className="absolute top-0 bottom-0 z-[5] pointer-events-none bg-slate-200/55 dark:bg-slate-950/55"
          style={{ display: 'none', left: 0, right: 0 }}
          aria-hidden="true"
        />
        <div
          ref={replayLineRef}
          className="absolute top-0 bottom-0 z-10 pointer-events-none"
          style={{ display: 'none', width: 0, borderLeft: '2px dashed rgb(59 130 246 / 0.85)' }}
          aria-hidden="true"
        >
          <div className="absolute top-2 left-0 -translate-x-1/2 rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap shadow">
            Replay
          </div>
        </div>
        {/* Countdown pill aligned with the in-progress candle's close on
            the right axis. Positioned by the effect above. */}
        <div
          ref={countdownBadgeRef}
          className="absolute z-10 pointer-events-none -translate-y-1/2 rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums whitespace-nowrap shadow"
          style={{ display: 'none' }}
          aria-hidden="true"
        >
          {countdownLabel?.text}
        </div>
      </div>
    );
  },
);
