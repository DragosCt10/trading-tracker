'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { Trade } from '@/types/trade';
import type { SavedTag } from '@/types/saved-tag';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import NotesModal from '@/components/NotesModal';
import { TradeCard } from '@/components/trades/TradeCard';
import { TradesTableView } from '@/components/trades/TradesTableView';
import { TradeTagsFilter } from '@/components/trades/TradeTagsFilter';
import { Columns2, Eye, LayoutGrid, Loader2, MoveRight, PanelLeft, Tag, Trash2 } from 'lucide-react';

type CardViewMode = 'grid-4' | 'grid-2' | 'split' | 'table';

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
  /** Extra card keys for read-only mode (e.g. public share where no auth session exists). */
  extraCards?: string[];
  /** Strategy's saved tag vocabulary for autocomplete. */
  savedTags?: SavedTag[];
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
  /**
   * Parent-controlled tag filter. When provided, parent owns the selection state
   * and is responsible for rendering the filter UI (e.g. via <TradeTagsFilter/>).
   * When omitted, TradeCardsView manages state + renders its own inline popover.
   */
  tagsFilter?: {
    selectedTags: string[];
    onSelectedTagsChange: (tags: string[]) => void;
  };
  /**
   * When true and view is table, show checkboxes and bulk delete bar.
   * Requires onBulkDelete to be provided.
   */
  enableBulkDeleteInTableView?: boolean;
  /** Called when user confirms bulk delete in table view. Clear selection after resolve. */
  onBulkDelete?: (ids: string[]) => Promise<void>;
  /** Called when user applies tags to selected trades. */
  onBulkTag?: (ids: string[], tagsToAdd: string[]) => Promise<void>;
  /** Strategies to move selected trades to (excludes the current one). */
  moveToStrategies?: { id: string; name: string }[];
  /** Called when user confirms move to strategy. Clear selection after resolve. */
  onBulkMoveToStrategy?: (ids: string[], strategyId: string) => Promise<void>;
  /** Optional left-side control row content (e.g. Sort by) rendered on same row as View toggles. */
  sortControl?: ReactNode;
  /** When set, show "N trade(s)" on the left of the header row (filtered/period count). */
  totalFilteredCount?: number;
  /**
   * When true, pagination is controlled by the parent (e.g. MyTradesClient).
   * TradeCardsView shows all trades passed and does not run the observer or show the sentinel.
   */
  externalPagination?: boolean;
  /** Current card view mode. */
  cardViewMode?: CardViewMode;
  /** Called when user changes the view mode. */
  onCardViewModeChange?: (mode: CardViewMode) => void;
  /** When true, hide header controls (view toggles, cards per row). */
  suppressHeaderControls?: boolean;
};

export function TradeCardsView({
  trades,
  isLoading = false,
  isFetching = false,
  resetKey,
  itemsPerLoad = 12,
  readOnly = false,
  strategyName,
  extraCards,
  savedTags,
  onTradeUpdated,
  emptyMessage = 'No trades found for the selected period.',
  initialViewMode = 'grid-4',
  marketFilter,
  tagsFilter,
  enableBulkDeleteInTableView = false,
  onBulkDelete,
  onBulkTag,
  moveToStrategies,
  onBulkMoveToStrategy,
  sortControl,
  totalFilteredCount,
  externalPagination = false,
  cardViewMode,
  onCardViewModeChange,
  suppressHeaderControls = false,
}: TradeCardsViewProps) {
  const [mounted, setMounted] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(itemsPerLoad);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [internalCardViewMode, setInternalCardViewMode] = useState<CardViewMode>(initialViewMode);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTargetStrategyId, setMoveTargetStrategyId] = useState('');
  const [bulkMoving, setBulkMoving] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [bulkTagging, setBulkTagging] = useState(false);
  const [pendingTagSelection, setPendingTagSelection] = useState<string[]>([]);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesModalContent, setNotesModalContent] = useState('');
  const [internalSelectedTags, setInternalSelectedTags] = useState<string[]>([]);

  const isTagsControlled = tagsFilter !== undefined;
  const selectedTags = isTagsControlled ? tagsFilter!.selectedTags : internalSelectedTags;
  const setSelectedTags = (next: string[]) => {
    if (isTagsControlled) {
      tagsFilter!.onSelectedTagsChange(next);
    } else {
      setInternalSelectedTags(next);
    }
  };

  // Use prop if provided (controlled), otherwise use internal state (uncontrolled)
  const currentViewMode = cardViewMode !== undefined ? cardViewMode : internalCardViewMode;
  const handleViewModeChange = (mode: CardViewMode) => {
    if (onCardViewModeChange) {
      onCardViewModeChange(mode);
    } else {
      setInternalCardViewMode(mode);
    }
  };
  const observerInstanceRef = useRef<IntersectionObserver | null>(null);
  // Latest state read inside the IntersectionObserver callback. Kept in a ref so the observer,
  // which is created in a callback-ref (no deps), always sees fresh values.
  const loadMoreStateRef = useRef({
    hasMore: false,
    isLoading: false,
    isFetching: false,
    itemsPerLoad,
    totalCount: 0,
    externalPagination,
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (externalPagination) return;
    setDisplayedCount(itemsPerLoad);
    setSelectedTrade(null);
    setIsModalOpen(false);
    setSelectedIds(new Set());
    if (!isTagsControlled) setInternalSelectedTags([]);
  }, [resetKey, itemsPerLoad, externalPagination, isTagsControlled]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const trade of trades) {
      const tt = trade.tags;
      if (!tt) continue;
      for (const tag of tt) {
        if (tag && tag.trim().length > 0) set.add(tag);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [trades]);

  const filteredByTags = useMemo(() => {
    if (selectedTags.length === 0) return trades;
    const wanted = new Set(selectedTags);
    return trades.filter((t) => {
      const tt = t.tags;
      if (!tt || tt.length === 0) return false;
      for (const tag of tt) {
        if (wanted.has(tag)) return true;
      }
      return false;
    });
  }, [trades, selectedTags]);

  useEffect(() => {
    if (externalPagination) return;
    setDisplayedCount(itemsPerLoad);
  }, [selectedTags, externalPagination, itemsPerLoad]);

  const displayedTrades = useMemo(
    () => (externalPagination ? filteredByTags : filteredByTags.slice(0, displayedCount)),
    [filteredByTags, displayedCount, externalPagination]
  );
  const hasMore = externalPagination ? false : displayedCount < filteredByTags.length;

  // ── Virtual scrolling for grid views ────────────────────────────────────
  const gridListRef = useRef<HTMLDivElement>(null);
  const [gridColumns, setGridColumns] = useState(4);

  useEffect(() => {
    if (!mounted) return;
    const isGrid = currentViewMode === 'grid-2' || currentViewMode === 'grid-4';
    if (!isGrid) return;

    const update = () => {
      const w = window.innerWidth;
      if (currentViewMode === 'grid-2') {
        setGridColumns(w >= 640 ? 2 : 1);
      } else {
        setGridColumns(w >= 1280 ? 4 : w >= 1024 ? 3 : w >= 640 ? 2 : 1);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [mounted, currentViewMode]);

  const virtualRows = useMemo(() => {
    const rows: Trade[][] = [];
    for (let i = 0; i < displayedTrades.length; i += gridColumns) {
      rows.push(displayedTrades.slice(i, i + gridColumns));
    }
    return rows;
  }, [displayedTrades, gridColumns]);

  const ESTIMATED_ROW_HEIGHT = 380;
  const isGridMode = currentViewMode === 'grid-2' || currentViewMode === 'grid-4';

  const rowVirtualizer = useWindowVirtualizer({
    count: virtualRows.length + (hasMore && isGridMode ? 1 : 0),
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 3,
    scrollMargin: gridListRef.current?.offsetTop ?? 0,
    enabled: isGridMode && displayedTrades.length > 24,
  });

  const selectedTradeId = selectedTrade?.id ?? null;
  const liveSelectedTrade = useMemo(
    () => (selectedTradeId ? trades.find((t) => t.id === selectedTradeId) ?? null : null),
    [selectedTradeId, trades]
  );

  const showTableBulkActions =
    currentViewMode === 'table' && enableBulkDeleteInTableView && typeof onBulkDelete === 'function';
  const tablePageIds = useMemo(
    () => displayedTrades.map((t) => t.id).filter((id): id is string => !!id),
    [displayedTrades]
  );
  const allOnPageSelected =
    showTableBulkActions && tablePageIds.length > 0 && tablePageIds.every((id) => selectedIds.has(id));
  const toggleSelectAll = useCallback(() => {
    if (!showTableBulkActions) return;
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        tablePageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        tablePageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [showTableBulkActions, allOnPageSelected, tablePageIds]);
  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!onBulkDelete || selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    } finally {
      setBulkDeleting(false);
    }
  }, [onBulkDelete, selectedIds]);

  const handleBulkMoveConfirm = useCallback(async () => {
    if (!onBulkMoveToStrategy || selectedIds.size === 0 || !moveTargetStrategyId) return;
    setBulkMoving(true);
    try {
      await onBulkMoveToStrategy(Array.from(selectedIds), moveTargetStrategyId);
      setSelectedIds(new Set());
      setShowMoveDialog(false);
      setMoveTargetStrategyId('');
    } finally {
      setBulkMoving(false);
    }
  }, [onBulkMoveToStrategy, selectedIds, moveTargetStrategyId]);

  useEffect(() => {
    if (currentViewMode === 'split' && displayedTrades.length > 0 && !selectedTrade) {
      setSelectedTrade(displayedTrades[0]);
    }
  }, [currentViewMode, displayedTrades, selectedTrade]);

  // Keep latest values readable from inside the observer callback without re-creating the observer.
  useEffect(() => {
    loadMoreStateRef.current = {
      hasMore,
      isLoading,
      isFetching,
      itemsPerLoad,
      totalCount: filteredByTags.length,
      externalPagination,
    };
  }, [hasMore, isLoading, isFetching, itemsPerLoad, filteredByTags.length, externalPagination]);

  // Callback ref: (re)attaches the IntersectionObserver whenever the loader sentinel mounts
  // or unmounts. Previously a stable ref + useEffect captured the DOM node once and missed
  // the non-virtualized -> virtualized grid transition, silently killing pagination past ~36 items.
  const observerTarget = useCallback((node: HTMLDivElement | null) => {
    if (observerInstanceRef.current) {
      observerInstanceRef.current.disconnect();
      observerInstanceRef.current = null;
    }
    if (!node) return;
    if (typeof window === 'undefined') return;
    if (loadMoreStateRef.current.externalPagination) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        const { hasMore: curHasMore, isLoading: curLoading, isFetching: curFetching, itemsPerLoad: step, totalCount } =
          loadMoreStateRef.current;
        if (!curHasMore || curLoading || curFetching) return;
        setDisplayedCount((prev) => Math.min(prev + step, totalCount));
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    observerInstanceRef.current = observer;
  }, []);

  // Tear down the observer on unmount.
  useEffect(() => () => {
    if (observerInstanceRef.current) {
      observerInstanceRef.current.disconnect();
      observerInstanceRef.current = null;
    }
  }, []);

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
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
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
          </div>

          {!suppressHeaderControls && (
          <div className="flex items-center justify-end gap-3">
            {!isTagsControlled && (
              <TradeTagsFilter
                availableTags={availableTags}
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                savedTags={savedTags}
              />
            )}
            {sortControl && trades.length > 0 && (
              <div className="flex items-center gap-2">
                {sortControl}
              </div>
            )}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">
              View:
            </span>
            <div className="inline-flex h-8 items-center rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('grid-2')}
                  className={cn(
                    'rounded-lg h-6.5 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                    currentViewMode === 'grid-2'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                  aria-label="2 cards per row"
                  aria-pressed={currentViewMode === 'grid-2'}
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
                  onClick={() => handleViewModeChange('grid-4')}
                  className={cn(
                    'rounded-lg h-6.5 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                    currentViewMode === 'grid-4'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                  aria-label="4 cards per row"
                  aria-pressed={currentViewMode === 'grid-4'}
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
                  onClick={() => handleViewModeChange('split')}
                  className={cn(
                    'rounded-lg h-6.5 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                    currentViewMode === 'split'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                  aria-label="Split view"
                  aria-pressed={currentViewMode === 'split'}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('table')}
                  className={cn(
                    'rounded-lg h-6.5 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                    currentViewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                  aria-label="Table view"
                  aria-pressed={currentViewMode === 'table'}
                >
                  Table
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[220px] rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 px-3 py-2"
              >
                Compact table view
              </TooltipContent>
            </Tooltip>
          </div>
          </div>
          )}
        </div>

        {currentViewMode === 'split' ? (
          <div className="flex flex-col md:flex-row rounded-xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-transparent shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden md:h-[calc(100vh-100px)] md:min-h-[700px]">
            <div className="flex-shrink-0 md:w-80 overflow-x-auto overflow-y-hidden md:overflow-x-hidden md:overflow-y-auto border-b md:border-b-0 md:border-r border-slate-300/40 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/20">
              {showSkeletons ? (
                <div className="flex md:flex-col gap-3 p-3 h-full">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={`skeleton-split-${i}`} className="w-64 md:w-auto flex-shrink-0 md:flex-shrink">
                      <Card className="relative overflow-hidden rounded-xl border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
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
                        savedTags={savedTags}
                      />
                    </div>
                  ))}
                  {!externalPagination && hasMore && (
                    <div
                      ref={observerTarget}
                      className="flex justify-center py-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-shrink-0"
                    >
                      {isFetching ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          <span>Loading more trades...</span>
                        </div>
                      ) : (
                        <span>Loading more trades...</span>
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
                  extraCards={extraCards}
                  savedTags={savedTags}
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
        ) : currentViewMode === 'table' ? (
          <>
            {showTableBulkActions && selectedIds.size > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-4 rounded-xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm px-4 py-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedIds.size} trade{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  className="cursor-pointer rounded-xl px-4 py-2 text-sm transition-all duration-200 border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80"
                >
                  Clear selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  disabled={bulkDeleting || bulkMoving}
                  className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60 gap-2"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    {bulkDeleting ? 'Deleting…' : `Delete selected (${selectedIds.size})`}
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                </Button>
                {onBulkMoveToStrategy && moveToStrategies && moveToStrategies.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMoveDialog(true)}
                    disabled={bulkDeleting || bulkMoving}
                    className="cursor-pointer rounded-xl px-4 py-2 text-sm transition-all duration-200 border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 disabled:opacity-60 flex items-center gap-2"
                  >
                    <MoveRight className="h-4 w-4" />
                    {bulkMoving ? 'Moving…' : selectedIds.size === 1 ? 'Move trade' : 'Move trades'}
                  </Button>
                )}
                {onBulkTag && savedTags && savedTags.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPendingTagSelection([]); setShowTagDialog(true); }}
                    disabled={bulkDeleting || bulkMoving || bulkTagging}
                    className="cursor-pointer rounded-xl px-4 py-2 text-sm transition-all duration-200 border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 disabled:opacity-60 flex items-center gap-2"
                  >
                    <Tag className="h-4 w-4" />
                    {bulkTagging ? 'Applying…' : 'Add tags'}
                  </Button>
                )}
              </div>
            )}
            <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
              <TradesTableView
                trades={displayedTrades}
                isLoading={showSkeletons}
                emptyMessage={emptyMessage}
                showCheckboxes={showTableBulkActions}
                selectedIds={selectedIds}
                allOnPageSelected={allOnPageSelected}
                onToggleSelectAll={toggleSelectAll}
                onToggleSelectOne={toggleSelectOne}
                onOpenDetails={(trade) => {
                  setSelectedTrade(trade);
                  setIsModalOpen(true);
                }}
                onOpenNotes={(notes) => {
                  setNotesModalContent(notes);
                  setNotesModalOpen(true);
                }}
              />
              {!externalPagination && hasMore && !showSkeletons && displayedTrades.length > 0 && (
                <div
                  ref={observerTarget}
                  className="flex justify-center py-6 text-sm text-slate-500 dark:text-slate-400"
                >
                  {isFetching ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading more trades...</span>
                    </div>
                  ) : (
                    <span>Loading more trades...</span>
                  )}
                </div>
              )}
            </Card>
            {showTableBulkActions && (
              <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-white via-purple-100/80 to-violet-100/70 dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      <span className="text-slate-600 dark:text-slate-400">
                        Are you sure you want to delete {selectedIds.size} trade{selectedIds.size !== 1 ? 's' : ''}?
                        This action cannot be undone.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex gap-3">
                    <AlertDialogCancel asChild>
                      <Button
                        variant="outline"
                        onClick={() => setShowBulkDeleteConfirm(false)}
                        className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                        disabled={bulkDeleting}
                      >
                        Cancel
                      </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        variant="destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          handleBulkDeleteConfirm();
                        }}
                        disabled={bulkDeleting}
                        className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60"
                      >
                        {bulkDeleting ? 'Deleting...' : 'Yes, Delete'}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {showTableBulkActions && onBulkMoveToStrategy && (
              <AlertDialog open={showMoveDialog} onOpenChange={(open) => { setShowMoveDialog(open); if (!open) setMoveTargetStrategyId(''); }}>
                <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 overflow-hidden">
                  {/* Gradient orbs */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                    <div className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl" />
                    <div className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl" />
                  </div>

                  {/* Top accent line */}
                  <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

                  {/* Header */}
                  <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
                    <AlertDialogHeader className="space-y-1.5">
                      <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                        <div className="p-2 rounded-lg themed-header-icon-box">
                          <MoveRight className="h-5 w-5" />
                        </div>
                        <span>Move trades to strategy</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                        Select the destination strategy for {selectedIds.size} selected trade{selectedIds.size !== 1 ? 's' : ''}. The trades will be moved within the same account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                  </div>

                  {/* Content */}
                  <div className="relative px-6 py-5">
                    <Select value={moveTargetStrategyId} onValueChange={setMoveTargetStrategyId}>
                      <SelectTrigger className="h-12 w-full rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300">
                        <SelectValue placeholder="Select a strategy…" />
                      </SelectTrigger>
                      <SelectContent className="z-[200] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg text-slate-900 dark:text-slate-50">
                        {moveToStrategies?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Footer */}
                  <AlertDialogFooter className="relative flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-5 border-t border-slate-200/50 dark:border-slate-700/50">
                    <AlertDialogCancel asChild>
                      <Button
                        variant="outline"
                        onClick={() => { setShowMoveDialog(false); setMoveTargetStrategyId(''); }}
                        disabled={bulkMoving}
                        className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
                      >
                        Cancel
                      </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        onClick={(e) => { e.preventDefault(); handleBulkMoveConfirm(); }}
                        disabled={bulkMoving || !moveTargetStrategyId}
                        className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 text-sm"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {bulkMoving && <Loader2 className="h-4 w-4 animate-spin" />}
                          {bulkMoving ? 'Moving…' : 'Move trades'}
                        </span>
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {showTableBulkActions && onBulkTag && savedTags && savedTags.length > 0 && (
              <AlertDialog open={showTagDialog} onOpenChange={(open) => { setShowTagDialog(open); if (!open) setPendingTagSelection([]); }}>
                <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 overflow-hidden">
                  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                    <div className="orb-bg-1 absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full blur-3xl" />
                    <div className="orb-bg-2 absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full blur-3xl" />
                  </div>
                  <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />
                  <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
                    <AlertDialogHeader className="space-y-1.5">
                      <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                        <div className="p-2 rounded-lg themed-header-icon-box">
                          <Tag className="h-5 w-5" />
                        </div>
                        <span>Add tags to trades</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                        Select tags to add to {selectedIds.size} selected trade{selectedIds.size !== 1 ? 's' : ''}. Existing tags are preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                  </div>
                  <div className="relative px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      {savedTags.sort((a, b) => a.name.localeCompare(b.name)).map((savedTag) => {
                        const isSelected = pendingTagSelection.includes(savedTag.name);
                        const label = savedTag.name.length > 20 ? savedTag.name.slice(0, 19) + '…' : savedTag.name;
                        return (
                          <button
                            key={savedTag.name}
                            type="button"
                            title={savedTag.name}
                            onClick={() => setPendingTagSelection((prev) =>
                              isSelected ? prev.filter((t) => t !== savedTag.name) : [...prev, savedTag.name]
                            )}
                            className={cn(
                              'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer',
                              isSelected
                                ? 'themed-header-icon-box shadow-sm border-primary/30'
                                : 'border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70'
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <AlertDialogFooter className="relative flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-5 border-t border-slate-200/50 dark:border-slate-700/50">
                    <AlertDialogCancel asChild>
                      <Button
                        variant="outline"
                        onClick={() => { setShowTagDialog(false); setPendingTagSelection([]); }}
                        disabled={bulkTagging}
                        className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
                      >
                        Cancel
                      </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!onBulkTag || pendingTagSelection.length === 0) return;
                          setBulkTagging(true);
                          try {
                            await onBulkTag(Array.from(selectedIds), pendingTagSelection);
                          } finally {
                            setBulkTagging(false);
                          }
                          setShowTagDialog(false);
                          setPendingTagSelection([]);
                        }}
                        disabled={bulkTagging || pendingTagSelection.length === 0}
                        className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 text-sm"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {bulkTagging && <Loader2 className="h-4 w-4 animate-spin" />}
                          {bulkTagging ? 'Applying…' : `Apply tag${pendingTagSelection.length !== 1 ? 's' : ''}`}
                        </span>
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        ) : (
          <div ref={gridListRef}>
            {showSkeletons ? (
              <div
                className={cn(
                  'grid gap-6',
                  currentViewMode === 'grid-2'
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                )}
              >
                {Array.from({ length: 12 }).map((_, index) => (
                  <Card
                    key={`skeleton-${index}`}
                    className="relative overflow-hidden rounded-xl border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm"
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
              </div>
            ) : displayedTrades.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">{emptyMessage}</p>
              </div>
            ) : rowVirtualizer.options.enabled ? (
              /* Virtualized grid: only renders visible rows */
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const isLoaderRow = virtualRow.index >= virtualRows.length;
                  if (isLoaderRow) {
                    return (
                      <div
                        key="virtual-loader"
                        ref={observerTarget}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                        }}
                        className="flex justify-center items-center py-4"
                      >
                        {isFetching ? (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading more trades...</span>
                          </div>
                        ) : (
                          <div className="h-4" />
                        )}
                      </div>
                    );
                  }
                  const row = virtualRows[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                      }}
                    >
                      <div
                        className={cn(
                          'grid gap-6 pb-6',
                          currentViewMode === 'grid-2'
                            ? 'grid-cols-1 sm:grid-cols-2'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                        )}
                      >
                        {row.map((trade) => (
                          <TradeCard key={trade.id} trade={trade} onOpenModal={openModal} savedTags={savedTags} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Non-virtualized grid: fewer than 24 items, render directly */
              <div
                className={cn(
                  'grid gap-6',
                  currentViewMode === 'grid-2'
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                )}
              >
                {displayedTrades.map((trade) => (
                  <TradeCard key={trade.id} trade={trade} onOpenModal={openModal} savedTags={savedTags} />
                ))}

                {!externalPagination && hasMore && (
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
              </div>
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
          extraCards={extraCards}
          savedTags={savedTags}
        />
      )}
      <NotesModal
        isOpen={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        notes={notesModalContent}
      />
    </TooltipProvider>
  );
}

