'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import TradeDetailsPanel from '@/components/TradeDetailsPanel';
import { TradeCard } from '@/components/trades/TradeCard';
import { Columns2, Eye, LayoutGrid, Loader2, PanelLeft } from 'lucide-react';

type CardViewMode = 'grid-4' | 'grid-2' | 'split';

export type TradeCardsViewProps = {
  trades: Trade[];
  /** show skeletons (in addition to initial client mount) */
  isLoading?: boolean;
  /** prevents pagination advance while fetching */
  isFetching?: boolean;
  /** reset pagination + selection when this changes */
  resetKey?: string | number;
  itemsPerLoad?: number;
  readOnly?: boolean;
  strategyName?: string;
  onTradeUpdated?: () => void | Promise<void>;
  emptyMessage?: string;
  initialViewMode?: CardViewMode;
  /**
   * Optional inline market filter rendered next to "Cards per row".
   * Useful for the public share page where we don't want the full filters bar.
   */
  marketFilter?: {
    selectedMarket: string;
    onSelectedMarketChange: (market: string) => void;
    markets: string[];
  };
};

export function TradeCardsView({
  trades,
  isLoading = false,
  isFetching = false,
  resetKey,
  itemsPerLoad = 12,
  readOnly = false,
  strategyName,
  onTradeUpdated,
  emptyMessage = 'No trades found for the selected period.',
  initialViewMode = 'grid-4',
  marketFilter,
}: TradeCardsViewProps) {
  const [mounted, setMounted] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(itemsPerLoad);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardViewMode, setCardViewMode] = useState<CardViewMode>(initialViewMode);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setDisplayedCount(itemsPerLoad);
    setSelectedTrade(null);
    setIsModalOpen(false);
  }, [resetKey, itemsPerLoad]);

  const displayedTrades = useMemo(
    () => trades.slice(0, displayedCount),
    [trades, displayedCount]
  );
  const hasMore = displayedCount < trades.length;

  const selectedTradeId = selectedTrade?.id ?? null;
  const liveSelectedTrade = useMemo(
    () => (selectedTradeId ? trades.find((t) => t.id === selectedTradeId) ?? null : null),
    [selectedTradeId, trades]
  );

  useEffect(() => {
    if (cardViewMode === 'split' && displayedTrades.length > 0 && !selectedTrade) {
      setSelectedTrade(displayedTrades[0]);
    }
  }, [cardViewMode, displayedTrades, selectedTrade]);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (!hasMore) return;
        if (isLoading || isFetching) return;
        setDisplayedCount((prev) => Math.min(prev + itemsPerLoad, trades.length));
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [mounted, hasMore, isLoading, isFetching, itemsPerLoad, trades.length]);

  const openModal = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedTrade(null);
    setIsModalOpen(false);
  };

  const showSkeletons = !mounted || (isLoading && trades.length === 0);

  return (
    <TooltipProvider>
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {marketFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Market:
              </span>
              <Select
                value={marketFilter.selectedMarket}
                onValueChange={marketFilter.onSelectedMarketChange}
              >
                <SelectTrigger className="flex w-32 h-9 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 shadow-none themed-focus text-slate-900 dark:text-slate-50">
                  <SelectValue placeholder="All Markets" />
                </SelectTrigger>
                <SelectContent className="z-[100] border border-slate-200/70 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
                  <SelectItem value="all">All Markets</SelectItem>
                  {marketFilter.markets.map((market) => (
                    <SelectItem key={market} value={market}>
                      {market}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-end gap-1">
            <span className="text-sm text-slate-500 dark:text-slate-400 mr-2 whitespace-nowrap">
              Cards per row:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setCardViewMode('grid-2')}
                  className={cn(
                    'rounded-md p-2 transition-colors cursor-pointer',
                    cardViewMode === 'grid-2'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                  aria-label="2 cards per row"
                  aria-pressed={cardViewMode === 'grid-2'}
                >
                  <Columns2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[220px] rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 px-3 py-2"
              >
                2 per row
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setCardViewMode('grid-4')}
                  className={cn(
                    'rounded-md p-2 transition-colors cursor-pointer',
                    cardViewMode === 'grid-4'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                  aria-label="4 cards per row"
                  aria-pressed={cardViewMode === 'grid-4'}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[220px] rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 px-3 py-2"
              >
                4 per row
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setCardViewMode('split')}
                  className={cn(
                    'rounded-md p-2 transition-colors cursor-pointer',
                    cardViewMode === 'split'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                  aria-label="Split view"
                  aria-pressed={cardViewMode === 'split'}
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[220px] rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 px-3 py-2"
              >
                Split view
              </TooltipContent>
            </Tooltip>
          </div>
          </div>
        </div>

        {cardViewMode === 'split' ? (
          <div className="flex flex-col md:flex-row rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-transparent shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden md:h-[calc(100vh-100px)] md:min-h-[700px]">
            <div className="flex-shrink-0 md:w-80 overflow-x-auto overflow-y-hidden md:overflow-x-hidden md:overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/20">
              {showSkeletons ? (
                <div className="flex md:flex-col gap-3 p-3 h-full">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={`skeleton-split-${i}`} className="w-64 md:w-auto flex-shrink-0 md:flex-shrink">
                      <Card className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
                        <CardContent className="px-5 py-5">
                          <div className="flex items-center justify-between mb-4">
                            <Skeleton className="h-7 w-24" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </div>
                          <div className="space-y-2.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : displayedTrades.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm p-6 text-center">
                  {emptyMessage}
                </div>
              ) : (
                <div className="flex md:flex-col gap-2 p-3 h-full md:h-auto">
                  {displayedTrades.map((trade) => (
                    <div key={trade.id} className="w-64 md:w-auto flex-shrink-0 md:flex-shrink">
                      <TradeCard
                        trade={trade}
                        onOpenModal={() => {}}
                        hideDetailsLink
                        hideImage
                        isSelected={selectedTrade?.id === trade.id}
                        onSelect={(t) => setSelectedTrade(t)}
                      />
                    </div>
                  ))}
                  {hasMore && (
                    <div ref={observerTarget} className="flex items-center justify-center px-2 md:py-2 flex-shrink-0">
                      {isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-[600px] md:min-h-0 overflow-y-auto overflow-x-auto md:overflow-hidden bg-slate-50/30 dark:bg-slate-900/20">
              {liveSelectedTrade ? (
                <TradeDetailsPanel
                  trade={liveSelectedTrade}
                  onClose={() => setSelectedTrade(null)}
                  onTradeUpdated={onTradeUpdated}
                  inlineMode
                  readOnly={readOnly}
                  strategyName={strategyName}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-2">
                    <Eye className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">Select a trade to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-6',
              cardViewMode === 'grid-2'
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            )}
          >
            {showSkeletons ? (
              <>
                {Array.from({ length: 12 }).map((_, index) => (
                  <Card
                    key={`skeleton-${index}`}
                    className="relative overflow-hidden rounded-xl border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm"
                  >
                    <div className="p-3">
                      <Skeleton className="aspect-video w-full rounded-lg" />
                    </div>
                    <CardContent className="px-5 pb-5 pt-0">
                      <div className="flex items-center justify-between mb-4">
                        <Skeleton className="h-7 w-24" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                      <div className="space-y-2.5 mb-5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-4 w-36" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : displayedTrades.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-500">{emptyMessage}</p>
              </div>
            ) : (
              <>
                {displayedTrades.map((trade) => (
                  <TradeCard key={trade.id} trade={trade} onOpenModal={openModal} />
                ))}

                {hasMore && (
                  <div ref={observerTarget} className="col-span-full flex justify-center py-4">
                    {isFetching ? (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading more trades...</span>
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {selectedTrade && (
        <TradeDetailsModal
          trade={selectedTrade}
          isOpen={isModalOpen}
          onClose={closeModal}
          onTradeUpdated={onTradeUpdated}
          readOnly={readOnly}
          strategyName={strategyName}
        />
      )}
    </TooltipProvider>
  );
}

