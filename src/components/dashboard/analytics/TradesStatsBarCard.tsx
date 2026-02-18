'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar as ReBar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';

// Generic shape for each bar/category
export interface TradeStatDatum {
  category: string;        // label shown on X axis
  totalTrades?: number;    // optional "(x trades)" info
  wins?: number;
  losses?: number;
  beWins?: number;
  beLosses?: number;
  winRate?: number;        // 0–100
  winRateWithBE?: number;  // 0–100
  value?: number;          // generic value (e.g. SL size)
  // Flexible for chart data that does not supply all above (e.g. just `category` and `value`)
}

type Mode = 'winsLossesWinRate' | 'singleValue';

interface TradeStatsBarCardProps {
  title: string;
  description: string;
  data: TradeStatDatum[];
  mode?: Mode;
  /** used only when mode === 'singleValue' */
  valueKey?: keyof TradeStatDatum;
  /** label for the value in tooltip when mode === 'singleValue' (default: "Value:") */
  valueLabel?: string;
  /** tailwind height for the chart container (default h-80; ignored) */
  heightClassName?: string;
  /** When true, data is still loading; show loading animation instead of "No trades found" */
  isLoading?: boolean;
}

export function TradeStatsBarCard({
  title,
  description,
  data,
  mode = 'winsLossesWinRate',
  valueKey = 'value',
  valueLabel = 'Value:',
  heightClassName, // ignored for height consistency
  isLoading: externalLoading,
}: TradeStatsBarCardProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenData, setHasSeenData] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for dark mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Track if we've seen data with actual content
    if (data && data.length > 0) {
      const hasContent = mode === 'winsLossesWinRate'
        ? data.some((d) => 
            (d.totalTrades ?? 0) > 0 ||
            (d.wins ?? 0) > 0 ||
            (d.losses ?? 0) > 0 ||
            (d.beWins ?? 0) > 0 ||
            (d.beLosses ?? 0) > 0
          )
        : mode === 'singleValue'
        ? data.some((d) => 
            d[valueKey] !== undefined &&
            d[valueKey] !== null &&
            !isNaN(Number(d[valueKey])) &&
            isFinite(Number(d[valueKey]))
          )
        : false;
      
      if (hasContent) {
        setHasSeenData(true);
      }
    }
  }, [data, mode, valueKey]);

  useEffect(() => {
    // Keep loading until external loading is complete and minimum time has passed
    if (mounted) {
      // If external loading is provided, use it
      if (externalLoading !== undefined) {
        if (externalLoading) {
          // Still loading externally - keep showing animation
          setIsLoading(true);
        } else {
          // External loading is complete, wait minimum time then stop loading
          // If we haven't seen data yet, wait a bit longer to allow data to arrive
          const delay = hasSeenData ? 600 : 1200;
          const timer = setTimeout(() => {
            setIsLoading(false);
          }, delay);
          return () => clearTimeout(timer);
        }
      } else {
        // No external loading prop - use internal timer
        // Always wait at least 1000ms to ensure loading shows
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
      }
    } else {
      // Not mounted yet - ensure loading state is true
      setIsLoading(true);
    }
  }, [mounted, externalLoading, hasSeenData]);

  // Dynamic colors based on dark mode
  const slate500 = isDark ? '#94a3b8' : '#64748b'; // slate-400 in dark, slate-500 in light
  const axisTextColor = isDark ? '#cbd5e1' : '#64748b'; // slate-300 in dark, slate-500 in light

  // Helper to sanitize title for use in gradient IDs (remove special characters)
  const sanitizeTitleForId = (text: string) => {
    return text.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
  };

  // --- Calculate onlyZero (only when not loading) ---------------------------
  // Don't show "No trades" if we're still loading (either internal or external)
  // Show loading if: not mounted yet, or internal loading state is true, or external loading is explicitly true
  const isStillLoading = !mounted || isLoading || externalLoading === true;
  const onlyZero = !isStillLoading && (!data || data.length === 0 ||
    (
      mode === 'winsLossesWinRate'
        ? data.every(
            (d) =>
              (d.totalTrades ?? 0) === 0 &&
              (d.wins ?? 0) === 0 &&
              (d.losses ?? 0) === 0 &&
              (d.beWins ?? 0) === 0 &&
              (d.beLosses ?? 0) === 0
          )
        : mode === 'singleValue'
        ? data.every(
            (d) =>
              d[valueKey] === undefined ||
              d[valueKey] === null ||
              isNaN(Number(d[valueKey])) ||
              !isFinite(Number(d[valueKey]))
          )
        : true
    ));

  // --- Common helpers -------------------------------------------------------

  const withTotals: TradeStatDatum[] = (data || []).map((d) => ({
    ...d,
    totalTrades:
      d.totalTrades ?? (((d.wins ?? 0) + (d.losses ?? 0)) || undefined),
  }));

  const maxWinsLosses =
    mode === 'winsLossesWinRate'
      ? Math.max(
          ...withTotals.map((d) => Math.max(d.wins ?? 0, d.losses ?? 0)),
          1,
        )
      : Math.max(
          ...withTotals.map((d) => Number(d[valueKey] ?? 0)),
          1,
        );

  const yAxisTickFormatter = (value: number) =>
    Number(value ?? 0).toLocaleString('en-US', {
      maximumFractionDigits: mode === 'singleValue' ? 2 : 0,
    });

  // --- Tooltip renderers ----------------------------------------------------

  const StatsTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const d = payload[0].payload as TradeStatDatum;

    if (mode === 'singleValue') {
      const v = Number(d[valueKey] ?? 0);
      // Display as integer if it's a whole number, otherwise show 2 decimal places
      const displayValue = Number.isInteger(v) ? v.toString() : v.toFixed(2);
      return (
        <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            {d.category}
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{valueLabel}</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {displayValue}
            </span>
          </div>
        </div>
      );
    }

    const wins = d.wins ?? 0;
    const losses = d.losses ?? 0;
    const beWins = d.beWins ?? 0;
    const beLosses = d.beLosses ?? 0;
    const winRate = d.winRate ?? 0;
    const winRateWithBE = d.winRateWithBE ?? d.winRate ?? 0;
    const totalTrades = d.totalTrades ?? ((wins + losses) || undefined);

    return (
      <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          {d.category} {typeof totalTrades === 'number' ? `(${totalTrades} trade${totalTrades === 1 ? '' : 's'})` : ''}
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Wins:</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {wins} {beWins > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({beWins} BE)</span>}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Losses:</span>
            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
              {losses} {beLosses > 0 && <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({beLosses} BE)</span>}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate:</span>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              {winRate.toFixed(2)}%
            </div>
          </div>
          {d.winRateWithBE !== undefined && (
            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Win Rate (w/ BE):</span>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                {winRateWithBE.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- X axis tick with (n) count like MonthlyPerformanceChart ----
  const renderXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const d = withTotals[payload?.index ?? 0];
    if (!d) return null;

    // Always show (n) for count, just like the referenced chart
    const label = typeof d.totalTrades === 'number'
      ? `${d.category} (${d.totalTrades})`
      : d.category;

    return (
      <text
        x={x}
        y={y}
        dy={16}
        textAnchor="middle"
        fill={axisTextColor}
        fontSize={12}
      >
        {label}
      </text>
    );
  };

  // --- Render (use identical height + structure as MonthlyPerformanceChart) ---

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
          {title}
        </CardTitle>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex items-center">
        <div className="w-full h-full">
          {isStillLoading ? (
            <div className="flex items-center justify-center w-full h-full min-h-[180px]">
              <BouncePulse size="md" />
            </div>
          ) : onlyZero ? (
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                There are no trades to display for this category yet. Start trading to see your statistics here!
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={withTotals}
              layout="horizontal"
              margin={{ top: 10, right: 24, left: 16, bottom: 48 }}
              barCategoryGap="30%"
            >
              <defs>
                {/* Modern wins gradient - emerald to teal (same as MonthlyPerformanceChart) */}
                <linearGradient id={`winsGradient-${sanitizeTitleForId(title)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0.9} />
                </linearGradient>
                {/* Modern losses gradient - rose to red (same as MonthlyPerformanceChart) */}
                <linearGradient id={`lossesGradient-${sanitizeTitleForId(title)}`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                  <stop offset="50%" stopColor="#fb7185" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#fda4af" stopOpacity={0.9} />
                </linearGradient>
                {/* Win rate gradient - amber to orange */}
                <linearGradient id={`winRateGradient-${sanitizeTitleForId(title)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="50%" stopColor="#f97316" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
                </linearGradient>
                {/* Single value gradient - blue to cyan (modern and vibrant) */}
                <linearGradient id={`valueGradient-${sanitizeTitleForId(title)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              
              <XAxis
                dataKey="category"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={renderXAxisTick as (props: any) => React.ReactElement<SVGElement>}
              />
              <YAxis
                type="number"
                tick={{ fill: axisTextColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisTickFormatter}
                domain={[0, Math.ceil(maxWinsLosses * 1.12)]}
                label={
                  mode === 'singleValue' 
                    ? undefined 
                    : {
                        value: 'Wins / Losses',
                        angle: -90,
                        position: 'middle',
                        fill: axisTextColor,
                        fontSize: 13,
                        fontWeight: 500,
                        dy: -10,
                      }
                }
              />

              {/* hidden secondary axis so winRate doesn't affect scaling */}
              {mode === 'winsLossesWinRate' && (
                <YAxis yAxisId={1} hide domain={[0, 100]} />
              )}

              <ReTooltip
                contentStyle={{ 
                  background: isDark 
                    ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)' 
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
                  backdropFilter: 'blur(16px)',
                  border: isDark 
                    ? '1px solid rgba(51, 65, 85, 0.6)' 
                    : '1px solid rgba(148, 163, 184, 0.2)', 
                  borderRadius: '16px', 
                  padding: '14px 18px', 
                  color: isDark ? '#e2e8f0' : '#1e293b', 
                  fontSize: 14,
                  boxShadow: isDark
                    ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                    : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  minWidth: '160px'
                }}
                wrapperStyle={{ 
                  outline: 'none',
                  zIndex: 1000
                }}
                cursor={{ 
                  fill: 'transparent', 
                  radius: 8,
                }}
                content={<StatsTooltip />}
              />

              {mode === 'winsLossesWinRate' ? (
                <>
                  <ReBar
                    dataKey="wins"
                    name="Wins"
                    fill={`url(#winsGradient-${sanitizeTitleForId(title)})`}
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <ReBar
                    dataKey="losses"
                    name="Losses"
                    fill={`url(#lossesGradient-${sanitizeTitleForId(title)})`}
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <ReBar
                    dataKey="winRate"
                    name="Win Rate"
                    fill={`url(#winRateGradient-${sanitizeTitleForId(title)})`}
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                    yAxisId={1}
                  />
                </>
              ) : (
                <ReBar
                  dataKey={valueKey as string}
                  name="Value"
                  fill={`url(#valueGradient-${sanitizeTitleForId(title)})`}
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
