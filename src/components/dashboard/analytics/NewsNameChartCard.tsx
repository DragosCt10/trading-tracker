'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { calculateNewsNameStats, NEWS_NO_EVENT_LABEL } from '@/utils/calculateCategoryStats';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useBECalc } from '@/contexts/BECalcContext';
import { buildPreviewTrade } from '@/utils/previewTrades';
import { ComposedBarWinRateChart, type BarWinRateChartDatum } from './ComposedBarWinRateChart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
export interface NewsNameChartCardProps {
  trades: Trade[];
  isLoading?: boolean;
  isPro?: boolean;
  headerAction?: ReactNode;
  bodyVisible?: boolean;
}

type IntensityFilter = null | 1 | 2 | 3;

const INTENSITY_OPTIONS: { value: IntensityFilter; label: string }[] = [
  { value: null,  label: 'All'    },
  { value: 1,     label: 'Low'    },
  { value: 2,     label: 'Medium' },
  { value: 3,     label: 'High'   },
];

interface ChartDatum {
  newsName: string;
  category: string;
  wins: number;
  losses: number;
  breakEven: number;
  totalTrades: number;
  winRate: number;
  winRateWithBE: number;
}

/** Card className matching DayStatisticsCard (including shadow); taller on responsive */
const CARD_CLASS =
  'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-[32rem] sm:h-96 flex flex-col';

const FILTER_BTN_ACTIVE =
  'themed-btn-primary text-white font-semibold shadow-md border-0';
const FILTER_BTN_INACTIVE =
  'border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium';
const LOCKED_CARD_TOOLTIP_TEXT = 'The data shown under the blur card is fictive and for demo purposes only.';
const LOCKED_CARD_TOOLTIP_CLASS =
  'max-w-sm text-xs rounded-2xl p-3 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/90 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50';


export const NewsNameChartCard: React.FC<NewsNameChartCardProps> = React.memo(
  function NewsNameChartCard({
    trades: rawTrades,
    isLoading: externalLoading,
    isPro,
    headerAction,
    bodyVisible = true,
  }) {
    const { mounted, isDark } = useDarkMode();
    const { beCalcEnabled } = useBECalc();
    const [isLoading, setIsLoading]         = useState(true);
    const [intensityFilter, setIntensityFilter] = useState<IntensityFilter>(null);
    const [unnamedOnly, setUnnamedOnly]     = useState(false);
    const isLocked = !isPro;

    const previewTrades = useMemo<Trade[]>(
      () => [
        buildPreviewTrade({
          id: 'preview-news-cpi-win',
          news_related: true,
          news_name: 'CPI',
          news_intensity: 1,
          break_even: false,
          trade_outcome: 'Win',
        }),
        buildPreviewTrade({
          id: 'preview-news-cpi-loss',
          news_related: true,
          news_name: 'CPI',
          news_intensity: 1,
          break_even: false,
          trade_outcome: 'Lose',
        }),
        buildPreviewTrade({
          id: 'preview-news-gdp-win',
          news_related: true,
          news_name: 'GDP',
          news_intensity: 2,
          break_even: false,
          trade_outcome: 'Win',
        }),
        buildPreviewTrade({
          id: 'preview-news-gdp-be',
          news_related: true,
          news_name: 'GDP',
          news_intensity: 2,
          break_even: true,
          trade_outcome: 'Lose',
        }),
        buildPreviewTrade({
          id: 'preview-news-nfp-loss',
          news_related: true,
          news_name: 'NFP',
          news_intensity: 3,
          break_even: false,
          trade_outcome: 'Lose',
        }),
        buildPreviewTrade({
          id: 'preview-news-nfp-win',
          news_related: true,
          news_name: 'NFP',
          news_intensity: 3,
          break_even: false,
          trade_outcome: 'Win',
        }),
        buildPreviewTrade({
          id: 'preview-news-unnamed-win',
          news_related: true,
          news_name: '',
          news_intensity: 2,
          break_even: false,
          trade_outcome: 'Win',
        }),
      ],
      []
    );

    useEffect(() => {
      if (externalLoading !== undefined) {
        if (externalLoading) {
          const timer = setTimeout(() => setIsLoading(true), 0);
          return () => clearTimeout(timer);
        } else {
          const timer = setTimeout(() => setIsLoading(false), 400);
          return () => clearTimeout(timer);
        }
      } else {
        const timer = setTimeout(() => setIsLoading(false), 400);
        return () => clearTimeout(timer);
      }
    }, [externalLoading]);

    const filteredTrades = useMemo(() => {
      const trades = isLocked ? previewTrades : rawTrades;
      if (unnamedOnly) return trades;
      if (intensityFilter === null) return trades;
      return trades.filter((t) => t.news_intensity === intensityFilter);
    }, [isLocked, previewTrades, rawTrades, intensityFilter, unnamedOnly]);

    const stats     = useMemo(
      () => calculateNewsNameStats(filteredTrades, { includeUnnamed: true }),
      [filteredTrades]
    );
    const chartData = useMemo<ChartDatum[]>(() => {
      const rows = stats.map((s) => ({
        newsName:      s.newsName,
        category:      s.newsName,
        wins:          s.wins,
        losses:        s.losses,
        breakEven:     s.breakEven,
        totalTrades:   s.total,
        winRate:       s.winRate,
        winRateWithBE: s.winRateWithBE,
      }));
      if (unnamedOnly) {
        return rows.filter((d) => d.newsName === NEWS_NO_EVENT_LABEL);
      }
      // "All" = by event only (exclude unnamed)
      return rows.filter((d) => d.newsName !== NEWS_NO_EVENT_LABEL);
    }, [stats, unnamedOnly]);

    const hasData  = chartData.length > 0;
    const wrapLockedCard = (card: React.ReactElement) => {
      if (!isLocked) {
        return card;
      }

      return (
        <TooltipProvider>
          <Tooltip delayDuration={120}>
            <TooltipTrigger asChild>{card}</TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              sideOffset={8}
              className={LOCKED_CARD_TOOLTIP_CLASS}
            >
              {LOCKED_CARD_TOOLTIP_TEXT}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    };

    /* ------------------------------------------------------------------ */
    /* Tooltip                                                              */
    /* ------------------------------------------------------------------ */

    /* ------------------------------------------------------------------ */
    /* Shared header (filter always visible)                               */
    /* ------------------------------------------------------------------ */
    const header = (
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2 flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              News Stats
            </CardTitle>
          </div>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Wins, losses and BE per news event
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto sm:flex-shrink-0 pt-0 sm:pt-0.5">
          {/* Show filter — match TradeFiltersBar active style */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 shrink-0">Show</span>
            <Button
              type="button"
              variant={!unnamedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUnnamedOnly(false)}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 relative overflow-hidden group focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-transparent',
                !unnamedOnly ? FILTER_BTN_ACTIVE : FILTER_BTN_INACTIVE
              )}
            >
              <span className="relative z-10">By event</span>
              {!unnamedOnly && (
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              )}
            </Button>
            <Button
              type="button"
              variant={unnamedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUnnamedOnly(true)}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 relative overflow-hidden group focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-transparent',
                unnamedOnly ? FILTER_BTN_ACTIVE : FILTER_BTN_INACTIVE
              )}
            >
              <span className="relative z-10">Unnamed news</span>
              {unnamedOnly && (
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              )}
            </Button>
          </div>
          {/* Intensity filter — same active style; disabled when Unnamed news */}
          <div
            className={cn(
              'flex items-center gap-2 flex-wrap',
              unnamedOnly && 'opacity-50 pointer-events-none'
            )}
            aria-disabled={unnamedOnly}
          >
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 shrink-0">Intensity</span>
            {INTENSITY_OPTIONS.map((opt) => {
              const isActive = intensityFilter === opt.value;
              return (
                <Button
                  key={String(opt.value)}
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  disabled={unnamedOnly}
                  onClick={() => !unnamedOnly && setIntensityFilter(opt.value)}
                  className={cn(
                    'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 relative overflow-hidden group focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-transparent',
                    isActive ? FILTER_BTN_ACTIVE : FILTER_BTN_INACTIVE,
                    unnamedOnly && 'cursor-not-allowed'
                  )}
                >
                  <span className="relative z-10">{opt.label}</span>
                  {isActive && (
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  )}
                </Button>
              );
            })}
          </div>
          {/* PRO hide/expand — inline after filters so it does not overlap Intensity buttons */}
          {headerAction != null ? (
            <>
              <div
                className="h-5 w-px shrink-0 self-center bg-slate-200/90 dark:bg-slate-600/80"
                aria-hidden
              />
              <div className="flex items-center shrink-0">{headerAction}</div>
            </>
          ) : null}
        </div>
      </CardHeader>
    );

    /* ------------------------------------------------------------------ */
    /* Loading                                                              */
    /* ------------------------------------------------------------------ */
    if (!mounted || isLoading) {
      return wrapLockedCard(
        <Card className={cn(CARD_CLASS, !bodyVisible && '!h-auto min-h-0')}>
          {isLocked && (
            <span className="absolute right-3 top-3 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
              <Crown className="w-3 h-3" /> PRO
            </span>
          )}

          {isLocked && (
            <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
          )}

          <div
            className={cn(
              'relative z-0 flex flex-col h-full',
              isLocked && 'blur-[3px] opacity-70 pointer-events-none select-none'
            )}
          >
            {header}
            {bodyVisible ? (
              <CardContent className="flex-1 flex justify-center items-center">
                <BouncePulse size="md" />
              </CardContent>
            ) : null}
          </div>
        </Card>
      );
    }

    /* ------------------------------------------------------------------ */
    /* Empty state                                                          */
    /* ------------------------------------------------------------------ */
    if (!hasData) {
      const activeLabel = INTENSITY_OPTIONS.find((o) => o.value === intensityFilter)?.label;
      return wrapLockedCard(
        <Card className={cn(CARD_CLASS, !bodyVisible && '!h-auto min-h-0')}>
          {isLocked && (
            <span className="absolute right-3 top-3 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
              <Crown className="w-3 h-3" /> PRO
            </span>
          )}

          {isLocked && (
            <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
          )}

          <div
            className={cn(
              'relative z-0 flex flex-col h-full',
              isLocked && 'blur-[3px] opacity-70 pointer-events-none select-none'
            )}
          >
            {header}
            {bodyVisible ? (
              <CardContent className="flex-1 flex flex-col items-center justify-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-1">
                  {unnamedOnly
                    ? 'No trades marked as news without an event name.'
                    : intensityFilter !== null
                      ? `No trades with ${activeLabel} intensity.`
                      : 'No news-related trades with a news name yet.'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
                  {unnamedOnly
                    ? 'Mark trades as News and leave the event name empty to see them here.'
                    : intensityFilter !== null
                      ? 'Try selecting a different intensity filter.'
                      : 'Mark trades as News and set the event name (e.g. CPI, NFP) to see the chart here.'}
                </p>
              </CardContent>
            ) : null}
          </div>
        </Card>
      );
    }

    /* ------------------------------------------------------------------ */
    /* Chart                                                                */
    /* ------------------------------------------------------------------ */
    return wrapLockedCard(
      <Card className={cn(CARD_CLASS, !bodyVisible && '!h-auto min-h-0')}>
        {isLocked && (
          <span className="absolute right-3 top-3 z-20 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            <Crown className="w-3 h-3" /> PRO
          </span>
        )}

        {isLocked && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-white/10 dark:bg-slate-950/10 backdrop-blur-[2px]" />
        )}

        <div
          className={cn(
            'relative z-0 flex flex-col h-full',
            isLocked && 'blur-[3px] opacity-70 pointer-events-none select-none'
          )}
        >
          {header}
          {bodyVisible ? (
            <CardContent className="flex-1 flex items-end mt-1 min-h-0 p-4 pt-4 sm:p-6 sm:pt-0 border-t border-slate-200/60 dark:border-slate-700/50 sm:border-t-0">
              <div className="w-full min-w-0 h-[280px] sm:h-[250px]">
                <ComposedBarWinRateChart
                  data={chartData as BarWinRateChartDatum[]}
                  xAxisDataKey="category"
                  xAxisTickFormatter={(value: string) => {
                    const item = chartData.find((d) => d.category === value);
                    return item ? `${value} (${item.totalTrades})` : value;
                  }}
                  tooltipHeaderGetter={(d) => String(d.newsName ?? '')}
                  isDark={isDark}
                  beCalcEnabled={beCalcEnabled}
                  idPrefix="newsName"
                  showArea={false}
                />
              </div>
            </CardContent>
          ) : null}
        </div>
      </Card>
    );
  }
);
